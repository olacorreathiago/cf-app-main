"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/dashboard/actions";

export interface StaffBox {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  approval_status: string | null;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
  locked?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

function navSections(slug: string): NavSection[] {
  return [
    {
      label: "",
      items: [
        {
          label: "Visão Geral",
          href: `/box/${slug}`,
          roles: ["owner", "partner", "manager", "coach"],
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.35" />
              <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.35" />
              <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.35" />
              <rect x="9" y="9" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.35" />
            </svg>
          ),
        },
        {
          label: "Hoje",
          href: `/box/${slug}/today`,
          roles: ["owner", "partner", "manager", "coach"],
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.35" />
              <path d="M8 5.5v3l2 1.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
        },
      ],
    },
    {
      label: "Operações",
      items: [
        {
          label: "Membros",
          href: `/box/${slug}/members`,
          roles: ["owner", "partner", "manager"],
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.35" />
              <path d="M1 13c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
              <path d="M12 7c1.38 0 2.5 1.12 2.5 2.5v3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
              <path d="M10 4.5a1.75 1.75 0 100-1" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
            </svg>
          ),
        },
        {
          label: "Agenda",
          href: `/box/${slug}/schedule`,
          roles: ["owner", "partner", "manager"],
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.35" />
              <path d="M5 1.5v2M11 1.5v2M1.5 6.5h13" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
              <path d="M4.5 9.5h2M7.5 9.5h2M10.5 9.5h1M4.5 12h2M7.5 12h2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
            </svg>
          ),
        },
        {
          label: "Aulas",
          href: `/box/${slug}/classes`,
          roles: ["owner", "partner", "manager", "coach"],
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2.5L2.5 5.5l5.5 3 5.5-3L8 2.5z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
              <path d="M2.5 8.5l5.5 3 5.5-3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2.5 11.5l5.5 3 5.5-3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
        },
        {
          label: "WODs",
          href: `/box/${slug}/wods`,
          roles: ["owner", "partner", "manager", "coach"],
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5L2 4.5v4.5c0 3 2.4 5.5 6 5.5s6-2.5 6-5.5V4.5L8 1.5z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
              <path d="M5.5 8.5L7 10l3.5-3.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
        },
        {
          label: "Feed de Notícias",
          href: `/box/${slug}/posts`,
          roles: ["owner", "partner", "manager"],
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="1.5" width="13" height="13" rx="3" stroke="currentColor" strokeWidth="1.35" />
              <path d="M4.5 6h7M4.5 9h5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
            </svg>
          ),
        },
      ],
    },
    {
      label: "Financeiro",
      items: [
        {
          label: "Planos",
          href: `/box/${slug}/plans`,
          roles: ["owner", "partner"],
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="3.5" width="13" height="9" rx="2" stroke="currentColor" strokeWidth="1.35" />
              <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.35" />
              <path d="M4.5 10h3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
            </svg>
          ),
        },
        {
          label: "Faturação",
          href: `/box/${slug}/billing`,
          roles: ["owner", "partner"],
          icon: (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 2.5h10a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1v-9a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.35" />
              <path d="M5 6.5h6M5 9.5h4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
            </svg>
          ),
        },
      ],
    },
  ];
}

/* ── Sidebar (desktop) ──────────────────────────────── */

interface BoxSidebarProps {
  slug: string;
  role: string;
}

export function BoxSidebar({ slug, role }: BoxSidebarProps) {
  const pathname = usePathname();
  const sections = navSections(slug);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-3 py-3">
      {sections.map((section) => {
        const visible = section.items.filter((i) => i.roles.includes(role));
        if (visible.length === 0) return null;
        return (
          <div key={section.label || "main"} className="mb-2">
            {section.label && (
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary/60">
                {section.label}
              </p>
            )}
            {visible.map((item) => (
              <SidebarItem key={item.href} item={item} slug={slug} pathname={pathname} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function SidebarItem({
  item,
  slug,
  pathname,
}: {
  item: NavItem;
  slug: string;
  pathname: string;
}) {
  const isActive =
    item.href === `/box/${slug}` ? pathname === item.href : pathname.startsWith(item.href);

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
      {isActive && (
        <motion.span
          layoutId="box-nav-active"
          className="absolute inset-0 rounded-lg bg-bg-card"
          transition={{ type: "spring", stiffness: 400, damping: 34 }}
        />
      )}
      <span className={cn("relative z-10 shrink-0 transition-colors duration-150", isActive ? "text-accent" : "text-text-tertiary")}>
        {item.icon}
      </span>
      <span className="relative z-10">{item.label}</span>
    </Link>
  );
}

/* ── Mobile ─────────────────────────────────────────── */

const GeralIcon = (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.35" />
    <rect x="9" y="1.5" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.35" />
    <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.35" />
    <rect x="9" y="9" width="5.5" height="5.5" rx="1.5" stroke="currentColor" strokeWidth="1.35" />
  </svg>
);
const HojeIcon = (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.35" />
    <path d="M8 5.5v3l2 1.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const MembrosIcon = (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
    <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.35" />
    <path d="M1 13c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    <path d="M12 7c1.38 0 2.5 1.12 2.5 2.5v3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    <path d="M10 4.5a1.75 1.75 0 100-1" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
  </svg>
);
const AulasIcon = (
  <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
    <path d="M8 2.5L2.5 5.5l5.5 3 5.5-3L8 2.5z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
    <path d="M2.5 8.5l5.5 3 5.5-3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2.5 11.5l5.5 3 5.5-3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const WodIcon = (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5L2 4.5v4.5c0 3 2.4 5.5 6 5.5s6-2.5 6-5.5V4.5L8 1.5z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
    <path d="M5.5 8.5L7 10l3.5-3.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const AgendaIcon = (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.35" />
    <path d="M5 1.5v2M11 1.5v2M1.5 6.5h13" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
  </svg>
);
const FeedNewsIcon = (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="1.5" width="13" height="13" rx="3" stroke="currentColor" strokeWidth="1.35" />
    <path d="M4.5 6h7M4.5 9h5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
  </svg>
);
const SettingsIcon2 = (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.35" />
    <path d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.884.884M11.716 11.716l.884.884M3.4 12.6l.884-.884M11.716 4.284l.884-.884" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
  </svg>
);
const ProfileIcon2 = (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.35" />
    <path d="M2 13.5c0-3.038 2.686-5.5 6-5.5s6 2.462 6 5.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
  </svg>
);

function boxTabs(slug: string): NavItem[] {
  return [
    { label: "Geral", href: `/box/${slug}`, roles: ["owner", "partner", "manager", "coach"], icon: GeralIcon },
    { label: "Hoje", href: `/box/${slug}/today`, roles: ["owner", "partner", "manager", "coach"], icon: HojeIcon },
    { label: "Membros", href: `/box/${slug}/members`, roles: ["owner", "partner", "manager"], icon: MembrosIcon },
    { label: "Aulas", href: `/box/${slug}/classes`, roles: ["owner", "partner", "manager", "coach"], icon: AulasIcon },
  ];
}

const PlanosIcon = (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="3.5" width="13" height="9" rx="2" stroke="currentColor" strokeWidth="1.35" />
    <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.35" />
    <path d="M4.5 10h3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
  </svg>
);
const FaturacaoIcon = (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
    <path d="M3 2.5h10a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1v-9a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.35" />
    <path d="M5 6.5h6M5 9.5h4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
  </svg>
);

function boxMenuItems(slug: string): NavItem[] {
  return [
    { label: "WODs", href: `/box/${slug}/wods`, roles: ["owner", "partner", "manager", "coach"], icon: WodIcon },
    { label: "Agenda", href: `/box/${slug}/schedule`, roles: ["owner", "partner", "manager"], icon: AgendaIcon },
    { label: "Feed de Notícias", href: `/box/${slug}/posts`, roles: ["owner", "partner", "manager"], icon: FeedNewsIcon },
    { label: "Planos", href: `/box/${slug}/plans`, roles: ["owner", "partner"], icon: PlanosIcon },
    { label: "Faturação", href: `/box/${slug}/billing`, roles: ["owner", "partner"], icon: FaturacaoIcon },
  ];
}

function BoxAvatarMini({ box }: { box: StaffBox }) {
  const pending = box.approval_status != null && box.approval_status !== "approved";
  return (
    <span className="relative h-6 w-6 shrink-0">
      {box.logo_url ? (
        <img src={box.logo_url} alt={box.name} className="h-6 w-6 rounded-md object-cover" />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/15 text-[10px] font-bold uppercase text-accent">
          {box.name.charAt(0)}
        </span>
      )}
      {pending && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-bg-base" />}
    </span>
  );
}

function BoxMobileSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85svh] overflow-y-auto rounded-t-3xl border-t border-border bg-bg-base px-6 pb-10 pt-4 lg:hidden"
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" />
            <div className="mb-4 flex items-center justify-between">
              <p className="label-caps text-text-tertiary">{title}</p>
              <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-input text-text-tertiary" aria-label="Fechar">
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

// Box switcher list for mobile: other managed boxes + "back to my profile".
function BoxSwitchList({ managedBoxes, currentSlug, onClose }: { managedBoxes: StaffBox[]; currentSlug: string; onClose: () => void }) {
  return (
    <div className="space-y-1">
      {managedBoxes.map((box) => {
        const isCurrent = box.slug === currentSlug;
        return (
          <Link
            key={box.id}
            href={`/box/${box.slug}`}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150",
              isCurrent ? "bg-bg-card font-medium text-text-primary" : "text-text-secondary hover:bg-bg-card"
            )}
          >
            <BoxAvatarMini box={box} />
            <span className="truncate">{box.name}</span>
            {isCurrent && (
              <svg className="ml-auto shrink-0 text-accent" width="13" height="13" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </Link>
        );
      })}
      <Link
        href="/athlete"
        onClick={onClose}
        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-secondary transition-colors duration-150 hover:bg-bg-card hover:text-text-primary"
      >
        <span className="shrink-0 text-text-tertiary">{ProfileIcon2}</span>
        Voltar ao meu perfil
      </Link>
    </div>
  );
}

// Header chip (mobile) — current box; tap opens the box switch sheet.
export function BoxSwitchChip({ current, managedBoxes }: { current: StaffBox; managedBoxes: StaffBox[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors duration-150 active:bg-bg-card/60"
      >
        <BoxAvatarMini box={current} />
        <span className="max-w-[150px] truncate text-sm font-semibold text-text-primary">{current.name}</span>
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="text-text-tertiary">
          <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <BoxMobileSheet open={open} onClose={() => setOpen(false)} title="Trocar de box">
        <BoxSwitchList managedBoxes={managedBoxes} currentSlug={current.slug} onClose={() => setOpen(false)} />
      </BoxMobileSheet>
    </>
  );
}

export function BoxNav({ slug, role, managedBoxes }: { slug: string; role: string; managedBoxes: StaffBox[] }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = boxTabs(slug).filter((i) => i.roles.includes(role));
  const allMenuItems = boxMenuItems(slug).filter((i) => i.roles.includes(role));
  const menuItems = allMenuItems.filter((i) => !i.href.includes("/plans") && !i.href.includes("/billing"));
  const financeItems = allMenuItems.filter((i) => i.href.includes("/plans") || i.href.includes("/billing"));
  const canSettings = ["owner", "partner"].includes(role);
  const isMenuActive = allMenuItems.some((item) => pathname.startsWith(item.href));

  return (
    <>
      {tabs.map((item) => {
        const isActive =
          item.href === `/box/${slug}` ? pathname === item.href : pathname.startsWith(item.href);
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

      <BoxMobileSheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        {/* Context — box switcher */}
        <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary/60">Box</p>
        <BoxSwitchList managedBoxes={managedBoxes} currentSlug={slug} onClose={() => setMenuOpen(false)} />

        {/* Overflow nav */}
        <p className="mb-1 mt-5 px-1 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary/60">Operações</p>
        <nav className="space-y-1">
          {menuItems.map((item) => {
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

        {/* Financeiro */}
        {financeItems.length > 0 && (
          <>
            <p className="mb-1 mt-5 px-1 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary/60">Financeiro</p>
            <nav className="space-y-1">
              {financeItems.map((item) => {
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
          </>
        )}

        {/* Account */}
        <div className="mt-5 space-y-1 border-t border-border pt-4">
          {canSettings && (
            <Link
              href={`/box/${slug}/settings`}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-text-secondary transition-colors duration-150 hover:bg-bg-card hover:text-text-primary"
            >
              <span className="shrink-0 text-text-tertiary">{SettingsIcon2}</span>
              Definições
            </Link>
          )}
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
      </BoxMobileSheet>
    </>
  );
}
