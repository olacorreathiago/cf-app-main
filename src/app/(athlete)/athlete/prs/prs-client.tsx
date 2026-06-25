"use client";

import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getBenchmarkHistory } from "@/lib/athlete/prs-actions";
import type { BenchmarkWithPr, ResultHistoryEntry } from "@/lib/athlete/prs-actions";

// ── Constants ──────────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<string, string> = {
  girls:        "The Girls",
  heroes:       "Heroes",
  notables:     "Notables",
  games:        "Games",
  weightlifting:"Weightlifting",
  original:     "Da box",
};

const WOD_TYPE_COLOR: Record<string, string> = {
  AMRAP:      "bg-green-100 text-green-800 border-green-200",
  "For Time": "bg-blue-100 text-blue-800 border-blue-200",
  "For Load": "bg-amber-100 text-amber-800 border-amber-200",
  EMOM:       "bg-purple-100 text-purple-800 border-purple-200",
  Tabata:     "bg-teal-100 text-teal-800 border-teal-200",
  Custom:     "bg-border/60 text-text-secondary border-border",
};

// ── PR History Drawer ──────────────────────────────────────────────────────

function HistoryDrawer({ benchmark, onClose }: { benchmark: BenchmarkWithPr; onClose: () => void }) {
  const [history, setHistory] = useState<ResultHistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = benchmark.is_global
      ? { benchmarkSlug: benchmark.slug }
      : { wodId: benchmark.wod_id! };
    getBenchmarkHistory(params).then((h) => {
      setHistory(h);
      setLoading(false);
    });
  }, [benchmark.slug, benchmark.is_global, benchmark.wod_id]);

  const currentPr = benchmark.pr_rx ?? benchmark.pr_scaled;

  return (
    <>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        key="drawer"
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "rounded-t-3xl border-t border-border bg-bg-base px-6 pb-10 pt-5",
          "lg:bottom-0 lg:left-auto lg:right-0 lg:top-0 lg:w-[440px]",
          "lg:rounded-none lg:rounded-l-3xl lg:border-l lg:border-t-0",
          "lg:pb-10 lg:pt-8 lg:overflow-y-auto"
        )}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border lg:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border",
                WOD_TYPE_COLOR[benchmark.wod_type] ?? WOD_TYPE_COLOR.Custom
              )}>
                {benchmark.wod_type}
              </span>
              {!benchmark.is_global && (
                <span className="rounded-full bg-bg-input border border-border px-2 py-0.5 text-[10px] text-text-tertiary">Da box</span>
              )}
            </div>
            <h2 className="font-display text-2xl text-text-primary">{benchmark.name}</h2>
            {benchmark.description && (
              <p className="text-sm text-text-tertiary mt-1 leading-relaxed">{benchmark.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-bg-input text-text-tertiary hover:text-text-primary transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Current PR highlight */}
        {currentPr && (
          <div className="rounded-2xl bg-accent/8 border border-accent/20 px-5 py-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-text-tertiary mb-0.5">Personal Record</p>
              <p className="font-display text-3xl text-accent">{currentPr.score_display}</p>
            </div>
            <div className="text-right">
              {benchmark.pr_rx && (
                <div className="flex items-center gap-1.5 justify-end mb-1">
                  <span className="text-xs text-text-tertiary">{benchmark.pr_rx.score_display}</span>
                  <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">RX</span>
                </div>
              )}
              {benchmark.pr_scaled && (
                <div className="flex items-center gap-1.5 justify-end">
                  <span className="text-xs text-text-tertiary">{benchmark.pr_scaled.score_display}</span>
                  <span className="rounded-full bg-bg-input border border-border px-2 py-0.5 text-[10px] text-text-tertiary">Scaled</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* History */}
        <p className="label-caps text-text-tertiary mb-3">Histórico</p>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
          </div>
        ) : !history || history.length === 0 ? (
          <div className="rounded-2xl border border-border bg-bg-card px-5 py-8 text-center">
            <p className="text-sm text-text-tertiary">Ainda não registaste nenhum resultado.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
            {history.map((entry) => (
              <div key={entry.id} className={cn("px-4 py-3.5 flex items-center gap-3", entry.is_pr && "bg-amber-500/5")}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {entry.is_pr && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">PR</span>
                    )}
                    {entry.dnf ? (
                      <span className="text-sm font-semibold text-red-500">{entry.score_display ?? "DNF"}</span>
                    ) : (
                      <span className="text-sm font-semibold text-text-primary">{entry.score_display}</span>
                    )}
                    {entry.rx && (
                      <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">RX</span>
                    )}
                    {!entry.rx && !entry.dnf && (
                      <span className="rounded-full bg-bg-input border border-border px-2 py-0.5 text-[10px] text-text-tertiary">Scaled</span>
                    )}
                  </div>
                  {entry.notes && (
                    <p className="text-xs text-text-tertiary mt-0.5 truncate">{entry.notes}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-text-secondary">
                    {format(new Date(entry.class_date ?? entry.recorded_at), "d MMM yyyy", { locale: pt })}
                  </p>
                  {entry.box_name && (
                    <p className="text-[11px] text-text-tertiary mt-0.5">{entry.box_name}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </>
  );
}

// ── PR Row (list item) ─────────────────────────────────────────────────────

function PrRow({ benchmark, onClick }: { benchmark: BenchmarkWithPr; onClick: () => void }) {
  const pr = benchmark.pr_rx ?? benchmark.pr_scaled;
  const hasPr = Boolean(pr);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-4 py-4 hover:bg-bg-input/40 transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className={cn(
              "inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border",
              WOD_TYPE_COLOR[benchmark.wod_type] ?? WOD_TYPE_COLOR.Custom
            )}>
              {benchmark.wod_type}
            </span>
            {benchmark.category !== "original" && (
              <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border border-border bg-bg-base text-text-tertiary">
                {CATEGORY_LABEL[benchmark.category] ?? benchmark.category}
              </span>
            )}
            {!benchmark.is_global && (
              <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border border-border bg-bg-base text-text-tertiary">
                Da box
              </span>
            )}
          </div>

          {/* Name */}
          <p className="font-semibold text-text-primary truncate">{benchmark.name}</p>

          {/* PR meta */}
          {hasPr && (
            <div className="flex items-center gap-2 mt-1">
              {benchmark.pr_rx && (
                <span className="flex items-center gap-1 text-xs text-text-tertiary">
                  <span className="rounded-full bg-green-500/10 px-1.5 py-0 text-[10px] font-semibold text-green-600 dark:text-green-400">RX</span>
                  {benchmark.pr_rx.score_display}
                </span>
              )}
              {benchmark.pr_scaled && (
                <span className="flex items-center gap-1 text-xs text-text-tertiary">
                  <span className="rounded-full bg-bg-input border border-border px-1.5 py-0 text-[10px] text-text-tertiary">Scaled</span>
                  {benchmark.pr_scaled.score_display}
                </span>
              )}
              {pr && (
                <span className="text-xs text-text-tertiary">
                  {format(new Date(pr.achieved_at), "d MMM yy", { locale: pt })}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasPr ? (
            <div className="text-right">
              <p className="font-display text-xl text-text-primary leading-none">
                {pr!.score_display}
              </p>
            </div>
          ) : (
            <span className="text-xs text-text-tertiary border border-border rounded-full px-2 py-0.5">
              Por tentar
            </span>
          )}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-text-tertiary">
            <path d="M5 2l4 5-4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

const WOD_TYPES = ["AMRAP", "For Time", "For Load", "EMOM", "Tabata", "Custom"];
const WOD_CATEGORIES = ["girls", "heroes", "notables", "games", "weightlifting"];

interface Props {
  benchmarks: BenchmarkWithPr[];
}

export function PrsClient({ benchmarks }: Props) {
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [catFilter, setCatFilter]   = useState<string | null>(null);
  const [prFilter, setPrFilter]     = useState<"all" | "achieved" | "todo">("all");
  const [selectedBenchmark, setSelectedBenchmark] = useState<BenchmarkWithPr | null>(null);

  const filtered = useMemo(() => {
    return benchmarks.filter((b) => {
      if (prFilter === "achieved" && !b.pr_rx && !b.pr_scaled) return false;
      if (prFilter === "todo"     &&  (b.pr_rx || b.pr_scaled)) return false;
      if (typeFilter && b.wod_type !== typeFilter) return false;
      if (catFilter  && b.category !== catFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!b.name.toLowerCase().includes(q) && !(b.slug ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [benchmarks, prFilter, typeFilter, catFilter, search]);

  const achieved = benchmarks.filter((b) => b.pr_rx || b.pr_scaled);
  const hasActiveFilters = typeFilter || catFilter || search || prFilter !== "all";

  function clearFilters() {
    setTypeFilter(null);
    setCatFilter(null);
    setSearch("");
    setPrFilter("all");
  }

  return (
    <>
      {/* Status tabs */}
      <div className="flex items-center gap-1 mb-5 p-1 rounded-xl bg-bg-input border border-border w-fit">
        {(["all", "achieved", "todo"] as const).map((f) => {
          const labels = { all: "Todos", achieved: "Com PR", todo: "Por tentar" };
          const counts = {
            all: benchmarks.length,
            achieved: achieved.length,
            todo: benchmarks.length - achieved.length,
          };
          return (
            <button
              key={f}
              type="button"
              onClick={() => setPrFilter(f)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                prFilter === f
                  ? "bg-bg-base text-text-primary shadow-sm border border-border"
                  : "text-text-tertiary hover:text-text-secondary"
              )}
            >
              {labels[f]}
              {counts[f] > 0 && (
                <span className={cn("ml-1.5 tabular-nums", prFilter === f ? "text-text-tertiary" : "text-text-tertiary/60")}>
                  {counts[f]}
                </span>
              )}
            </button>
          );
        })}
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
          placeholder="Pesquisar benchmark…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(
            "h-10 w-full rounded-xl border border-border bg-bg-input pl-9 pr-4",
            "text-sm text-text-primary placeholder:text-text-tertiary",
            "focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-colors"
          )}
        />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {/* Type chips */}
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

        <div className="w-px bg-border self-stretch mx-1" />

        {/* Category chips */}
        {WOD_CATEGORIES.map((c) => (
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
            {CATEGORY_LABEL[c]}
          </button>
        ))}

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
        <div className="rounded-2xl border border-border bg-bg-card px-5 py-10 text-center">
          <p className="text-sm text-text-secondary mb-1">
            {benchmarks.length === 0 ? "Nenhum benchmark disponível" : "Nenhum resultado para os filtros aplicados"}
          </p>
          {benchmarks.length > 0 && (
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
        <>
          <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
            {filtered.map((b) => (
              <PrRow key={b.slug ?? b.wod_id} benchmark={b} onClick={() => setSelectedBenchmark(b)} />
            ))}
          </div>
          {filtered.length < benchmarks.length && (
            <p className="text-xs text-text-tertiary text-center py-2">
              {filtered.length} de {benchmarks.length} benchmarks
            </p>
          )}
        </>
      )}

      {/* History drawer */}
      <AnimatePresence>
        {selectedBenchmark && (
          <HistoryDrawer
            benchmark={selectedBenchmark}
            onClose={() => setSelectedBenchmark(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
