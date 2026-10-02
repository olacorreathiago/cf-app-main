// Helpers for weightlifting results. A lift's PR is the heaviest load ever
// logged, whatever the rep scheme; sets/reps are only context shown with it.

export interface LiftSet {
  set?: number;
  reps: number | null;
  weight: number;
}

/** "Power Snatch 1RM" → "Power Snatch": the PR is the heaviest load, not only a 1RM. */
export function liftLabel(name: string): string {
  return name.replace(/\s*1RM$/i, "");
}

/** sets_data may arrive as an array or (written via JSON.stringify) as a JSON string. */
export function parseLiftSets(raw: unknown): LiftSet[] | null {
  let data = raw;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(data)) return null;
  const sets: LiftSet[] = [];
  for (const row of data) {
    const weight = (row as { weight?: unknown })?.weight;
    if (typeof weight !== "number" || weight <= 0) continue;
    const reps = (row as { reps?: unknown }).reps;
    sets.push({
      set: (row as { set?: number }).set,
      reps: typeof reps === "number" && reps > 0 ? reps : null,
      weight,
    });
  }
  return sets.length > 0 ? sets : null;
}

/** "5×3" when every set has the same reps, otherwise "3-2-1" style list of reps. */
export function setsScheme(sets: LiftSet[] | null): string | null {
  if (!sets || sets.length === 0) return null;
  const reps = sets.map((s) => s.reps);
  if (reps.some((r) => r === null)) return null;
  const first = reps[0];
  if (reps.every((r) => r === first)) return `${sets.length}×${first}`;
  return reps.join("-");
}
