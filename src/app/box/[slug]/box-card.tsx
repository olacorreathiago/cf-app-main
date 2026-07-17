"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { signOut } from "@/app/dashboard/actions";
import { cn } from "@/lib/utils";

interface BoxCardProps {
  slug: string;
  name: string;
  logoUrl: string | null;
  /** "Porto • desde 2026" style subtitle. */
  subtitle: string;
  canManageSettings: boolean;
}

// Bottom-of-sidebar box identity card with an overflow (⋯) menu holding the
// actions that used to live in the sidebar footer: settings, back to the
// athlete view, and sign out.
export function BoxCard({ slug, name, logoUrl, subtitle, canManageSettings }: BoxCardProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative p-3">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-bg-card px-3 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-input text-sm font-bold uppercase text-text-secondary">
          {logoUrl ? <img src={logoUrl} alt={name} className="h-9 w-9 rounded-lg object-cover" /> : name.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-primary">{name}</p>
          <p className="truncate text-[11px] text-text-tertiary">{subtitle}</p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Opções da box"
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors duration-150 hover:bg-bg-input hover:text-text-primary",
            open && "bg-bg-input text-text-primary"
          )}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="3.5" r="1.1" fill="currentColor" />
            <circle cx="8" cy="8" r="1.1" fill="currentColor" />
            <circle cx="8" cy="12.5" r="1.1" fill="currentColor" />
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute bottom-full left-3 right-3 mb-1 overflow-hidden rounded-xl border border-border bg-bg-card p-1 shadow-lg"
          >
            {canManageSettings && (
              <MenuLink href={`/box/${slug}/settings`} onClick={() => setOpen(false)} label="Definições" icon={SettingsIcon} />
            )}
            <MenuLink href="/athlete" onClick={() => setOpen(false)} label="Meu perfil" icon={ProfileIcon} />
            <form action={signOut}>
              <button
                type="submit"
                className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors duration-150 hover:bg-error/5 hover:text-error"
              >
                <span className="shrink-0 text-text-tertiary transition-colors duration-150 group-hover:text-error">{LogoutIcon}</span>
                Terminar sessão
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({ href, label, icon, onClick }: { href: string; label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors duration-150 hover:bg-bg-card-hover hover:text-text-primary"
    >
      <span className="shrink-0 text-text-tertiary">{icon}</span>
      {label}
    </Link>
  );
}

const SettingsIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.35" />
    <path d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.884.884M11.716 11.716l.884.884M3.4 12.6l.884-.884M11.716 4.284l.884-.884" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
  </svg>
);
const ProfileIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.35" />
    <path d="M2 13.5c0-3.038 2.686-5.5 6-5.5s6 2.462 6 5.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
  </svg>
);
const LogoutIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    <path d="M10.5 11L14 8l-3.5-3M14 8H6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
