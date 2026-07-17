"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/dashboard/actions";
import { switchActiveBox } from "./athlete-actions";
import type { AthleteBox } from "@/lib/athlete/dashboard-actions";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  locked?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const STAFF_ROLES = ["owner", "partner", "manager", "coach"];

// ── Icons ────────────────────────────────────────────────────────────────────
const HomeIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2 8.5L8 2l6 6.5V14a.6.6 0 01-.6.6H2.6A.6.6 0 012 14V8.5z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
    <path d="M6 14.6V9.4h4v5.2" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
  </svg>
);
const ClassesIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.35" />
    <path d="M5 1.5v2M11 1.5v2M1.5 6.5h13" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
  </svg>
);
const ResultsIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2 13h12M4 13V9M8 13V5M12 13V7" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
  </svg>
);
const RecordsIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M2.5 10.5l3.5-4 2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M13.5 4v3.5H10" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const LeaderboardIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="2" y="7" width="3" height="6.5" rx="0.6" stroke="currentColor" strokeWidth="1.35" />
    <rect x="6.5" y="3.5" width="3" height="10" rx="0.6" stroke="currentColor" strokeWidth="1.35" />
    <rect x="11" y="9" width="3" height="4.5" rx="0.6" stroke="currentColor" strokeWidth="1.35" />
  </svg>
);
const FeedIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="1.5" y="1.5" width="13" height="13" rx="3" stroke="currentColor" strokeWidth="1.35" />
    <path d="M4.5 6h7M4.5 9h5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
  </svg>
);
const EventsIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.35" />
    <path d="M5 1.5v2M11 1.5v2M1.5 6.5h13" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    <path d="M5 9.5h2M9 9.5h2M5 12h2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
  </svg>
);
// Box avatar — the box logo, or a monogram of its initial when none. A small
// amber dot flags a box that is still pending platform approval.
function BoxAvatar({ box, size = "md" }: { box: AthleteBox; size?: "sm" | "md" }) {
  const dim = size === "md" ? "h-6 w-6" : "h-5 w-5";
  const pending = box.approval_status != null && box.approval_status !== "approved";
  return (
    <span className={cn("relative shrink-0", dim)}>
      {box.logo_url ? (
        <img src={box.logo_url} alt={box.name} className={cn("rounded-md object-cover", dim)} />
      ) : (
        <span className={cn("flex items-center justify-center rounded-md bg-accent/15 text-[10px] font-bold uppercase text-accent", dim)}>
          {box.name.charAt(0)}
        </span>
      )}
      {pending && (
        <span
          className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-bg-base"
          title="Box em análise"
        />
      )}
    </span>
  );
}

const treinoSection: NavSection = {
  label: "Treinos",
  items: [
    { label: "Aulas", href: "/athlete/classes", icon: ClassesIcon },
    { label: "Resultados", href: "/athlete/results", icon: ResultsIcon },
    { label: "Records", href: "/athlete/prs", icon: RecordsIcon },
  ],
};

const comunidadeSection: NavSection = {
  label: "Comunidade",
  items: [
    { label: "Leaderboard", href: "/athlete/leaderboard", icon: LeaderboardIcon },
    { label: "Feed", href: "/athlete/feed", icon: FeedIcon },
    { label: "Eventos", href: "/athlete/events", icon: EventsIcon, locked: true },
  ],
};

export function AthleteSidebar({
  boxes,
  activeBox,
  isProfessional,
}: {
  boxes: AthleteBox[];
  activeBox: AthleteBox | null;
  isProfessional: boolean;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-3 py-3">
      {/* Início — standalone */}
      <div className="mb-2">
        <NavItemRow
          item={{ label: "Início", href: "/athlete", icon: HomeIcon }}
          pathname={pathname}
        />
      </div>

      {/* Minhas Boxes */}
      <SectionLabel>Minhas Boxes</SectionLabel>
      <div className="mb-2">
        {boxes.length > 1 ? (
          <BoxSelectorRow boxes={boxes} activeBox={activeBox} />
        ) : (
          boxes.map((box) => <BoxRow key={box.id} box={box} activeBox={activeBox} />)
        )}
        {isProfessional && <AddBoxRow />}
        {boxes.length === 0 && !isProfessional && (
          <p className="px-3 py-2 text-xs text-text-tertiary/70">Sem box ativa</p>
        )}
      </div>

      {/* Treinos */}
      <SectionLabel>{treinoSection.label}</SectionLabel>
      <div className="mb-2">
        {treinoSection.items.map((item) => (
          <NavItemRow key={item.href} item={item} pathname={pathname} />
        ))}
      </div>

      {/* Comunidade */}
      <SectionLabel>{comunidadeSection.label}</SectionLabel>
      <div className="mb-2">
        {comunidadeSection.items.map((item) => (
          <NavItemRow key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary/60">
      {children}
    </p>
  );
}

// A box in "Minhas Boxes". Staff role → navigates to management (/box/slug),
// switching the whole shell. Athlete-only → switches active box context.
function BoxRow({ box, activeBox }: { box: AthleteBox; activeBox: AthleteBox | null }) {
  const pathname = usePathname();
  const isStaff = STAFF_ROLES.includes(box.role);
  const isActive = box.id === activeBox?.id;

  const inner = (
    <>
      <BoxAvatar box={box} />
      <span className="truncate">{box.name}</span>
      {isStaff && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="ml-auto shrink-0 text-text-tertiary">
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </>
  );

  // The active box gets a static subtle highlight (not the sliding nav pill —
  // that is reserved for the current page and shares a single layoutId).
  const baseCls = cn(
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
    isActive
      ? "bg-bg-card/50 font-medium text-text-primary"
      : "text-text-secondary hover:bg-bg-card/60 hover:text-text-primary"
  );

  if (isStaff) {
    return (
      <Link href={`/box/${box.slug}`} className={baseCls}>
        {inner}
      </Link>
    );
  }

  return (
    <form action={switchActiveBox.bind(null, box.id, pathname)}>
      <button type="submit" className={baseCls}>
        {inner}
      </button>
    </form>
  );
}

// With more than one box, "Minhas Boxes" becomes a split control: the box body
// (avatar + name) links to that box — management for staff boxes — while the
// chevron opens the selector to switch which box is active.
function BoxSelectorRow({ boxes, activeBox }: { boxes: AthleteBox[]; activeBox: AthleteBox | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = activeBox ?? boxes[0];
  const currentIsStaff = STAFF_ROLES.includes(current.role);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const bodyInner = (
    <>
      <BoxAvatar box={current} />
      <span className="truncate font-medium">{current.name}</span>
    </>
  );
  const bodyCls = "flex min-w-0 flex-1 items-center gap-3 py-2 pl-3 pr-1 text-left";

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center rounded-lg text-sm text-text-primary transition-colors duration-150 hover:bg-bg-card/60">
        {currentIsStaff ? (
          <Link href={`/box/${current.slug}`} className={bodyCls}>{bodyInner}</Link>
        ) : (
          <button onClick={() => setOpen((o) => !o)} className={bodyCls}>{bodyInner}</button>
        )}

        {/* Chevron — the selector: switches the active box */}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Trocar box ativa"
          className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-tertiary transition-colors duration-150 hover:bg-bg-card hover:text-text-primary"
        >
          <motion.svg
            width="13" height="13" viewBox="0 0 14 14" fill="none"
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.18 }}
          >
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-0.5">
              {boxes.map((box) => {
                const isActive = box.id === current.id;
                return (
                  <form key={box.id} action={switchActiveBox.bind(null, box.id, pathname)}>
                    <button
                      type="submit"
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg py-2 pl-4 pr-3 text-sm transition-colors duration-150",
                        isActive ? "text-text-primary" : "text-text-secondary hover:bg-bg-card/60 hover:text-text-primary"
                      )}
                    >
                      <BoxAvatar box={box} size="sm" />
                      <span className="truncate">{box.name}</span>
                      {isActive && (
                        <svg className="ml-auto shrink-0 text-accent" width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  </form>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AddBoxRow() {
  return (
    <Link
      href="/dashboard/create-box"
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors duration-150 hover:bg-bg-card/60 hover:text-text-primary"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center text-text-tertiary">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      Adicionar nova box
    </Link>
  );
}

// Sliding gold active indicator, shared across all nav rows via layoutId.
function ActivePill() {
  return (
    <motion.span
      layoutId="athlete-nav-active"
      className="absolute inset-0 rounded-lg bg-bg-card"
      transition={{ type: "spring", stiffness: 400, damping: 34 }}
    />
  );
}

function NavItemRow({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive =
    item.href === "/athlete" ? pathname === "/athlete" : pathname.startsWith(item.href);

  if (item.locked) {
    return (
      <div className="group relative">
        <div className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 opacity-35">
          <span className="shrink-0 text-text-tertiary">{item.icon}</span>
          <span className="text-sm text-text-tertiary">{item.label}</span>
        </div>
        <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 group-hover:block">
          <div className="rounded-lg border border-border bg-bg-card px-2.5 py-1.5 text-xs text-text-tertiary shadow-lg whitespace-nowrap">
            Em breve
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
        isActive
          ? "font-medium text-text-primary"
          : "text-text-secondary hover:bg-bg-card/60 hover:text-text-primary"
      )}
    >
      {isActive && <ActivePill />}
      <span className={cn("relative z-10 shrink-0 transition-colors duration-150", isActive ? "text-accent" : "text-text-tertiary")}>
        {item.icon}
      </span>
      <span className="relative z-10">{item.label}</span>
    </Link>
  );
}

// ── Mobile ──────────────────────────────────────────────────────────────────

const ProfileIcon = (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.35" />
    <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
  </svg>
);

const mobileMainItems: NavItem[] = [
  { label: "Início", href: "/athlete", icon: HomeIcon },
  { label: "Aulas", href: "/athlete/classes", icon: ClassesIcon },
  { label: "Leaderboard", href: "/athlete/leaderboard", icon: LeaderboardIcon },
  { label: "Resultados", href: "/athlete/results", icon: ResultsIcon },
];

// Overflow nav shown inside the Menu sheet
const menuNavItems: NavItem[] = [
  { label: "Feed", href: "/athlete/feed", icon: FeedIcon },
  { label: "Records", href: "/athlete/prs", icon: RecordsIcon },
  { label: "Eventos", href: "/athlete/events", icon: EventsIcon, locked: true },
];

interface MobileProps {
  boxes: AthleteBox[];
  activeBox: AthleteBox | null;
  isProfessional: boolean;
}

// Reusable bottom sheet (backdrop + panel + grab handle + titled header).
function MobileSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85svh] overflow-y-auto rounded-t-3xl border-t border-border bg-bg-base px-6 pb-10 pt-4 lg:hidden"
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" />
            <div className="mb-4 flex items-center justify-between">
              <p className="label-caps text-text-tertiary">{title}</p>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-input text-text-tertiary"
                aria-label="Fechar"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// The list of boxes used in both the header chip sheet and the Menu sheet:
// tapping a row switches the active (athlete) box; staff boxes also offer a
// "Gerir" shortcut into management.
function MobileBoxSwitchList({
  boxes,
  activeBox,
  isProfessional,
  pathname,
  onClose,
}: MobileProps & { pathname: string; onClose: () => void }) {
  return (
    <div className="space-y-1">
      {boxes.map((box) => {
        const isStaff = STAFF_ROLES.includes(box.role);
        const isActive = box.id === activeBox?.id;
        return (
          <div
            key={box.id}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5",
              isActive ? "bg-bg-card" : ""
            )}
          >
            <form action={switchActiveBox.bind(null, box.id, pathname)} className="flex min-w-0 flex-1">
              <button type="submit" onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <BoxAvatar box={box} />
                <span className="truncate text-sm font-medium text-text-primary">{box.name}</span>
                {isActive && (
                  <svg className="shrink-0 text-accent" width="13" height="13" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </form>
            {isStaff && (
              <Link
                href={`/box/${box.slug}`}
                onClick={onClose}
                className="shrink-0 rounded-lg bg-bg-input px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors duration-150 hover:text-text-primary"
              >
                Gerir
              </Link>
            )}
          </div>
        );
      })}
      {isProfessional && (
        <Link
          href="/dashboard/create-box"
          onClick={onClose}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-secondary transition-colors duration-150 hover:bg-bg-card"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center text-text-tertiary">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          Adicionar nova box
        </Link>
      )}
    </div>
  );
}

// Header chip (mobile) — shows the active box; tapping opens the switch sheet.
export function BoxSwitchChip({ boxes, activeBox, isProfessional }: MobileProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = activeBox ?? boxes[0] ?? null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors duration-150 active:bg-bg-card/60"
      >
        {current ? (
          <BoxAvatar box={current} />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-accent-fg text-[10px] font-bold">Z</span>
        )}
        <span className="max-w-[150px] truncate text-sm font-semibold text-text-primary">
          {current?.name ?? "Sem box"}
        </span>
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="text-text-tertiary">
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <MobileSheet open={open} onClose={() => setOpen(false)} title="Trocar de box">
        <MobileBoxSwitchList
          boxes={boxes}
          activeBox={activeBox}
          isProfessional={isProfessional}
          pathname={pathname}
          onClose={() => setOpen(false)}
        />
      </MobileSheet>
    </>
  );
}

export function AthleteBottomNav({ boxes, activeBox, isProfessional }: MobileProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isMenuActive = menuNavItems.some(
    (item) => !item.locked && pathname.startsWith(item.href)
  ) || pathname.startsWith("/athlete/profile");

  return (
    <>
      {mobileMainItems.map((item) => {
        const isActive =
          item.href === "/athlete" ? pathname === "/athlete" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors duration-150",
              isActive ? "text-accent" : "text-text-tertiary"
            )}
          >
            <span className={cn(isActive && "[&_svg]:stroke-accent")}>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}

      {/* Menu button */}
      <button
        onClick={() => setMenuOpen(true)}
        className={cn(
          "flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors duration-150",
          isMenuActive ? "text-accent" : "text-text-tertiary"
        )}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" className={cn(isMenuActive && "stroke-accent")}>
          <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        Menu
      </button>

      <MobileSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        {/* Context — box switcher */}
        <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary/60">
          Minhas Boxes
        </p>
        <MobileBoxSwitchList
          boxes={boxes}
          activeBox={activeBox}
          isProfessional={isProfessional}
          pathname={pathname}
          onClose={() => setMenuOpen(false)}
        />

        {/* Overflow nav */}
        <p className="mb-1 mt-5 px-1 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary/60">
          Mais
        </p>
        <nav className="space-y-1">
          {menuNavItems.map((item) => {
            if (item.locked) {
              return (
                <div key={item.href} className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-3 opacity-35">
                  <span className="shrink-0 text-text-tertiary">{item.icon}</span>
                  <span className="text-sm text-text-tertiary">{item.label}</span>
                  <span className="ml-auto rounded-full bg-bg-input px-2 py-0.5 text-[10px] text-text-tertiary">Em breve</span>
                </div>
              );
            }
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 transition-colors duration-150",
                  isActive ? "bg-bg-card font-medium text-text-primary" : "text-text-secondary hover:bg-bg-card"
                )}
              >
                <span className={cn("shrink-0", isActive ? "text-accent" : "text-text-tertiary")}>{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Account */}
        <div className="mt-5 space-y-1 border-t border-border pt-4">
          <Link
            href="/athlete/profile"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-text-secondary transition-colors duration-150 hover:bg-bg-card hover:text-text-primary"
          >
            <span className="shrink-0 text-text-tertiary">{ProfileIcon}</span>
            Perfil
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-text-secondary transition-colors duration-150 hover:bg-error/5 hover:text-error"
            >
              <span className="shrink-0 text-text-tertiary transition-colors duration-150 group-hover:text-error">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
                  <path d="M10.5 11L14 8l-3.5-3M14 8H6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              Terminar sessão
            </button>
          </form>
        </div>
      </MobileSheet>
    </>
  );
}
