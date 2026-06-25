"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/dashboard/actions";

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
      label: "Principal",
      items: [
        {
          label: "Visão geral",
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
          label: "Recados",
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
          locked: true,
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
          locked: true,
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

function bottomItems(slug: string): NavItem[] {
  return [
    {
      label: "Definições",
      href: `/box/${slug}/settings`,
      roles: ["owner", "partner"],
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.35" />
          <path d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.884.884M11.716 11.716l.884.884M3.4 12.6l.884-.884M11.716 4.284l.884-.884" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        </svg>
      ),
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
  const bottom = bottomItems(slug).filter((i) => i.roles.includes(role));

  return (
    <div className="flex flex-1 flex-col overflow-y-auto py-3">
      {sections.map((section) => {
        const visible = section.items.filter((i) => i.roles.includes(role));
        if (visible.length === 0) return null;
        return (
          <div key={section.label} className="mb-1">
            <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary/60">
              {section.label}
            </p>
            {visible.map((item) => (
              <SidebarItem key={item.href} item={item} slug={slug} pathname={pathname} />
            ))}
          </div>
        );
      })}

      {/* Bottom: settings + back to athlete + sign out */}
      <div className="mt-auto border-t border-border pt-2 space-y-0">
        {bottom.map((item) => (
          <SidebarItem key={item.href} item={item} slug={slug} pathname={pathname} />
        ))}

        {/* Back to athlete view */}
        <div className="px-3">
          <Link
            href="/athlete"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-tertiary transition-colors duration-150 hover:bg-bg-card/60 hover:text-text-primary"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.35" />
              <path d="M2 13.5c0-3.038 2.686-5.5 6-5.5s6 2.462 6 5.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
            </svg>
            Meu perfil
          </Link>
        </div>

        {/* Sign out */}
        <div className="px-3">
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-tertiary transition-colors duration-150 hover:bg-bg-card/60 hover:text-text-primary"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
                <path d="M10.5 11L14 8l-3.5-3M14 8H6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Sair
            </button>
          </form>
        </div>
      </div>
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
      <div className="group relative px-3">
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
    <div className="px-3">
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
          isActive
            ? "bg-bg-card font-medium text-text-primary"
            : "text-text-secondary hover:bg-bg-card/60 hover:text-text-primary"
        )}
      >
        <span className={cn("shrink-0 transition-colors duration-150", isActive ? "text-accent" : "text-text-tertiary")}>
          {item.icon}
        </span>
        {item.label}
      </Link>
    </div>
  );
}

/* ── Mobile bottom nav ──────────────────────────────── */

export function BoxNav({ slug, role }: { slug: string; role: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const mainItems: NavItem[] = [
    {
      label: "Geral",
      href: `/box/${slug}`,
      roles: ["owner", "partner", "manager", "coach"],
      icon: (
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
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
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.35" />
          <path d="M8 5.5v3l2 1.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  const drawerItems: NavItem[] = [
    {
      label: "Aulas",
      href: `/box/${slug}/classes`,
      roles: ["owner", "partner", "manager", "coach"],
      icon: (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <path d="M8 2.5L2.5 5.5l5.5 3 5.5-3L8 2.5z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
          <path d="M2.5 8.5l5.5 3 5.5-3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: "WOD",
      href: `/box/${slug}/wods`,
      roles: ["owner", "partner", "manager", "coach"],
      icon: (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <path d="M8 1.5L2 4.5v4.5c0 3 2.4 5.5 6 5.5s6-2.5 6-5.5V4.5L8 1.5z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
          <path d="M5.5 8.5L7 10l3.5-3.5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: "Membros",
      href: `/box/${slug}/members`,
      roles: ["owner", "partner", "manager"],
      icon: (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.35" />
          <path d="M1 13c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
          <path d="M12 7c1.38 0 2.5 1.12 2.5 2.5v3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
          <path d="M10 4.5a1.75 1.75 0 100-1" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Definições",
      href: `/box/${slug}/settings`,
      roles: ["owner", "partner"],
      icon: (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.35" />
          <path d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.884.884M11.716 11.716l.884.884M3.4 12.6l.884-.884M11.716 4.284l.884-.884" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "Recados",
      href: `/box/${slug}/posts`,
      roles: ["owner", "partner", "manager"],
      icon: (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <rect x="1.5" y="1.5" width="13" height="13" rx="3" stroke="currentColor" strokeWidth="1.35" />
          <path d="M4.5 6h7M4.5 9h5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  const visibleMain = mainItems.filter((i) => i.roles.includes(role));
  const visibleDrawer = drawerItems.filter((i) => i.roles.includes(role));
  const isMenuActive = visibleDrawer.some((item) => pathname.startsWith(item.href));

  return (
    <>
      {visibleMain.map((item) => {
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

      {/* Hamburger */}
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

      {/* Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-border bg-bg-base px-6 pb-10 pt-5"
            >
              <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border" />

              <div className="mb-4 flex items-center justify-between">
                <p className="label-caps text-text-tertiary">Menu</p>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-input text-text-tertiary"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <nav className="space-y-1">
                {visibleDrawer.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 transition-colors duration-150",
                        isActive
                          ? "bg-bg-card font-medium text-text-primary"
                          : "text-text-secondary hover:bg-bg-card"
                      )}
                    >
                      <span className={cn("shrink-0", isActive ? "text-accent" : "text-text-tertiary")}>
                        {item.icon}
                      </span>
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
