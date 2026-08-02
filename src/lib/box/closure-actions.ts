"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { notifyClassCancelled } from "@/lib/notifications/send";
import { DEFAULT_CLOSURE_MESSAGE } from "./closure-constants";

export interface BoxClosureSummary {
  boxName: string;
  boxSlug: string;
  /** active/trial memberships, excluding the owner — the "N membros" of the wizard */
  activeMemberCount: number;
  pendingPaymentsCount: number;
  upcomingClassesWithBookingsCount: number;
}

async function requireOwner(boxId: string): Promise<{ userId: string }> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");

  // memberships_select_own has no status filter, so this works even if the
  // membership was already deactivated by a previous closure attempt.
  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", boxId)
    .eq("role", "owner")
    .maybeSingle();

  if (!membership) throw new Error("Só o owner pode encerrar esta box.");
  return { userId: user.id };
}

export async function getBoxClosureSummary(boxId: string): Promise<BoxClosureSummary> {
  const { userId } = await requireOwner(boxId);

  const [{ data: box }, { count: memberCount }, { count: pendingPayments }, { data: futureClasses }] =
    await Promise.all([
      supabaseAdmin.from("boxes").select("name, slug").eq("id", boxId).single(),
      supabaseAdmin
        .from("memberships")
        .select("id", { count: "exact", head: true })
        .eq("box_id", boxId)
        .in("status", ["active", "trial"])
        .neq("user_id", userId),
      supabaseAdmin
        .from("payments")
        .select("id", { count: "exact", head: true })
        .eq("box_id", boxId)
        .eq("status", "pending"),
      supabaseAdmin
        .from("classes")
        .select("id")
        .eq("box_id", boxId)
        .eq("status", "scheduled")
        .gte("starts_at", new Date().toISOString()),
    ]);

  if (!box) throw new Error("Box não encontrada.");

  let upcomingClassesWithBookingsCount = 0;
  const futureClassIds = (futureClasses ?? []).map((c) => c.id);
  if (futureClassIds.length > 0) {
    const { data: bookedRows } = await supabaseAdmin
      .from("bookings")
      .select("class_id")
      .in("class_id", futureClassIds)
      .eq("status", "confirmed");
    upcomingClassesWithBookingsCount = new Set((bookedRows ?? []).map((b) => b.class_id)).size;
  }

  return {
    boxName: box.name,
    boxSlug: box.slug,
    activeMemberCount: memberCount ?? 0,
    pendingPaymentsCount: pendingPayments ?? 0,
    upcomingClassesWithBookingsCount,
  };
}

const closeBoxSchema = z.object({
  boxId: z.string().uuid(),
  message: z.string().trim().max(500).optional().default(""),
  confirmName: z.string().min(1),
});

export async function closeBox(input: {
  boxId: string;
  message: string;
  confirmName: string;
}): Promise<{ error?: string }> {
  const parsed = closeBoxSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { boxId, message, confirmName } = parsed.data;

  let userId: string;
  try {
    ({ userId } = await requireOwner(boxId));
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { data: box } = await supabaseAdmin
    .from("boxes")
    .select("id, name, slug, deleted_at")
    .eq("id", boxId)
    .single();
  if (!box) return { error: "Box não encontrada." };
  if (box.deleted_at) return { error: "Esta box já está encerrada." };
  if (confirmName.trim() !== box.name) {
    return { error: "O nome escrito não corresponde ao nome da box." };
  }

  const closureMessage = message.trim().slice(0, 500);
  const bodyText = closureMessage || DEFAULT_CLOSURE_MESSAGE;
  const nowIso = new Date().toISOString();

  try {
    // Snapshot everyone who ever had a membership here — the box_closed
    // notification and the recovery restore both need this "before" list.
    const { data: allMemberships } = await supabaseAdmin
      .from("memberships")
      .select("id, user_id, status, box_id")
      .eq("box_id", boxId);

    // Integrity guard: every row this loop is about to touch must actually
    // belong to boxId. Fails loudly instead of silently writing to the
    // wrong box if this list was ever built from a bad query.
    const foreignRow = (allMemberships ?? []).find((m) => m.box_id !== boxId);
    if (foreignRow) {
      throw new Error(
        `Integridade comprometida: membership ${foreignRow.id} pertence à box ${foreignRow.box_id}, não a ${boxId}. Encerramento abortado.`
      );
    }

    // 1. Wind down memberships — desassociar todos, preservando o estado anterior
    if (allMemberships?.length) {
      await Promise.all(
        allMemberships
          .filter((m) => m.status !== "inactive")
          .map((m) =>
            supabaseAdmin
              .from("memberships")
              .update({
                status: "inactive",
                status_before: m.status,
                status_before_source: "box_closure",
              })
              .eq("id", m.id)
              .eq("box_id", boxId)
          )
      );
    }

    // 2. Cancel future scheduled classes — reuses the existing class_cancelled notification
    const { data: futureClasses } = await supabaseAdmin
      .from("classes")
      .select("id, name, starts_at")
      .eq("box_id", boxId)
      .eq("status", "scheduled")
      .gte("starts_at", nowIso);

    if (futureClasses?.length) {
      const classIds = futureClasses.map((c) => c.id);
      const { data: bookings } = await supabaseAdmin
        .from("bookings")
        .select("user_id, class_id")
        .in("class_id", classIds)
        .eq("status", "confirmed");

      await supabaseAdmin
        .from("classes")
        .update({ status: "cancelled", cancellation_reason: "Box encerrada" })
        .in("id", classIds);

      if (bookings?.length) {
        const userIds = [...new Set(bookings.map((b) => b.user_id))];
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("id, email")
          .in("id", userIds);
        const emailMap = new Map((profiles ?? []).map((p) => [p.id, p.email as string]));
        const classMap = new Map(futureClasses.map((c) => [c.id, c]));

        await Promise.allSettled(
          bookings.map((b) => {
            const email = emailMap.get(b.user_id);
            const cls = classMap.get(b.class_id);
            if (!email || !cls) return Promise.resolve();
            return notifyClassCancelled({
              userId: b.user_id,
              email,
              boxId,
              boxName: box.name,
              className: cls.name,
              startsAt: cls.starts_at,
              reason: "Box encerrada",
            });
          })
        );
      }
    }

    // 3. Cancel pending invites and scheduled trials
    await supabaseAdmin
      .from("invites")
      .update({ status: "expired" })
      .eq("box_id", boxId)
      .eq("status", "pending");
    await supabaseAdmin
      .from("trials")
      .update({ status: "lost" })
      .eq("box_id", boxId)
      .eq("status", "scheduled");

    // 4. box_closed notification — single bulk insert, in-app only, everyone who
    // ever had a membership here (not just currently active ones).
    if (allMemberships?.length) {
      const recipientIds = [...new Set(allMemberships.map((m) => m.user_id))];
      const rows = recipientIds.map((uid) => ({
        user_id: uid,
        box_id: boxId,
        type: "box_closed" as const,
        title: `Box encerrada — ${box.name}`,
        body: bodyText,
        data: { box_name: box.name, closure_message: bodyText },
      }));
      await supabaseAdmin.from("notifications").insert(rows);
    }

    // 5. Tombstone the box last — this is the point of no return for the
    // wizard (everything above already happened, matching "nada executa
    // antes do clique final" but keeping deleted_at as the last write).
    const { error } = await supabaseAdmin
      .from("boxes")
      .update({
        deleted_at: nowIso,
        closed_by: userId,
        closure_message: closureMessage || null,
      })
      .eq("id", boxId);

    if (error) return { error: error.message };
  } catch (e) {
    return { error: (e as Error).message };
  }

  revalidatePath(`/box/${box.slug}/settings`);
  revalidatePath(`/box/${box.slug}`);
  revalidatePath("/athlete");
  return {};
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function reopenBox(boxId: string): Promise<{ error?: string }> {
  try {
    await requireOwner(boxId);
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { data: box } = await supabaseAdmin
    .from("boxes")
    .select("id, slug, deleted_at")
    .eq("id", boxId)
    .single();
  if (!box) return { error: "Box não encontrada." };
  if (!box.deleted_at) return { error: "Esta box não está encerrada." };

  if (Date.now() - new Date(box.deleted_at).getTime() > THIRTY_DAYS_MS) {
    return {
      error: "O prazo de 30 dias para reabertura automática já passou. Contacta o suporte.",
    };
  }

  // Restore memberships this closure deactivated, unless something else
  // already changed them since (in that case the later decision wins).
  const { data: memberships } = await supabaseAdmin
    .from("memberships")
    .select("id, status, status_before")
    .eq("box_id", boxId)
    .eq("status_before_source", "box_closure");

  if (memberships?.length) {
    await Promise.all(
      memberships
        .filter((m) => m.status === "inactive")
        .map((m) =>
          supabaseAdmin
            .from("memberships")
            .update({
              status: m.status_before ?? "active",
              status_before: null,
              status_before_source: null,
            })
            .eq("id", m.id)
            .eq("box_id", boxId)
        )
    );
  }

  const { error } = await supabaseAdmin
    .from("boxes")
    .update({ deleted_at: null, closed_by: null, closure_message: null })
    .eq("id", boxId);

  if (error) return { error: error.message };

  revalidatePath(`/box/${box.slug}/settings`);
  revalidatePath(`/box/${box.slug}`);
  revalidatePath("/athlete");
  return {};
}
