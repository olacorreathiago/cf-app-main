"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { WodCard } from "./wod-card";
import { WodDrawer } from "./wod-drawer";
import { WOD_TYPES, WOD_CATEGORIES } from "@/schemas/wod";
import type { Wod, BenchmarkWod } from "@/types";
import type { WodType, WodCategory } from "@/schemas/wod";

type StatusFilter = "published" | "draft" | "box";

const STATUS_LABELS: Record<StatusFilter, string> = {
  published: "Publicados",
  draft:     "Rascunhos",
  box:       "Workouts da Box",
};

const CATEGORY_LABELS: Record<WodCategory, string> = {
  girls:        "The Girls",
  heroes:       "Heroes",
  notables:     "Notables",
  games:        "Games",
  weightlifting:"Weightlifting",
  endurance:    "Endurance",
  gymnastics:   "Gymnastics",
  original:     "Original",
};

interface Props {
  wods: Wod[];
  benchmarks: BenchmarkWod[];
  boxId: string;
}

export function WodList({ wods, benchmarks, boxId }: Props) {
  const [status, setStatus]             = useState<StatusFilter>("published");
  const [typeFilter, setTypeFilter]     = useState<WodType | null>(null);
  const [catFilter, setCatFilter]       = useState<WodCategory | null>(null);
  const [dateFilter, setDateFilter]     = useState<string>("");
  const [search, setSearch]             = useState("");
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [editingWod, setEditingWod]     = useState<Wod | undefined>(undefined);

  function openCreate() { setEditingWod(undefined); setDrawerOpen(true); }
  function openEdit(wod: Wod) { setEditingWod(wod); setDrawerOpen(true); }
  function closeDrawer() { setDrawerOpen(false); setEditingWod(undefined); }

  const filtered = useMemo(() => {
    return wods.filter((w) => {
      if (status === "published" && !w.published_at) return false;
      if (status === "draft"     &&  w.published_at) return false;
      if (status === "box"       && w.category !== "original") return false;
      if (typeFilter && w.type !== typeFilter) return false;
      if (catFilter  && w.category !== catFilter) return false;
      if (dateFilter && w.scheduled_for !== dateFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const inTitle = w.title.toLowerCase().includes(q);
        const inBenchmark = w.benchmark_slug?.includes(q) ?? false;
        if (!inTitle && !inBenchmark) return false;
      }
      return true;
    });
  }, [wods, status, typeFilter, catFilter, dateFilter, search]);

  const statusCounts: Record<StatusFilter, number> = {
    published: wods.filter((w) => w.published_at).length,
    draft:     wods.filter((w) => !w.published_at).length,
    box:       wods.filter((w) => w.category === "original").length,
  };

  const hasActiveFilters = typeFilter || catFilter || dateFilter || search;

  function clearFilters() {
    setTypeFilter(null);
    setCatFilter(null);
    setDateFilter("");
    setSearch("");
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl uppercase text-text-primary">WODs</h1>
          <p className="label-caps mt-1 text-text-tertiary">
            Cria e publica os treinos da tua box
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-fg shadow-sm hover:opacity-90 transition-opacity shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Novo WOD
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-5 p-1 rounded-xl bg-bg-input border border-border w-fit">
        {(["published", "draft", "box"] as StatusFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setStatus(f)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              status === f
                ? "bg-bg-base text-text-primary shadow-sm border border-border"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            {STATUS_LABELS[f]}
            {statusCounts[f] > 0 && (
              <span className={cn(
                "ml-1.5 tabular-nums",
                status === f ? "text-text-tertiary" : "text-text-tertiary/60"
              )}>
                {statusCounts[f]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
        >
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          placeholder="Pesquisar por título…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(
            "h-10 w-full rounded-xl border border-border bg-bg-input pl-9 pr-4",
            "text-sm text-text-primary placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-colors"
          )}
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2 mb-5">
        {/* Type */}
        {WOD_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTypeFilter(typeFilter === t ? null : t)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-all",
              typeFilter === t
                ? "border-accent bg-accent text-accent-fg shadow-sm"
                : "border-border bg-bg-input text-text-tertiary hover:border-accent/40 hover:text-text-secondary"
            )}
          >
            {t}
          </button>
        ))}

        {/* Separator */}
        <div className="w-px bg-border self-stretch mx-1" />

        {/* Category — only non-original */}
        {WOD_CATEGORIES.filter((c) => c !== "original").map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCatFilter(catFilter === c ? null : c)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold transition-all",
              catFilter === c
                ? "border-accent bg-accent text-accent-fg shadow-sm"
                : "border-border bg-bg-input text-text-tertiary hover:border-accent/40 hover:text-text-secondary"
            )}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}

        {/* Date */}
        <div className="relative">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className={cn(
              "h-7 rounded-full border px-3 text-xs font-semibold transition-all",
              "focus:outline-none focus:ring-2 focus:ring-accent/30",
              dateFilter
                ? "border-accent bg-accent text-accent-fg"
                : "border-border bg-bg-input text-text-tertiary hover:border-accent/40"
            )}
          />
        </div>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-full border border-border bg-bg-input px-3 py-1 text-xs text-text-tertiary hover:text-red-500 hover:border-red-200 transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-card px-4 py-10 text-center">
          <p className="text-sm text-text-secondary mb-1">
            {wods.length === 0 ? "Ainda sem WODs" : "Nenhum WOD corresponde aos filtros"}
          </p>
          {wods.length === 0 ? (
            <p className="text-xs text-text-tertiary">
              Clica em{" "}
              <button
                type="button"
                onClick={openCreate}
                className="underline hover:text-text-secondary transition-colors"
              >
                Novo WOD
              </button>{" "}
              para começar.
            </p>
          ) : (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-text-tertiary underline hover:text-text-secondary transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((wod) => (
            <WodCard key={wod.id} wod={wod} boxId={boxId} onEdit={openEdit} />
          ))}
          {filtered.length < wods.length && (
            <p className="text-xs text-text-tertiary text-center py-2">
              {filtered.length} de {wods.length} WODs
            </p>
          )}
        </div>
      )}

      <WodDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        boxId={boxId}
        wod={editingWod}
        benchmarks={benchmarks}
      />
    </>
  );
}
