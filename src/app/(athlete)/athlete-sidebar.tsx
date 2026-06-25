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
  locked?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    label: "Principal",
    items: [
      {
        label: "Início",
        href: "/athlete",
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 8.5L8 2l6 6.5V14a.6.6 0 01-.6.6H2.6A.6.6 0 012 14V8.5z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
            <path d="M6 14.6V9.4h4v5.2" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Treino",
    items: [
      {
        label: "Aulas",
        href: "/athlete/classes",
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.35" />
            <path d="M5 1.5v2M11 1.5v2M1.5 6.5h13" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        label: "Resultados",
        href: "/athlete/results",
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.35" />
            <path d="M5 10.5V8M8 10.5V5.5M11 10.5V7" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        label: "PRs",
        href: "/athlete/prs",
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.35" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Comunidade",
    items: [
      {
        label: "Leaderboard",
        href: "/athlete/leaderboard",
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 13V8M8 13V4M13 13V6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        label: "Feed",
        href: "/athlete/feed",
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1.5" y="1.5" width="13" height="13" rx="3" stroke="currentColor" strokeWidth="1.35" />
            <path d="M4.5 6h7M4.5 9h5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        label: "Eventos",
        href: "/athlete/events",
        locked: true,
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.35" />
            <path d="M5 1.5v2M11 1.5v2M1.5 6.5h13" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
            <path d="M5 9.5h2M9 9.5h2M5 12h2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
  },
];

const bottomItems: NavItem[] = [
  {
    label: "Perfil",
    href: "/athlete/profile",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.35" />
        <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function AthleteSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-1 flex-col overflow-y-auto py-3">
      {sections.map((section) => (
        <div key={section.label} className="mb-1">
          <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-tertiary/60">
            {section.label}
          </p>
          {section.items.map((item) => (
            <NavItemRow key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      ))}

      <div className="mt-auto border-t border-border pt-2">
        {bottomItems.map((item) => (
          <NavItemRow key={item.href} item={item} pathname={pathname} />
        ))}
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

function NavItemRow({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive =
    item.href === "/athlete" ? pathname === "/athlete" : pathname.startsWith(item.href);

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

// ── Mobile bottom nav ───────────────────────────────────────────────────────

const mobileMainItems: NavItem[] = [
  {
    label: "Início",
    href: "/athlete",
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 8.5L8 2l6 6.5V14a.6.6 0 01-.6.6H2.6A.6.6 0 012 14V8.5z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
        <path d="M6 14.6V9.4h4v5.2" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Aulas",
    href: "/athlete/classes",
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.35" />
        <path d="M5 1.5v2M11 1.5v2M1.5 6.5h13" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Leaderboard",
    href: "/athlete/leaderboard",
    icon: (
      <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M3 13V8M8 13V4M13 13V6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      </svg>
    ),
  },
];

// Items shown inside the hamburger drawer
const drawerNavItems: NavItem[] = [
  {
    label: "Resultados",
    href: "/athlete/results",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.35" />
        <path d="M5 10.5V8M8 10.5V5.5M11 10.5V7" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "PRs",
    href: "/athlete/prs",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.35" />
      </svg>
    ),
  },
  {
    label: "Feed",
    href: "/athlete/feed",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1.5" y="1.5" width="13" height="13" rx="3" stroke="currentColor" strokeWidth="1.35" />
        <path d="M4.5 6h7M4.5 9h5" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Perfil",
    href: "/athlete/profile",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.35" />
        <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Eventos",
    href: "/athlete/events",
    locked: true,
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1.5" y="2.5" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.35" />
        <path d="M5 1.5v2M11 1.5v2M1.5 6.5h13" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
        <path d="M5 9.5h2M9 9.5h2M5 12h2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function AthleteBottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Hamburger is "active" when current path is one of the drawer items
  const isMenuActive = drawerNavItems.some(
    (item) => !item.locked && pathname.startsWith(item.href)
  );

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

      {/* Hamburger button */}
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

      {/* Hamburger drawer */}
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
                {drawerNavItems.map((item) => {
                  if (item.locked) {
                    return (
                      <div
                        key={item.href}
                        className="flex cursor-not-allowed items-center gap-3 rounded-xl px-4 py-3 opacity-35"
                      >
                        <span className="shrink-0 text-text-tertiary">{item.icon}</span>
                        <span className="text-sm text-text-tertiary">{item.label}</span>
                        <span className="ml-auto rounded-full bg-bg-input px-2 py-0.5 text-[10px] text-text-tertiary">
                          Em breve
                        </span>
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

              <div className="mt-6 border-t border-border pt-4">
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-text-tertiary transition-colors duration-150 hover:bg-bg-card hover:text-text-primary"
                  >
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
                      <path d="M10.5 11L14 8l-3.5-3M14 8H6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Sair
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
