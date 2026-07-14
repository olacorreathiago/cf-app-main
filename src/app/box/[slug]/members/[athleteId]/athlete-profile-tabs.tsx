"use client";

import { useState } from "react";
import { TabPerfil } from "./tab-perfil";
import { TabPresencas } from "./tab-presencas";
import type { AthletePresencasData, AthletePr, AthleteAtividadeData } from "@/lib/box/athlete-profile-actions";

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  phone: string | null;
}

interface Membership {
  id: string;
  role: string;
  status: string;
  notes: string | null;
  created_at: string;
}

interface Props {
  slug: string;
  boxId: string;
  boxName: string;
  viewerRole: string;
  membership: Membership;
  profile: Profile;
  roleLabel: Record<string, string>;
  presencasData: AthletePresencasData;
  prs: AthletePr[];
  atividadeData: AthleteAtividadeData;
}

type Tab = "perfil" | "presencas" | "prs" | "atividade";

type TabDef = { key: Tab; label: string; badge?: number | null };

function buildTabs(presencasData: AthletePresencasData, prs: AthletePr[]): TabDef[] {
  return [
    { key: "perfil", label: "Perfil" },
    { key: "presencas", label: "Presenças", badge: presencasData.totalAttended || null },
    { key: "prs", label: "PRs", badge: prs.length || null },
    { key: "atividade", label: "Atividade" },
  ];
}

export function AthleteProfileTabs({
  slug,
  boxId,
  boxName,
  viewerRole,
  membership,
  profile,
  roleLabel,
  presencasData,
  prs,
  atividadeData,
}: Props) {
  const [tab, setTab] = useState<Tab>("perfil");
  const TABS = buildTabs(presencasData, prs);

  const name = profile.full_name ?? profile.email;
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="space-y-6">
      {/* Back link */}
      <a
        href={`/box/${slug}/members`}
        className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-text-primary transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Membros
      </a>

      {/* Athlete header */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-bg-card px-5 py-4">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={name}
            className="h-12 w-12 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/20 text-base font-semibold text-accent">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-base font-medium text-text-primary truncate">{name}</p>
          <p className="text-sm text-text-tertiary truncate">{profile.email}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                membership.status === "active"
                  ? "bg-success/10 text-success"
                  : "bg-error/10 text-error"
              }`}
            >
              {membership.status === "active" ? "Ativo" : "Suspenso"}
            </span>
            <span className="inline-flex items-center rounded-full border border-border bg-bg-input px-2 py-0.5 text-xs text-text-tertiary">
              {roleLabel[membership.role] ?? membership.role}
            </span>
            <span className="inline-flex items-center rounded-full border border-border bg-bg-input px-2 py-0.5 text-xs text-text-tertiary">
              Desde {new Date(membership.created_at).toLocaleDateString("pt-PT", { month: "short", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs — same pattern as members page */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`relative pb-3 px-1 mr-5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "text-text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-accent after:rounded-full"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {t.label}
            {t.badge != null && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                tab === t.key ? "bg-accent/10 text-accent" : "bg-bg-card text-text-tertiary"
              }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "perfil" && (
        <TabPerfil
          slug={slug}
          boxId={boxId}
          membership={membership}
          profile={profile}
          viewerRole={viewerRole}
          roleLabel={roleLabel}
        />
      )}

      {tab === "presencas" && (
        <TabPresencas data={presencasData} />
      )}

      {tab === "prs" && (
        <div className="py-12 text-center text-sm text-text-tertiary">
          PRs — em desenvolvimento
        </div>
      )}

      {tab === "atividade" && (
        <div className="py-12 text-center text-sm text-text-tertiary">
          Atividade — em desenvolvimento
        </div>
      )}
    </div>
  );
}
