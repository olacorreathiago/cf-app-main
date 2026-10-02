// Day boundaries.
//
// The project has two different time conventions and mixing them up is the
// source of the "result shows up on the wrong day" class of bug:
//
//   1. `classes.starts_at` stores *local wall time as if it were UTC*
//      (a 16:26 class is stored as 16:26Z). Filtering it with
//      `${day}T00:00:00.000Z` .. `${day}T23:59:59.999Z` is therefore correct
//      and needs nothing from this module — except `nowAsStoredIso()` when
//      comparing it against the present moment.
//
//   2. `wod_results.recorded_at`, `payments.created_at` and friends are real
//      `timestamptz` instants (`now()`). Filtering *those* with a UTC calendar
//      day is wrong: in Portugal (UTC+1 in summer) a result logged at 00:30
//      local is 23:30Z the day before, so it lands on the previous day.
//      Use `dayRangeUtc()` / `monthRangeUtc()` for these.
//
// Portugal-only for now. If boxes outside PT ever exist, this becomes a
// per-box `boxes.timezone` column and these helpers take it as an argument.

export const BOX_TIMEZONE = "Europe/Lisbon";

/** "YYYY-MM-DD HH:mm:ss" of `d` in box-local time. */
function localParts(d: Date): string {
  return d.toLocaleString("sv", { timeZone: BOX_TIMEZONE });
}

/** Box-local calendar day (YYYY-MM-DD) of an instant. Defaults to now. */
export function localDayIso(d: Date = new Date()): string {
  return localParts(d).slice(0, 10);
}

/**
 * Now, expressed as box-local wall time formatted as UTC — the shape
 * `classes.starts_at` is stored in. Use to compare "has this class started".
 */
export function nowAsStoredIso(): string {
  return localParts(new Date()).replace(" ", "T") + "Z";
}

/** Milliseconds box-local time is ahead of UTC on a given calendar day. */
function offsetMsOn(dayIso: string): number {
  const atUtcMidnight = new Date(`${dayIso}T00:00:00.000Z`);
  const asLocal = new Date(localParts(atUtcMidnight).replace(" ", "T") + "Z");
  return asLocal.getTime() - atUtcMidnight.getTime();
}

/**
 * The real UTC instants bounding a box-local calendar day, as ISO strings.
 * `to` is exclusive — use with `.gte(from)` + `.lt(to)`.
 */
export function dayRangeUtc(dayIso: string): { from: string; to: string } {
  const offset = offsetMsOn(dayIso);
  const from = new Date(new Date(`${dayIso}T00:00:00.000Z`).getTime() - offset);
  const to = new Date(from.getTime() + 86_400_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * The real UTC instants bounding a box-local month (1-indexed). `to` is
 * exclusive. Guards the monthly stats, which used the server's own timezone.
 */
export function monthRangeUtc(year: number, month: number): { from: string; to: string } {
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextFirstDay = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { from: dayRangeUtc(firstDay).from, to: dayRangeUtc(nextFirstDay).from };
}

/** Box-local year + month (1-indexed) of an instant. Defaults to now. */
export function localYearMonth(d: Date = new Date()): { year: number; month: number } {
  const [year, month] = localDayIso(d).split("-").map(Number);
  return { year, month };
}
