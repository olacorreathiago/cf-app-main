"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { recordWodResult, updateWodResult } from "@/lib/athlete/wod-result-actions";
import { PrimaryButton, FieldInput } from "@/components/shared";
import type { AthleteDashboardWod } from "@/lib/athlete/dashboard-actions";

interface Props {
  wod: AthleteDashboardWod;
  boxId: string;
  classId?: string | null;
  open: boolean;
  onClose: () => void;
  onSaved?: (display: string, rx: boolean, isPR: boolean) => void;
}

type WeightUnit = "kg" | "lb";
type SetRow = { reps: string; weight: string };
type RoundTimeRow = { mins: string; secs: string };
type Tab = "resultado" | "detalhes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSeconds(mins: string, secs: string): number {
  return parseInt(mins || "0", 10) * 60 + parseInt(secs || "0", 10);
}

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Score builders
// ---------------------------------------------------------------------------

function buildAmrap(rounds: string, partialReps: string) {
  const r = parseInt(rounds || "0", 10);
  const p = parseInt(partialReps || "0", 10);
  if (isNaN(r) || isNaN(p) || (r === 0 && p === 0)) return null;
  return { display: `${r} rondas + ${p} reps`, value: r + p / 1000, scoreType: "rounds+reps" as const };
}

function buildForTime(mins: string, secs: string, dnf: boolean, dnfReps: string, timeCap: number | null) {
  if (dnf) {
    const reps = parseInt(dnfReps || "0", 10);
    // store reps as score_value so the PR (unit="reps") has the correct value
    return { display: `DNF – ${reps} reps`, value: reps, scoreType: "time" as const, isDnf: true };
  }
  const total = parseSeconds(mins, secs);
  if (total === 0) return null;
  return { display: formatSeconds(total), value: total, scoreType: "time" as const, isDnf: false };
}

function buildForLoad(sets: SetRow[], unit: WeightUnit) {
  const parsed = sets.map((s, i) => ({
    set: i + 1,
    reps: parseInt(s.reps || "0", 10),
    weight: parseFloat(s.weight || "0"),
  }));
  const weights = parsed.map((s) => s.weight).filter((w) => w > 0);
  if (weights.length === 0) return null;
  const maxWeight = Math.max(...weights);
  const label = parsed.map((s) => `${s.weight}${unit}`).join(" / ");
  return { display: `${maxWeight} ${unit} · ${label}`, shortDisplay: `${maxWeight} ${unit}`, value: maxWeight, scoreType: "weight" as const, setsData: parsed };
}

function buildEmom(count: number, repsArr: string[]) {
  const parsed = repsArr.slice(0, count).map((r, i) => ({ round: i + 1, reps: parseInt(r || "0", 10) }));
  const total = parsed.reduce((sum, r) => sum + r.reps, 0);
  if (total === 0) return null;
  return {
    display: `${total} reps (${parsed.map((r) => r.reps).join("/")})`,
    shortDisplay: `${total} reps`,
    value: total,
    scoreType: "reps" as const,
    setsData: parsed,
  };
}

function buildRoundReps(repsPerRound: string[], count: number) {
  const filled = repsPerRound.slice(0, count)
    .map((r, i) => ({ round: i + 1, reps: parseInt(r, 10) || 0 }))
    .filter((r) => r.reps > 0);
  if (filled.length === 0) return null;
  const total = filled.reduce((sum, r) => sum + r.reps, 0);
  const label = filled.map((r) => r.reps).join(" / ");
  return {
    display: `${total} reps · ${label}`,
    shortDisplay: `${total} reps`,
    value: total,
    scoreType: "round-reps" as const,
    setsData: filled,
  };
}

function buildRoundTimes(rows: RoundTimeRow[], count: number, scoreType: "round-best" | "round-total" | "round-worst") {
  const parsed = rows.slice(0, count).map((r, i) => ({ round: i + 1, time_secs: parseSeconds(r.mins, r.secs) }));
  const filled = parsed.filter((r) => r.time_secs > 0);
  if (filled.length === 0) return null;
  const times = filled.map((r) => r.time_secs);
  const label = filled.map((r) => formatSeconds(r.time_secs)).join(" / ");
  if (scoreType === "round-best") {
    const best = Math.min(...times);
    return { display: `Melhor: ${formatSeconds(best)} · ${label}`, shortDisplay: formatSeconds(best), value: best, scoreType: "round-best" as const, setsData: filled };
  } else if (scoreType === "round-worst") {
    const worst = Math.max(...times);
    return { display: `Pior: ${formatSeconds(worst)} · ${label}`, shortDisplay: formatSeconds(worst), value: worst, scoreType: "round-worst" as const, setsData: filled };
  } else {
    const total = times.reduce((sum, t) => sum + t, 0);
    return { display: `Total: ${formatSeconds(total)} · ${label}`, shortDisplay: formatSeconds(total), value: total, scoreType: "round-total" as const, setsData: filled };
  }
}

function buildCustom(
  scoreType: string,
  mins: string, secs: string, reps: string,
  weight: string, unit: WeightUnit,
  rounds: string, partialReps: string,
  distance: string, distUnit: string,
) {
  switch (scoreType) {
    case "time": { const total = parseSeconds(mins, secs); if (total === 0) return null; return { display: formatSeconds(total), value: total }; }
    case "reps": { const r = parseInt(reps, 10); if (isNaN(r) || r < 0) return null; return { display: `${r} reps`, value: r }; }
    case "weight": { const w = parseFloat(weight); if (isNaN(w) || w <= 0) return null; return { display: `${w} ${unit}`, value: w }; }
    case "rounds+reps": { const ro = parseInt(rounds || "0", 10), pr = parseInt(partialReps || "0", 10); if (isNaN(ro) || isNaN(pr)) return null; return { display: `${ro} rondas + ${pr} reps`, value: ro + pr / 1000 }; }
    case "distance": { const d = parseFloat(distance); if (isNaN(d) || d <= 0) return null; return { display: `${d} ${distUnit}`, value: d }; }
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TimeInput({ label, mins, secs, onMins, onSecs }: {
  label?: string; mins: string; secs: string;
  onMins: (v: string) => void; onSecs: (v: string) => void;
}) {
  return (
    <div>
      {label && <p className="text-sm font-medium text-text-secondary mb-2">{label}</p>}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <FieldInput type="number" min={0} max={999} placeholder="00" value={mins} onChange={(e) => onMins(e.target.value)} />
        </div>
        <span className="text-xl font-semibold text-text-tertiary">:</span>
        <div className="flex-1">
          <FieldInput type="number" min={0} max={59} placeholder="00" value={secs} onChange={(e) => onSecs(e.target.value)} />
        </div>
        <span className="text-sm text-text-tertiary whitespace-nowrap">min : seg</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WodResultDrawer({ wod, boxId, classId, open, onClose, onSaved }: Props) {
  const [tab, setTab] = useState<Tab>("resultado");
  const [rx, setRx] = useState(true);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // AMRAP
  const [amrapRounds, setAmrapRounds] = useState("");
  const [amrapReps, setAmrapReps] = useState("");

  // For Time
  const [ftMins, setFtMins] = useState("");
  const [ftSecs, setFtSecs] = useState("");
  const [dnf, setDnf] = useState(false);
  const [dnfReps, setDnfReps] = useState("");

  // For Load — fixed by manager
  const numSets = wod.result_sets ?? 3;
  const defaultReps = String(wod.result_reps_per_set ?? "");
  const [sets, setSets] = useState<SetRow[]>(() =>
    Array.from({ length: numSets }, () => ({ reps: defaultReps, weight: "" }))
  );
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");

  // EMOM — fixed by manager (time_cap_minutes)
  const emomCount = wod.time_cap_minutes ?? 10;
  const [emomReps, setEmomReps] = useState<string[]>(() =>
    Array.from({ length: emomCount }, () => "")
  );

  // Round-based — fixed by manager (result_sets)
  const numRounds = wod.result_sets ?? 5;
  const [roundRows, setRoundRows] = useState<RoundTimeRow[]>(() =>
    Array.from({ length: numRounds }, () => ({ mins: "", secs: "" }))
  );

  // Custom
  const [cMins, setCMins] = useState(""); const [cSecs, setCSecs] = useState("");
  const [cReps, setCReps] = useState("");
  const [cWeight, setCWeight] = useState(""); const [cWeightUnit, setCWeightUnit] = useState<WeightUnit>("kg");
  const [cRounds, setCRounds] = useState(""); const [cPartialReps, setCPartialReps] = useState("");
  const [cDistance, setCDistance] = useState(""); const [cDistUnit, setCDistUnit] = useState("m");

  const [updating, setUpdating] = useState(false);
  const [showPrBanner, setShowPrBanner] = useState(false);

  // Round-reps — reps por ronda (usa result_sets como nº de rondas)
  const numRoundReps = wod.result_sets ?? 5;
  const [roundRepsRows, setRoundRepsRows] = useState<string[]>(() =>
    Array.from({ length: numRoundReps }, () => "")
  );

  const isRoundScoreType = wod.score_type === "round-best" || wod.score_type === "round-total" || wod.score_type === "round-worst";
  const isRoundReps = wod.score_type === "round-reps";
  const isCustomType = !["AMRAP", "For Time", "For Load", "EMOM"].includes(wod.type) && !isRoundScoreType && !isRoundReps;
  const repsLabel = wod.result_reps_per_set ? `${wod.result_reps_per_set} reps` : "Reps";
  const hasResult = !!wod.my_result;
  const showForm = !hasResult || updating;

  function handleSubmit() {
    setError(null);
    let result: { display: string; shortDisplay?: string; value: number | null; scoreType?: string; setsData?: unknown[]; isDnf?: boolean } | null = null;

    if (wod.type === "AMRAP") result = buildAmrap(amrapRounds, amrapReps);
    else if (wod.type === "For Time") result = buildForTime(ftMins, ftSecs, dnf, dnfReps, wod.time_cap_minutes);
    else if (wod.type === "For Load") result = buildForLoad(sets, weightUnit);
    else if (wod.type === "EMOM") result = buildEmom(emomCount, emomReps);
    else if (isRoundScoreType) result = buildRoundTimes(roundRows, numRounds, wod.score_type as "round-best" | "round-total" | "round-worst");
    else if (isRoundReps) result = buildRoundReps(roundRepsRows, numRoundReps);
    else result = buildCustom(wod.score_type, cMins, cSecs, cReps, cWeight, cWeightUnit, cRounds, cPartialReps, cDistance, cDistUnit);

    if (!result) { setError("Preenche o resultado antes de guardar."); return; }

    startTransition(async () => {
      const scoreType = (result!.scoreType ?? wod.score_type) as
        "time" | "reps" | "weight" | "rounds+reps" | "distance" | "round-best" | "round-total" | "round-worst" | "round-reps";

      const payload = {
        wod_id: wod.id, box_id: boxId, class_id: classId ?? null,
        score_type: scoreType,
        score_value: result!.value,
        score_display: result!.shortDisplay ?? result!.display,
        rx, dnf: result!.isDnf ?? false,
        notes: notes || undefined,
        sets_data: result!.setsData as Parameters<typeof recordWodResult>[0]["sets_data"],
      };

      const res = updating && wod.my_result
        ? await updateWodResult({ ...payload, result_id: wod.my_result.id })
        : await recordWodResult(payload);

      if (res.error) { setError(res.error); return; }
      const isPR = res.isPR ?? false;
      onSaved?.(result!.shortDisplay ?? result!.display, rx, isPR);
      if (isPR) {
        confetti({ particleCount: 140, spread: 90, origin: { y: 0.55 } });
        setShowPrBanner(true);
        setTimeout(() => { setShowPrBanner(false); onClose(); }, 2500);
      } else {
        onClose();
      }
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-3xl border-t border-border bg-bg-base pt-5 lg:bottom-0 lg:left-auto lg:right-0 lg:top-0 lg:w-[440px] lg:rounded-none lg:rounded-l-3xl lg:border-l lg:border-t-0 lg:pt-8"
            style={{ maxHeight: "92dvh" }}
          >
            {/* Drag handle */}
            <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-border lg:hidden" />

            {/* Header */}
            <div className="shrink-0 px-6 mb-5">
              <p className="label-caps text-text-tertiary mb-1">Registar resultado</p>
              <h2 className="font-display text-2xl text-text-primary">{wod.title}</h2>
              <p className="text-sm text-text-tertiary mt-0.5">{wod.type}</p>
            </div>

            {/* Tabs */}
            <div className="shrink-0 px-6 mb-5">
              <div className="flex rounded-xl border border-border overflow-hidden">
                {(["resultado", "detalhes"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={[
                      "flex-1 py-2.5 text-sm font-medium transition-colors capitalize",
                      tab === t ? "bg-accent text-accent-fg" : "text-text-secondary hover:text-text-primary",
                    ].join(" ")}
                  >
                    {t === "resultado" ? "Registar resultado" : "Detalhes"}
                  </button>
                ))}
              </div>
            </div>

            {/* PR celebration banner */}
            <AnimatePresence>
              {showPrBanner && (
                <motion.div
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                  className="mx-6 mb-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 px-5 py-4 text-center shrink-0"
                >
                  <p className="text-2xl mb-1">🏆</p>
                  <p className="text-base font-semibold text-amber-600 dark:text-amber-400">Novo Personal Record!</p>
                  <p className="text-sm text-text-secondary mt-0.5">{wod.title}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 pb-10">

              {/* ── TAB: RESULTADO ── */}
              {tab === "resultado" && (
                <div className="space-y-5">

                  {/* Resultado já registado */}
                  {hasResult && (
                    <div className={[
                      "rounded-xl border px-4 py-3 flex items-center justify-between gap-3",
                      wod.my_result!.is_pr
                        ? "border-amber-500/30 bg-amber-500/10"
                        : "border-accent/30 bg-accent/10",
                    ].join(" ")}>
                      <div>
                        <p className="text-xs text-text-tertiary mb-0.5">
                          {wod.my_result!.is_pr ? "🏆 Personal Record" : "Resultado registado"}
                        </p>
                        <p className="text-sm font-semibold text-text-primary">
                          {wod.my_result!.score_display}
                          <span className="ml-2 text-xs font-normal text-text-tertiary">
                            {wod.my_result!.rx ? "RX" : "Scaled"}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUpdating((v) => !v)}
                        className="shrink-0 text-xs font-medium text-accent hover:underline"
                      >
                        {updating ? "Cancelar" : "Atualizar"}
                      </button>
                    </div>
                  )}

                  {/* Formulário — oculto se já tem resultado e não está a atualizar */}
                  {showForm && <>

                  {/* AMRAP */}
                  {wod.type === "AMRAP" && (
                    <div>
                      <p className="text-sm font-medium text-text-secondary mb-2">Rondas completas + reps parciais</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <FieldInput type="number" min={0} placeholder="0" value={amrapRounds} onChange={(e) => setAmrapRounds(e.target.value)} />
                          <p className="text-[11px] text-text-tertiary mt-1 text-center">rondas</p>
                        </div>
                        <span className="text-lg font-semibold text-text-tertiary">+</span>
                        <div className="flex-1">
                          <FieldInput type="number" min={0} placeholder="0" value={amrapReps} onChange={(e) => setAmrapReps(e.target.value)} />
                          <p className="text-[11px] text-text-tertiary mt-1 text-center">reps</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* For Time */}
                  {wod.type === "For Time" && (
                    <div className="space-y-3">
                      {!dnf && <TimeInput label="Tempo" mins={ftMins} secs={ftSecs} onMins={setFtMins} onSecs={setFtSecs} />}
                      <button
                        type="button"
                        onClick={() => setDnf((v) => !v)}
                        className={["flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors w-full",
                          dnf ? "border-orange-500/30 bg-orange-500/10 text-orange-500" : "border-border text-text-secondary hover:text-text-primary"].join(" ")}
                      >
                        <span className={["h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors", dnf ? "border-orange-500 bg-orange-500" : "border-border"].join(" ")}>
                          {dnf && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </span>
                        Não terminei no tempo (DNF)
                      </button>
                      {dnf && (
                        <FieldInput
                          label={`Reps completadas${wod.time_cap_minutes ? ` em ${wod.time_cap_minutes} min` : ""}`}
                          type="number" min={0} placeholder="0"
                          value={dnfReps} onChange={(e) => setDnfReps(e.target.value)}
                        />
                      )}
                    </div>
                  )}

                  {/* For Load */}
                  {wod.type === "For Load" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-text-secondary">
                          {numSets} sets{wod.result_reps_per_set ? ` · ${repsLabel} por set` : ""}
                        </p>
                        <div className="flex rounded-xl border border-border overflow-hidden">
                          {(["kg", "lb"] as WeightUnit[]).map((u) => (
                            <button key={u} type="button" onClick={() => setWeightUnit(u)}
                              className={["px-3 py-1.5 text-xs font-semibold transition-colors", weightUnit === u ? "bg-accent text-accent-fg" : "text-text-secondary hover:text-text-primary"].join(" ")}>
                              {u}
                            </button>
                          ))}
                        </div>
                      </div>
                      {sets.map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-text-tertiary w-8 text-right shrink-0">S{i + 1}</span>
                          <div className="flex-1">
                            <FieldInput type="number" min={0} placeholder={repsLabel} value={s.reps}
                              onChange={(e) => setSets((prev) => prev.map((row, idx) => idx === i ? { ...row, reps: e.target.value } : row))} />
                          </div>
                          <span className="text-text-tertiary text-xs">×</span>
                          <div className="flex-1">
                            <FieldInput type="number" min={0} step={0.5} placeholder={`0 ${weightUnit}`} value={s.weight}
                              onChange={(e) => setSets((prev) => prev.map((row, idx) => idx === i ? { ...row, weight: e.target.value } : row))} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* EMOM */}
                  {wod.type === "EMOM" && (
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-text-secondary mb-2">
                        Reps por minuto · {emomCount} min
                      </p>
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {emomReps.map((reps, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-text-tertiary w-8 text-right shrink-0">{i + 1}min</span>
                            <FieldInput type="number" min={0} placeholder="0" value={reps}
                              onChange={(e) => setEmomReps((prev) => prev.map((r, idx) => idx === i ? e.target.value : r))} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Round-reps — total de reps por ronda */}
                  {isRoundReps && (
                    <div className="space-y-2">
                      <div className="rounded-xl border border-border/50 bg-bg-card px-3 py-2 text-xs text-text-tertiary">
                        Regista as reps de cada ronda — o resultado é o total
                      </div>
                      <p className="text-sm font-medium text-text-secondary">
                        Reps por ronda · {numRoundReps} rondas
                      </p>
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {roundRepsRows.map((reps, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-text-tertiary w-6 text-right shrink-0">{i + 1}</span>
                            <FieldInput
                              type="number" min={0} placeholder="0" value={reps}
                              onChange={(e) => setRoundRepsRows((prev) => prev.map((r, idx) => idx === i ? e.target.value : r))}
                            />
                            <span className="text-xs text-text-tertiary shrink-0">reps</span>
                          </div>
                        ))}
                      </div>
                      {roundRepsRows.some((r) => parseInt(r, 10) > 0) && (
                        <p className="text-sm font-semibold text-text-primary text-right">
                          Total: {roundRepsRows.reduce((s, r) => s + (parseInt(r, 10) || 0), 0)} reps
                        </p>
                      )}
                    </div>
                  )}

                  {/* Round-based (tempo) */}
                  {isRoundScoreType && (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-border/50 bg-bg-card px-3 py-2 text-xs text-text-tertiary">
                        {wod.score_type === "round-best" && "Resultado = melhor tempo de uma ronda"}
                        {wod.score_type === "round-worst" && "Resultado = pior tempo de uma ronda"}
                        {wod.score_type === "round-total" && "Resultado = soma de todos os tempos"}
                      </div>
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        <p className="text-sm font-medium text-text-secondary">
                          Tempo por ronda · {numRounds} rondas
                        </p>
                        {roundRows.map((row, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-text-tertiary w-6 text-right shrink-0">{i + 1}</span>
                            <div className="flex items-center gap-1 flex-1">
                              <FieldInput type="number" min={0} max={999} placeholder="00" value={row.mins}
                                onChange={(e) => setRoundRows((prev) => prev.map((r, idx) => idx === i ? { ...r, mins: e.target.value } : r))} />
                              <span className="text-text-tertiary font-semibold">:</span>
                              <FieldInput type="number" min={0} max={59} placeholder="00" value={row.secs}
                                onChange={(e) => setRoundRows((prev) => prev.map((r, idx) => idx === i ? { ...r, secs: e.target.value } : r))} />
                            </div>
                            <span className="text-[10px] text-text-tertiary whitespace-nowrap">m:s</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom */}
                  {isCustomType && (
                    <div>
                      {wod.score_type === "time" && <TimeInput label="Tempo" mins={cMins} secs={cSecs} onMins={setCMins} onSecs={setCSecs} />}
                      {wod.score_type === "reps" && <FieldInput label="Reps" type="number" min={0} placeholder="0" value={cReps} onChange={(e) => setCReps(e.target.value)} />}
                      {wod.score_type === "weight" && (
                        <div>
                          <p className="text-sm font-medium text-text-secondary mb-2">Carga</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1"><FieldInput type="number" min={0} step={0.5} placeholder="0" value={cWeight} onChange={(e) => setCWeight(e.target.value)} /></div>
                            <div className="flex rounded-xl border border-border overflow-hidden shrink-0">
                              {(["kg", "lb"] as WeightUnit[]).map((u) => (
                                <button key={u} type="button" onClick={() => setCWeightUnit(u)}
                                  className={["px-3 py-2 text-sm font-medium transition-colors", cWeightUnit === u ? "bg-accent text-accent-fg" : "text-text-secondary hover:text-text-primary"].join(" ")}>{u}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      {wod.score_type === "rounds+reps" && (
                        <div>
                          <p className="text-sm font-medium text-text-secondary mb-2">Rondas + Reps</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1"><FieldInput type="number" min={0} placeholder="Rondas" value={cRounds} onChange={(e) => setCRounds(e.target.value)} /></div>
                            <span className="text-lg font-semibold text-text-tertiary">+</span>
                            <div className="flex-1"><FieldInput type="number" min={0} placeholder="Reps" value={cPartialReps} onChange={(e) => setCPartialReps(e.target.value)} /></div>
                          </div>
                        </div>
                      )}
                      {wod.score_type === "distance" && (
                        <div>
                          <p className="text-sm font-medium text-text-secondary mb-2">Distância</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1"><FieldInput type="number" min={0} placeholder="0" value={cDistance} onChange={(e) => setCDistance(e.target.value)} /></div>
                            <div className="flex rounded-xl border border-border overflow-hidden shrink-0">
                              {["m", "cal"].map((u) => (
                                <button key={u} type="button" onClick={() => setCDistUnit(u)}
                                  className={["px-3 py-2 text-sm font-medium transition-colors", cDistUnit === u ? "bg-accent text-accent-fg" : "text-text-secondary hover:text-text-primary"].join(" ")}>{u}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* RX / Scaled */}
                  <div>
                    <p className="text-sm font-medium text-text-secondary mb-2">Escala</p>
                    <div className="flex rounded-xl border border-border overflow-hidden">
                      <button type="button" onClick={() => setRx(true)}
                        className={["flex-1 py-2.5 text-sm font-semibold transition-colors", rx ? "bg-accent text-accent-fg" : "text-text-secondary hover:text-text-primary"].join(" ")}>RX</button>
                      <button type="button" onClick={() => setRx(false)}
                        className={["flex-1 py-2.5 text-sm font-medium transition-colors", !rx ? "bg-bg-card text-text-primary" : "text-text-secondary hover:text-text-primary"].join(" ")}>Scaled</button>
                    </div>
                  </div>

                  {/* Notas */}
                  <div>
                    <label className="text-sm font-medium text-text-secondary">
                      Notas <span className="text-text-tertiary font-normal">(opcional)</span>
                    </label>
                    <textarea
                      value={notes} onChange={(e) => setNotes(e.target.value)}
                      rows={2} placeholder="Como correu? Escalas usadas…"
                      className="mt-1.5 w-full rounded-xl border border-border bg-bg-input px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
                    />
                  </div>

                  {error && <p className="text-sm text-error">{error}</p>}

                  <PrimaryButton onClick={handleSubmit} loading={pending}>
                    {updating ? "Atualizar resultado" : "Guardar resultado"}
                  </PrimaryButton>
                  <PrimaryButton variant="secondary" onClick={onClose} disabled={pending}>Cancelar</PrimaryButton>

                  </> /* fim showForm */}
                </div>
              )}

              {/* ── TAB: DETALHES ── */}
              {tab === "detalhes" && (
                <div className="space-y-6">

                  {/* Descrição */}
                  {wod.description && (
                    <div>
                      <p className="label-caps text-text-tertiary mb-2">Descrição</p>
                      <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">{wod.description}</p>
                    </div>
                  )}

                  {/* Exercícios */}
                  {wod.movements && wod.movements.length > 0 && (
                    <div>
                      <p className="label-caps text-text-tertiary mb-2">Exercícios</p>
                      <div className="space-y-2">
                        {wod.movements.map((m, i) => (
                          <div key={i} className="flex items-start justify-between gap-3 rounded-xl border border-border bg-bg-card px-4 py-3">
                            <div>
                              <p className="text-sm font-medium text-text-primary">{m.name}</p>
                              {(m.rx_weight || m.scaled_weight) && (
                                <p className="text-xs text-text-tertiary mt-0.5">
                                  {m.rx_weight && <span>RX: {m.rx_weight}</span>}
                                  {m.rx_weight && m.scaled_weight && <span className="mx-1">·</span>}
                                  {m.scaled_weight && <span>Scaled: {m.scaled_weight}</span>}
                                </p>
                              )}
                            </div>
                            {m.video_url && (
                              <a href={m.video_url} target="_blank" rel="noopener noreferrer"
                                className="shrink-0 text-xs text-accent hover:underline">
                                Ver vídeo
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notas de Scaling */}
                  {wod.scaling_notes && (
                    <div>
                      <p className="label-caps text-text-tertiary mb-2">Notas de Scaling</p>
                      <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{wod.scaling_notes}</p>
                    </div>
                  )}

                  {!wod.description && (!wod.movements || wod.movements.length === 0) && !wod.scaling_notes && (
                    <p className="text-sm text-text-tertiary text-center py-8">Sem detalhes disponíveis.</p>
                  )}
                </div>
              )}

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
