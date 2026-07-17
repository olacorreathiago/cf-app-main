"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

async function assertStaff(boxId: string) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", boxId)
    .in("role", ["owner", "partner", "manager", "coach"])
    .maybeSingle();

  if (!data) redirect("/athlete");
  return user;
}

export interface AthleteBooking {
  id: string;
  status: string;
  attended: boolean | null;
  checked_in_at: string | null;
  created_at: string;
  class_id: string;
  class_name: string;
  class_starts_at: string;
  modality: string | null;
}

export interface AthletePresencasData {
  bookings: AthleteBooking[];
  totalConfirmed: number;
  totalAttended: number;
  thisMonthAttended: number;
  lastMonthAttended: number;
}

export async function getAthletePresencas(
  athleteUserId: string,
  boxId: string
): Promise<AthletePresencasData> {
  await assertStaff(boxId);

  const { data: raw } = await supabaseAdmin
    .from("bookings")
    .select("id, status, attended, checked_in_at, created_at, class_id, classes(name, starts_at)")
    .eq("user_id", athleteUserId)
    .in("status", ["confirmed", "waitlist", "cancelled"])
    .order("created_at", { ascending: false })
    .limit(200);

  const bookings: AthleteBooking[] = (raw ?? [])
    .filter((b) => b.classes)
    .map((b) => {
      const cls = b.classes as unknown as { name: string; starts_at: string };
      return {
        id: b.id,
        status: b.status,
        attended: b.attended,
        checked_in_at: b.checked_in_at,
        created_at: b.created_at,
        class_id: b.class_id,
        class_name: cls.name,
        class_starts_at: cls.starts_at,
        modality: null,
      };
    });

  const now = new Date();

  // Presença confirmada = check-in dado (checked_in_at não nulo) ou attended=true.
  // Sem check-in = falta, independentemente de attended ser null.
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const past = confirmed.filter((b) => new Date(b.class_starts_at) <= now);
  const attended = past.filter((b) => b.attended === true || b.checked_in_at !== null);

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonthAttended = attended.filter(
    (b) => new Date(b.class_starts_at) >= thisMonthStart
  ).length;

  const lastMonthAttended = attended.filter(
    (b) => new Date(b.class_starts_at) >= lastMonthStart && new Date(b.class_starts_at) < thisMonthStart
  ).length;

  return {
    bookings: confirmed.slice(0, 50),
    totalConfirmed: confirmed.length,
    totalAttended: attended.length,
    thisMonthAttended,
    lastMonthAttended,
  };
}

export interface AthletePr {
  id: string;
  movement: string;
  value: number;
  unit: string;
  achieved_at: string;
  rx: boolean;
}

export async function getAthletePrs(athleteUserId: string, boxId: string): Promise<AthletePr[]> {
  await assertStaff(boxId);

  const { data } = await supabaseAdmin
    .from("prs")
    .select("id, movement, value, unit, achieved_at, rx")
    .eq("user_id", athleteUserId)
    .eq("box_id", boxId)
    .order("achieved_at", { ascending: false });

  return (data ?? []) as AthletePr[];
}

export interface AthleteDropIn {
  id: string;
  date: string;
  status: string;
  amount_paid: number | null;
  checked_in: boolean;
  class_id: string | null;
  class_name: string | null;
  class_starts_at: string | null;
}

export interface AthleteTrial {
  id: string;
  name: string;
  scheduled_for: string | null;
  status: string;
  converted_at: string | null;
  class_id: string | null;
  class_name: string | null;
}

export interface AthleteAtividadeData {
  dropIns: AthleteDropIn[];
  trial: AthleteTrial | null;
}

export async function getAthleteAtividade(
  athleteUserId: string,
  athleteEmail: string,
  boxId: string
): Promise<AthleteAtividadeData> {
  await assertStaff(boxId);

  const [{ data: dropInsRaw }, { data: trialsRaw }] = await Promise.all([
    supabaseAdmin
      .from("drop_ins")
      .select("id, date, status, amount_paid, checked_in, class_id, classes(name, starts_at)")
      .eq("user_id", athleteUserId)
      .eq("box_id", boxId)
      .order("date", { ascending: false }),

    supabaseAdmin
      .from("trials")
      .select("id, name, scheduled_for, status, converted_at, class_id, classes(name)")
      .eq("box_id", boxId)
      .eq("email", athleteEmail)
      .order("created_at", { ascending: true })
      .limit(1),
  ]);

  const dropIns: AthleteDropIn[] = (dropInsRaw ?? []).map((d) => {
    const cls = d.classes as unknown as { name: string; starts_at: string } | null;
    return {
      id: d.id,
      date: d.date,
      status: d.status,
      amount_paid: d.amount_paid,
      checked_in: d.checked_in,
      class_id: d.class_id,
      class_name: cls?.name ?? null,
      class_starts_at: cls?.starts_at ?? null,
    };
  });

  const trialRaw = trialsRaw?.[0];
  let trial: AthleteTrial | null = null;
  if (trialRaw) {
    const cls = trialRaw.classes as unknown as { name: string } | null;
    trial = {
      id: trialRaw.id,
      name: trialRaw.name,
      scheduled_for: trialRaw.scheduled_for,
      status: trialRaw.status,
      converted_at: trialRaw.converted_at,
      class_id: trialRaw.class_id,
      class_name: cls?.name ?? null,
    };
  }

  return { dropIns, trial };
}
