"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Início",
    href: "/athlete",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M8 18v-6h4v6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Perfil",
    href: "/athlete/profile",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="7" r="3.5" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M3 17c0-3.866 3.134-7 7-7s7 3.134 7 7"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

interface AthleteNavProps {
  desktop?: boolean;
}

export function AthleteNav({ desktop = false }: AthleteNavProps) {
  const pathname = usePathname();

  if (desktop) {
    return (
      <div className="flex items-center gap-1">
        {navItems.map((item) => {
          const isActive = item.href === "/athlete" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm transition-colors duration-150",
                isActive ? "bg-bg-card text-text-primary font-medium" : "text-text-tertiary hover:text-text-secondary"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {navItems.map((item) => {
        const isActive = item.href === "/athlete" ? pathname === item.href : pathname.startsWith(item.href);
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
    </>
  );
}
