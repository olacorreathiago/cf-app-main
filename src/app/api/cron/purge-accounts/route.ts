// Step 3 of the deletion flow (see docs/DELETION_FLOW.md): 30 days after the
// athlete requested deletion, anonymize the profile and drop the auth.users row.
//
// Invoked by the Vercel cron in vercel.json. Vercel signs cron requests with
// CRON_SECRET as a bearer token; without that env var set the route refuses to
// run at all, so a missing secret fails closed rather than exposing the purge.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { purgeAccount } from "@/lib/account/purge";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GRACE_DAYS = 30;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado." }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - GRACE_DAYS * 86_400_000).toISOString();

  const { data: due, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff)
    // Already-purged rows keep deleted_at but no longer have an auth user;
    // the sentinel email is what marks them as done.
    .not("email", "like", "deleted-%@zekko.invalid")
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const purged: string[] = [];
  const failed: { id: string; error: string }[] = [];

  // Serial on purpose: each purge does several writes plus a storage delete,
  // and the batch is capped at 50, so there's no need to hammer the API.
  for (const profile of due ?? []) {
    try {
      await purgeAccount(profile.id);
      purged.push(profile.id);
    } catch (e) {
      failed.push({ id: profile.id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  if (failed.length > 0) {
    console.error("[purge-accounts] falhas:", failed);
  }

  return NextResponse.json({ due: due?.length ?? 0, purged: purged.length, failed: failed.length });
}
