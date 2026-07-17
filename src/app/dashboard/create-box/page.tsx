import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CreateBoxScreen } from "./create-box-screen";

export const metadata: Metadata = { title: "Criar Box" };

export default async function CreateBoxPage() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_type, approval_status")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    profile.profile_type !== "professional" ||
    profile.approval_status !== "approved"
  ) {
    redirect("/athlete");
  }

  return (
    <Suspense>
      <CreateBoxScreen />
    </Suspense>
  );
}
