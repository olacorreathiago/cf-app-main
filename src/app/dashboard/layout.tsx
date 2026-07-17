import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// The dashboard route group is now just a full-screen host for /create-box
// (the old role chooser is extinct). It provides the dark Zekko backdrop the
// split-shell sits on; the app-wide grain filter comes from the root layout.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding/role");

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-[#131313] text-white antialiased">
      {children}
    </div>
  );
}
