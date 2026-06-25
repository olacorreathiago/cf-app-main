"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  suspendMember,
  reactivateMember,
  removeMember,
  changeRole,
} from "@/lib/box/member-actions";

interface Props {
  membershipId: string;
  boxId: string;
  slug: string;
  status: string;
  isSelf: boolean;
  targetRole: string;
  viewerRole: string;
}

const ROLE_LABEL: Record<string, string> = {
  partner: "Partner",
  manager: "Manager",
  coach: "Coach",
  athlete: "Atleta",
};

// Roles that each viewer level can assign
const ASSIGNABLE_ROLES: Record<string, string[]> = {
  owner:   ["partner", "manager", "coach", "athlete"],
  partner: ["partner", "manager", "coach", "athlete"],
  manager: ["coach", "athlete"],
};

export function MemberActionsMenu({ membershipId, boxId, slug, status, isSelf, targetRole, viewerRole }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const canAct = !isSelf && targetRole !== "owner";
  const assignable = (ASSIGNABLE_ROLES[viewerRole] ?? []).filter((r) => r !== targetRole);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!canAct) return null;

  async function handle(action: "suspend" | "reactivate" | "remove") {
    setLoading(action);
    setOpen(false);
    try {
      if (action === "suspend") await suspendMember(membershipId, boxId, slug);
      else if (action === "reactivate") await reactivateMember(membershipId, boxId, slug);
      else await removeMember(membershipId, boxId, slug);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível executar a ação.");
    } finally {
      setLoading(null);
    }
  }

  async function handleRoleChange(newRole: string) {
    setLoading(`role_${newRole}`);
    setOpen(false);
    try {
      await changeRole(membershipId, boxId, slug, newRole);
      toast.success(`Role alterado para ${ROLE_LABEL[newRole] ?? newRole}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível alterar o role.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={!!loading}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary",
          "transition-colors duration-150 hover:bg-bg-input hover:text-text-primary",
          "disabled:opacity-40"
        )}
        aria-label="Ações do membro"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="2.5" r="1" fill="currentColor" />
          <circle cx="7" cy="7" r="1" fill="currentColor" />
          <circle cx="7" cy="11.5" r="1" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-20 w-48 rounded-xl border border-border bg-bg-card shadow-lg py-1">

          {/* Status actions */}
          {status === "suspended" ? (
            <MenuItem onClick={() => handle("reactivate")} label="Reativar" />
          ) : (
            <MenuItem onClick={() => handle("suspend")} label="Suspender" />
          )}

          {/* Role change */}
          {assignable.length > 0 && (
            <>
              <div className="my-1 border-t border-border" />
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                Alterar role
              </p>
              {assignable.map((role) => (
                <MenuItem
                  key={role}
                  onClick={() => handleRoleChange(role)}
                  label={ROLE_LABEL[role] ?? role}
                />
              ))}
            </>
          )}

          {/* Remove */}
          <div className="my-1 border-t border-border" />
          <MenuItem onClick={() => handle("remove")} label="Remover da box" danger />
        </div>
      )}
    </div>
  );
}

function MenuItem({ onClick, label, danger }: { onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full px-3 py-2 text-left text-sm transition-colors duration-100",
        danger
          ? "text-error hover:bg-error/10"
          : "text-text-primary hover:bg-bg-input"
      )}
    >
      {label}
    </button>
  );
}
