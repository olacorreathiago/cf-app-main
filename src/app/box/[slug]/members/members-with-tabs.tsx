"use client";

import { useState } from "react";
import { MembersList } from "./members-list";
import { InviteRowActions } from "./invite-row-actions";
import { TrialsClient } from "../trials/trials-client";
import { DropInsClient } from "../drop-ins/drop-ins-client";
import type { DropIn } from "@/lib/box/drop-in-actions";

type Member = {
  id: string; role: string; status: string;
  profiles: { full_name: string | null; email: string; avatar_url: string | null };
};
type Invite = { id: string; email: string; role: string; created_at: string; expires_at: string };
type Trial = {
  id: string; name: string; email: string | null; phone: string | null;
  scheduled_for: string | null; status: "scheduled" | "completed" | "converted" | "lost";
  converted_at: string | null; notes: string | null; created_at: string; class_id: string | null;
};

type UpcomingClass = { id: string; name: string; starts_at: string; capacity: number };

interface Props {
  slug: string;
  boxId: string;
  boxName: string;
  viewerRole: string;
  canInvite: boolean;
  joinToken: string;
  activeMembers: Member[];
  pendingInvites: Invite[];
  trials: Trial[];
  dropIns: DropIn[];
  dropInEnabled: boolean;
  dropInPrice: number | null;
  upcomingClasses: UpcomingClass[];
}

type Tab = "members" | "trials" | "drop-ins";

export function MembersWithTabs({
  slug, boxId, boxName, viewerRole, canInvite, joinToken,
  activeMembers, pendingInvites, trials, dropIns, dropInEnabled, dropInPrice, upcomingClasses,
}: Props) {
  const [tab, setTab] = useState<Tab>("members");

  const scheduledTrials = trials.filter((t) => t.status === "scheduled").length;
  const pendingDropIns = dropIns.filter((d) => d.status === "pending").length;

  const tabs: { key: Tab; label: string; badge: number | null }[] = [
    { key: "members", label: "Membros", badge: null },
    { key: "trials", label: "Trials", badge: scheduledTrials > 0 ? scheduledTrials : null },
    ...(dropInEnabled ? [{ key: "drop-ins" as Tab, label: "Drop-ins", badge: pendingDropIns > 0 ? pendingDropIns : null }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
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
            {t.badge !== null && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${
                tab === t.key ? "bg-accent/10 text-accent" : "bg-bg-card text-text-tertiary"
              }`}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Membros */}
      {tab === "members" && (
        <div className="space-y-8">
          <MembersList
            members={activeMembers}
            boxId={boxId}
            boxName={boxName}
            slug={slug}
            viewerRole={viewerRole}
            canInvite={canInvite}
            joinToken={joinToken}
          />

          {pendingInvites.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-text-primary">
                Convites <span className="ml-1 font-normal text-text-tertiary">({pendingInvites.length})</span>
              </h2>
              <ul className="space-y-2">
                {pendingInvites.map((inv) => {
                  const expired = new Date(inv.expires_at) < new Date();
                  return (
                    <li
                      key={inv.id}
                      className={`flex items-center gap-3 rounded-2xl border border-dashed px-4 py-3 bg-bg-card ${
                        expired ? "border-error/30" : "border-border"
                      }`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        expired ? "bg-error/10 text-error" : "bg-bg-input text-text-tertiary"
                      }`}>
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h8A1.5 1.5 0 0 1 13 3.5v8a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 2 11.5v-8Z" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M2 5l5.5 4L13 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">{inv.email}</p>
                        <p className={`text-xs ${expired ? "text-error" : "text-text-tertiary"}`}>
                          {expired
                            ? "Expirado"
                            : `Expira ${new Date(inv.expires_at).toLocaleDateString("pt-PT")}`}
                        </p>
                      </div>
                      <InviteRowActions
                        inviteId={inv.id}
                        boxId={boxId}
                        slug={slug}
                        expired={expired}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* Tab: Trials */}
      {tab === "trials" && (
        <TrialsClient
          trials={trials}
          boxId={boxId}
          boxName={boxName}
          slug={slug}
          upcomingClasses={upcomingClasses}
        />
      )}

      {/* Tab: Drop-ins */}
      {tab === "drop-ins" && (
        <DropInsClient
          dropIns={dropIns}
          boxId={boxId}
          slug={slug}
          dropInPrice={dropInPrice}
          upcomingClasses={upcomingClasses}
        />
      )}
    </div>
  );
}
