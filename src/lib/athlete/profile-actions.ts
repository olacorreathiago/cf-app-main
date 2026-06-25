"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { updateProfileSchema } from "@/schemas/profile";
import { revalidatePath } from "next/cache";

export interface AthleteFullProfile {
  id: string;
  email: string;
  full_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  phone: string | null;
  birth_date: string | null;
  height_cm: number | null;
  nationality: string | null;
  tax_id: string | null;
  emergency_contact: string | null;
  gender: "male" | "female" | "other" | null;
  profile_type: string;
  created_at: string;
}

export async function getAthleteProfile(): Promise<AthleteFullProfile> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, nickname, avatar_url, phone, birth_date, height_cm, nationality, tax_id, emergency_contact, gender, profile_type, created_at"
    )
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding/role");

  return { ...profile, email: user.email ?? "" };
}

export async function updateAthleteProfile(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faz login novamente." };

  const genderRaw = formData.get("gender") as string;
  const raw = {
    full_name: formData.get("full_name") as string,
    nickname: formData.get("nickname") as string,
    phone: formData.get("phone") as string,
    birth_date: formData.get("birth_date") as string,
    height_cm: formData.get("height_cm") ? Number(formData.get("height_cm")) : null,
    nationality: formData.get("nationality") as string,
    tax_id: formData.get("tax_id") as string,
    emergency_contact: formData.get("emergency_contact") as string,
    gender: (["male", "female", "other"].includes(genderRaw) ? genderRaw : null) as "male" | "female" | "other" | null,
  };

  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first.message };
  }

  const update: Record<string, unknown> = {
    full_name: parsed.data.full_name,
    nickname: parsed.data.nickname || null,
    phone: parsed.data.phone || null,
    birth_date: parsed.data.birth_date || null,
    height_cm: parsed.data.height_cm ?? null,
    nationality: parsed.data.nationality || null,
    tax_id: parsed.data.tax_id || null,
    emergency_contact: parsed.data.emergency_contact || null,
    gender: parsed.data.gender ?? null,
  };

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) return { error: "Erro ao guardar. Tenta novamente." };

  revalidatePath("/athlete/profile");
  revalidatePath("/athlete");
  return { success: true };
}

export async function updateAvatarUrl(url: string): Promise<{ error?: string }> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", user.id);

  if (error) return { error: "Erro ao guardar avatar." };

  revalidatePath("/athlete/profile");
  revalidatePath("/athlete");
  return {};
}
