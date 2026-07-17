import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AthleteProfileTabs } from "./athlete-profile-tabs";
import { getAthletePresencas, getAthletePrs, getAthleteAtividade } from "@/lib/box/athlete-profile-actions";
import { getPlans } from "@/lib/box/plan-actions";

export const metadata: Metadata = { title: "Perfil do Atleta" };

interface Props {
  params: Promise<{ slug: string; athleteId: string }>;
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  partner: "Sócio",
  manager: "Gestor",
  coach: "Coach",
  athlete: "Atleta",
};

export default async function AthleteProfilePage({ params }: Props) {
  const { slug, athleteId } = await params;
  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: box } = await supabase
    .from("boxes")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!box) redirect("/athlete");

  // Viewer must be staff
  const { data: viewerMembership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", box.id)
    .maybeSingle();

  const viewerRole = viewerMembership?.role ?? "athlete";
  const isStaff = ["owner", "partner", "manager", "coach"].includes(viewerRole);
  if (!isStaff) redirect(`/box/${slug}`);

  // Load athlete membership in this box
  const { data: membership } = await supabaseAdmin
    .from("memberships")
    .select("id, role, status, notes, plan_id, created_at, profiles(id, full_name, email, avatar_url, phone)")
    .eq("id", athleteId)
    .eq("box_id", box.id)
    .maybeSingle();

  if (!membership) redirect(`/box/${slug}/members`);

  const profile = membership.profiles as unknown as {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    phone: string | null;
  };

  const [presencasData, prs, atividadeData, plans] = await Promise.all([
    getAthletePresencas(profile.id, box.id),
    getAthletePrs(profile.id, box.id),
    getAthleteAtividade(profile.id, profile.email, box.id),
    getPlans(box.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-8">
      <AthleteProfileTabs
        slug={slug}
        boxId={box.id}
        boxName={box.name}
        viewerRole={viewerRole}
        membership={{
          id: membership.id,
          role: membership.role,
          status: membership.status,
          notes: membership.notes as string | null,
          plan_id: (membership as unknown as { plan_id: string | null }).plan_id,
          created_at: membership.created_at,
        }}
        plans={plans.filter((p) => p.active)}
        profile={profile}
        roleLabel={ROLE_LABEL}
        presencasData={presencasData}
        prs={prs}
        atividadeData={atividadeData}
      />
    </main>
  );
}
