"use client";

import { useState, useMemo } from "react";
import { MemberActionsMenu } from "./member-actions-menu";
import { InviteDrawer } from "./invite-drawer";

const PAGE_SIZE = 12;

const roleLabel: Record<string, string> = {
  owner: "Owner", partner: "Sócio", manager: "Gestor", coach: "Coach", athlete: "Atleta",
};

type Member = {
  id: string;
  role: string;
  status: string;
  profiles: { full_name: string | null; email: string; avatar_url: string | null };
};

interface MembersListProps {
  members: Member[];
  boxId: string;
  boxName: string;
  slug: string;
  viewerRole: string;
  canInvite: boolean;
  joinToken: string;
}

export function MembersList({ members, boxId, boxName, slug, viewerRole, canInvite, joinToken }: MembersListProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return members;
    return members.filter((m) => {
      const name = (m.profiles.full_name ?? "").toLowerCase();
      const email = m.profiles.email.toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [members, query]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(0, totalPages - 1));
  const paginated = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function handleSearch(value: string) {
    setQuery(value);
    setPage(0);
  }

  return (
    <>
      <div className="space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <p className="label-caps text-text-tertiary">
            Membros
          </p>
          {canInvite && (
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-accent/40 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
                <path d="M7 4.5v5M4.5 7h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Convidar membros
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            placeholder="Pesquisar por nome ou email..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg-input py-2.5 pl-9 pr-4 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow duration-150"
          />
        </div>

        {/* List */}
        {paginated.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center">
            <p className="text-sm text-text-tertiary">
              {query ? "Nenhum resultado encontrado." : "Sem membros ativos"}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {paginated.map((m) => {
              // Supabase may return profiles as array at runtime for joins
              const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
              const name = profile.full_name ?? profile.email;
              return (
                <li key={m.id} className="flex items-center gap-3 rounded-2xl border border-border bg-bg-card px-4 py-3">
                  <Avatar name={name} url={profile.avatar_url} />
                  <a href={`/box/${slug}/members/${m.id}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                    <p className="text-sm font-medium text-text-primary truncate">{name}</p>
                    <p className="text-xs text-text-tertiary truncate">{profile.email}</p>
                  </a>
                  <span className="text-xs font-medium text-text-secondary shrink-0">
                    {roleLabel[m.role] ?? m.role}
                  </span>
                  <MemberActionsMenu
                    membershipId={m.id}
                    boxId={boxId}
                    slug={slug}
                    status={m.status}
                    isSelf={false}
                    targetRole={m.role}
                    viewerRole={viewerRole}
                  />
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-text-tertiary">
              {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
            </p>
            <div className="flex gap-2">
              <PageButton label="← Anterior" disabled={safePage === 0} onClick={() => setPage((p) => p - 1)} />
              <PageButton label="Próximo →" disabled={safePage >= totalPages - 1} onClick={() => setPage((p) => p + 1)} />
            </div>
          </div>
        )}
      </div>

      <InviteDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        boxId={boxId}
        boxName={boxName}
        slug={slug}
        joinToken={joinToken}
      />
    </>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const [broken, setBroken] = useState(false);
  const initials = (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent">
      {name.charAt(0).toUpperCase()}
    </div>
  );
  if (!url || broken) return initials;
  return (
    <img
      src={url}
      alt={name}
      className="h-9 w-9 rounded-full object-cover shrink-0"
      onError={() => setBroken(true)}
    />
  );
}

function PageButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-border bg-bg-card px-3 py-1.5 text-xs text-text-secondary transition-colors duration-150 hover:bg-bg-input disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {label}
    </button>
  );
}
