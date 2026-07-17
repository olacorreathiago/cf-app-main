"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  getBenchmarkLeaderboard,
  getDailyLeaderboard,
} from "@/lib/athlete/leaderboard-actions";
import type {
  LeaderboardBenchmarkItem,
  LeaderboardEntry,
  BenchmarkLeaderboard,
  DailyLeaderboardWod,
} from "@/lib/athlete/leaderboard-actions";

const CATEGORY_LABEL: Record<string, string> = {
  girls: "Girls",
  heroes: "Heroes",
  notables: "Notables",
  games: "Games",
  weightlifting: "Weightlifting",
  endurance: "Endurance",
  gymnastics: "Gymnastics",
  original: "Original",
};

function Avatar({ name, url, isMe }: { name: string; url: string | null; isMe: boolean }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className={cn("h-8 w-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-semibold shrink-0",
      isMe ? "ring-2 ring-accent" : "",
      !url ? "bg-accent/20 text-accent" : ""
    )}>
      {url ? <img src={url} alt={name} className="h-full w-full object-cover" /> : initial}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-base">🥇</span>;
  if (rank === 2) return <span className="text-base">🥈</span>;
  if (rank === 3) return <span className="text-base">🥉</span>;
  return <span className="w-6 text-center text-xs font-semibold text-text-tertiary">{rank}</span>;
}

function EntryRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3", entry.is_me && "bg-accent/5")}>
      <RankBadge rank={entry.rank} />
      <Avatar name={entry.display_name} url={entry.avatar_url} isMe={entry.is_me} />
      <p className={cn("flex-1 text-sm", entry.is_me ? "font-semibold text-text-primary" : "text-text-secondary")}>
        {entry.display_name}
        {entry.is_me && <span className="ml-1.5 text-[10px] text-accent font-normal">Tu</span>}
      </p>
      <p className="text-sm font-semibold text-text-primary">{entry.score_display.split(" · ")[0]}</p>
    </div>
  );
}

function EntriesSection({ title, entries }: { title: string; entries: LeaderboardEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div>
      <p className="label-caps text-text-tertiary px-4 pt-3 pb-1">{title}</p>
      {entries.map((e) => <EntryRow key={`${title}-${e.user_id}`} entry={e} />)}
    </div>
  );
}

// ── Benchmark tab ───────────────────────────────────────────────────────────

function BenchmarkTab({ benchmarkWods, myUserId }: { benchmarkWods: LeaderboardBenchmarkItem[]; myUserId: string }) {
  const [selectedWodId, setSelectedWodId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<BenchmarkLeaderboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState("__all__");

  const categories = ["__all__", ...new Set(benchmarkWods.map((w) => w.category))];
  const filtered = filterCategory === "__all__" ? benchmarkWods : benchmarkWods.filter((w) => w.category === filterCategory);

  async function selectWod(wod: LeaderboardBenchmarkItem) {
    if (selectedWodId === wod.wod_id) {
      setSelectedWodId(null);
      setLeaderboard(null);
      return;
    }
    setSelectedWodId(wod.wod_id);
    setLoading(true);
    try {
      const data = await getBenchmarkLeaderboard(wod.wod_id);
      setLeaderboard(data.leaderboard);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilterCategory(c)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filterCategory === c
                ? "bg-accent text-accent-fg"
                : "bg-bg-card border border-border text-text-secondary hover:text-text-primary"
            )}
          >
            {c === "__all__" ? "Todos" : CATEGORY_LABEL[c] ?? c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-bg-card px-5 py-8 text-center">
          <p className="text-sm text-text-tertiary">Nenhum benchmark disponível.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((wod) => {
            const isSelected = selectedWodId === wod.wod_id;
            return (
              <div key={wod.wod_id} className="rounded-2xl border border-border bg-bg-card overflow-hidden">
                <button
                  onClick={() => selectWod(wod)}
                  className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-bg-input/50 transition-colors"
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold text-text-primary">{wod.title}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">{CATEGORY_LABEL[wod.category] ?? wod.category}</p>
                  </div>
                  <svg
                    width="14" height="14" viewBox="0 0 14 14" fill="none"
                    className={cn("text-text-tertiary transition-transform", isSelected && "rotate-180")}
                  >
                    <path d="M2 4l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {isSelected && (
                  <div className="border-t border-border">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
                      </div>
                    ) : !leaderboard || (leaderboard.entries_rx.length + leaderboard.entries_scaled.length === 0) ? (
                      <p className="text-center text-sm text-text-tertiary py-6">Ainda sem resultados partilhados.</p>
                    ) : (
                      <div className="divide-y divide-border">
                        <EntriesSection title="RX" entries={leaderboard.entries_rx} />
                        <EntriesSection title="Scaled" entries={leaderboard.entries_scaled} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Daily tab ───────────────────────────────────────────────────────────────

function WodDetailPopover({ wod, onClose }: { wod: DailyLeaderboardWod; onClose: () => void }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.15 }}
        className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-border bg-bg-base shadow-xl p-4 space-y-3"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-text-primary">{wod.wod_title}</p>
          <button onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded-full bg-bg-input text-text-tertiary hover:text-text-primary">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        {wod.description && (
          <p className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed">{wod.description}</p>
        )}

        {wod.time_cap_minutes && (
          <p className="text-xs text-text-tertiary">Time cap: {wod.time_cap_minutes} min</p>
        )}

        {wod.movements.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">Exercícios</p>
            {wod.movements.map((m, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg-card px-3 py-2">
                <p className="text-xs font-medium text-text-primary">{m.name}</p>
                {(m.rx_weight || m.scaled_weight) && (
                  <p className="text-[11px] text-text-tertiary shrink-0">
                    {m.rx_weight && <span>RX: {m.rx_weight}</span>}
                    {m.rx_weight && m.scaled_weight && <span className="mx-1">·</span>}
                    {m.scaled_weight && <span>Sc: {m.scaled_weight}</span>}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {!wod.description && wod.movements.length === 0 && (
          <p className="text-xs text-text-tertiary text-center py-2">Sem detalhes disponíveis.</p>
        )}
      </motion.div>
    </>
  );
}

const DAILY_SECTIONS: { key: "men_rx" | "women_rx" | "men_scaled" | "women_scaled"; label: string }[] = [
  { key: "men_rx",      label: "Homens RX" },
  { key: "women_rx",    label: "Mulheres RX" },
  { key: "men_scaled",  label: "Homens Scaled" },
  { key: "women_scaled",label: "Mulheres Scaled" },
];

function WodDailyCard({ wod }: { wod: DailyLeaderboardWod }) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  return (
    <div className="relative rounded-2xl border border-border bg-bg-card overflow-visible">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-text-primary">{wod.wod_title}</p>
          <p className="text-xs text-text-tertiary mt-0.5">{wod.wod_type}</p>
        </div>
        <button
          onClick={() => setPopoverOpen((v) => !v)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-input text-text-tertiary hover:text-text-primary transition-colors"
          aria-label="Ver detalhes do WOD"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M7 6.5v4M7 4.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <AnimatePresence>
          {popoverOpen && <WodDetailPopover wod={wod} onClose={() => setPopoverOpen(false)} />}
        </AnimatePresence>
      </div>
      <div className="divide-y divide-border">
        {DAILY_SECTIONS.map((s) =>
          wod[s.key].length > 0 ? (
            <EntriesSection key={s.key} title={s.label} entries={wod[s.key]} />
          ) : null
        )}
      </div>
    </div>
  );
}

function DailyTab({ myUserId }: { myUserId: string }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(today);
  const [wods, setWods] = useState<DailyLeaderboardWod[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { load(today); }, []);

  async function load(d: string) {
    setDate(d);
    setLoading(true);
    try {
      const data = await getDailyLeaderboard(d);
      setWods(data.wods);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  const totalAthletes = wods.reduce((sum, w) => {
    const ids = new Set([
      ...w.men_rx.map((e) => e.user_id),
      ...w.women_rx.map((e) => e.user_id),
      ...w.men_scaled.map((e) => e.user_id),
      ...w.women_scaled.map((e) => e.user_id),
    ]);
    return sum + ids.size;
  }, 0);

  return (
    <div className="space-y-4">
      {/* Date picker */}
      <div>
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => load(e.target.value)}
          className="rounded-xl border border-border bg-bg-input px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
        </div>
      )}

      {loaded && !loading && wods.length === 0 && (
        <div className="rounded-2xl border border-border bg-bg-card px-5 py-8 text-center">
          <p className="text-sm text-text-tertiary">Sem resultados partilhados para este dia.</p>
        </div>
      )}

      {loaded && !loading && wods.map((wod) => {
        const hasAny = DAILY_SECTIONS.some((s) => wod[s.key].length > 0);
        if (!hasAny) return null;
        return (
          <WodDailyCard key={wod.wod_id} wod={wod} />
        );
      })}

      {/* Stats */}
      {loaded && !loading && (
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="rounded-2xl border border-border bg-bg-card p-4 space-y-1">
            <p className="text-xs text-text-tertiary">Atletas com resultado</p>
            <p className="text-2xl font-display text-text-primary">
              {totalAthletes > 0 ? totalAthletes : "—"}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-bg-card p-4 space-y-1 opacity-40">
            <p className="text-xs text-text-tertiary">PRs hoje</p>
            <p className="text-2xl font-display text-text-primary">—</p>
            <p className="text-[10px] text-text-tertiary">Em breve</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

interface Props {
  benchmarkWods: LeaderboardBenchmarkItem[];
  myUserId: string;
}

export function LeaderboardClient({ benchmarkWods, myUserId }: Props) {
  const [tab, setTab] = useState<"daily" | "benchmarks">("daily");

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex rounded-xl bg-bg-input p-1 gap-1">
        {(["daily", "benchmarks"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors",
              tab === t ? "bg-bg-base text-text-primary shadow-sm" : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            {t === "daily" ? "Diário" : "Benchmarks da Box"}
          </button>
        ))}
      </div>

      {tab === "daily" ? (
        <DailyTab myUserId={myUserId} />
      ) : (
        <BenchmarkTab benchmarkWods={benchmarkWods} myUserId={myUserId} />
      )}
    </div>
  );
}
