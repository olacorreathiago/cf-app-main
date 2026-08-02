import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BoxInfoForm } from "./box-info-form";
import { BoxOperationalForm } from "./box-operational-form";
import { ModalitiesForm } from "./modalities-form";
import type { BoxFull } from "@/types";

export const metadata: Metadata = { title: "Definições" };

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BoxSettingsPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: box } = await supabase
    .from("boxes")
    .select("id, name, slug, address, city, phone, email, website, description, logo_url, cover_url, approval_status, payments_enabled, drop_in_enabled, drop_in_price, settings, created_at, country, deleted_at")
    .eq("slug", slug)
    .single();

  if (!box) redirect("/athlete");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", box.id)
    .in("role", ["owner", "partner", "manager"])
    .maybeSingle();

  if (!membership) redirect("/athlete");

  const isClosed = !!box.deleted_at;
  const canEdit = (membership.role === "owner" || membership.role === "partner") && !isClosed;

  const boxFull: BoxFull = {
    ...box,
    settings: (box.settings as BoxFull["settings"]) ?? {},
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-7 space-y-10">
      <div>
        <h1 className="font-display text-2xl uppercase text-text-primary">Definições</h1>
        <p className="label-caps mt-1 text-text-tertiary">
          {isClosed
            ? "Box encerrada — os campos ficam só de leitura"
            : canEdit
            ? "Informações e configurações da box"
            : "Só o owner e partners podem editar"}
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-bg-card p-8 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Informações da box</h2>
          <p className="text-sm text-text-tertiary mt-0.5">Dados públicos e de contacto</p>
        </div>
        <BoxInfoForm box={boxFull} canEdit={canEdit} />
      </section>

      <section className="rounded-2xl border border-border bg-bg-card p-8 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Modalidades</h2>
          <p className="text-sm text-text-tertiary mt-0.5">
            Tipos de aulas disponíveis na box — usados ao criar templates e aulas
          </p>
        </div>
        <ModalitiesForm
          boxId={boxFull.id}
          initial={boxFull.settings.modalities ?? []}
          canEdit={canEdit}
        />
      </section>

      <section className="rounded-2xl border border-border bg-bg-card p-8 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Configurações operacionais</h2>
          <p className="text-sm text-text-tertiary mt-0.5">Regras de reservas, cancelamentos e drop-ins</p>
        </div>
        <BoxOperationalForm box={boxFull} canEdit={canEdit} />
      </section>

      {membership.role === "owner" && !isClosed && (
        <section className="rounded-2xl border border-error/30 bg-error/5 p-8 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-error">Zona de perigo</h2>
            <p className="text-sm text-text-tertiary mt-0.5">
              Encerrar a box desassocia todos os membros e cancela as aulas futuras.
            </p>
          </div>
          <Link
            href={`/box/${slug}/settings/close`}
            className="inline-flex items-center gap-2 rounded-xl border border-error/40 bg-error/10 px-4 py-2.5 text-sm font-medium text-error transition-colors hover:bg-error/15"
          >
            Encerrar box
          </Link>
        </section>
      )}
    </main>
  );
}
