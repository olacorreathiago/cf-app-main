"use client";

import { useState, useRef, useEffect } from "react";
import { switchActiveBox } from "./athlete-actions";
import type { AthleteBox } from "@/lib/athlete/dashboard-actions";
import { cn } from "@/lib/utils";

interface BoxSelectorProps {
  boxes: AthleteBox[];
  activeBox: AthleteBox | null;
}

export function BoxSelector({ boxes, activeBox }: BoxSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!activeBox) {
    return (
      <div className="px-4 py-3 border-b border-border">
        <p className="text-xs text-text-tertiary">Sem box activa</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative px-3 py-3 border-b border-border">
      <button
        onClick={() => boxes.length > 1 && setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-150",
          boxes.length > 1 ? "hover:bg-bg-card cursor-pointer" : "cursor-default"
        )}
      >
        {/* Box icon / logo */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-fg">
          {activeBox.logo_url ? (
            <img src={activeBox.logo_url} alt={activeBox.name} className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="1.5" y="1.5" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M1.5 5.5h11" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-text-primary truncate">{activeBox.name}</p>
          <p className="text-[10px] text-text-tertiary capitalize">{activeBox.role}</p>
        </div>

        {boxes.length > 1 && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className={cn("shrink-0 text-text-tertiary transition-transform duration-150", open && "rotate-180")}
          >
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {open && boxes.length > 1 && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 rounded-xl border border-border bg-bg-card shadow-lg py-1 overflow-hidden">
          {boxes.map((box) => (
            <form key={box.id} action={switchActiveBox.bind(null, box.id)}>
              <button
                type="submit"
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors duration-150 hover:bg-bg-base",
                  box.id === activeBox.id ? "text-text-primary font-medium" : "text-text-secondary"
                )}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                  <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                    <rect x="1.5" y="1.5" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M1.5 5.5h11" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
                <span className="truncate">{box.name}</span>
                {box.id === activeBox.id && (
                  <svg className="ml-auto shrink-0 text-accent" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
