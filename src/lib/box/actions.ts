"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function createBox(data: {
  name: string;
  slug: string;
  city: string;
  phone?: string;
}): Promise<void> {
  const supabase = await supabaseServer();

  // Verify session and that the user is an approved professional
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login");

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
    throw new Error("Unauthorized");
  }

  // Use admin client for both inserts — RLS bootstrap issue:
  // boxes policy requires an approved professional (verified above),
  // memberships policy requires has_box_role() which fails before the first row exists.
  const { data: box, error: boxError } = await supabaseAdmin
    .from("boxes")
    .insert({
      name: data.name.trim(),
      slug: data.slug.trim(),
      city: data.city.trim(),
      phone: data.phone?.trim() || null,
    })
    .select("id")
    .single();

  if (boxError) throw new Error(boxError.message);

  const { error: memberError } = await supabaseAdmin
    .from("memberships")
    .insert({
      user_id: user.id,
      box_id: box.id,
      role: "owner",
      status: "active",
    });

  if (memberError) throw new Error(memberError.message);

  redirect("/athlete");
}

export async function checkSlugAvailable(slug: string): Promise<boolean> {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("boxes")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data === null;
}
