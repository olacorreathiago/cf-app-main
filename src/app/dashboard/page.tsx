import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Dashboard" };

// The old role "chooser" (athlete vs box management) is extinct. Every
// authenticated profile now lands on the unified /athlete shell; professionals
// see their managed boxes under "Minhas Boxes" and switch into box management
// from the sidebar. Users without a profile still go through onboarding.
export default async function DashboardPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding/role");

  redirect("/athlete");
}
