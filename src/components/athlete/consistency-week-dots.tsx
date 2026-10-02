import { cn } from "@/lib/utils";
import type { ConsistencyDay } from "@/lib/athlete/consistency-actions";

const WEEKDAY_LETTERS = ["S", "T", "Q", "Q", "S", "S", "D"]; // Seg Ter Qua Qui Sex Sáb Dom

interface WeekDotsProps {
  /** 7 entries, Monday → Sunday. */
  days: ConsistencyDay[];
  /** "gold" = sits on the accent hero (marks are black-translucent); "dark" = sits on a normal card. */
  variant?: "gold" | "dark";
}

export function WeekDots({ days, variant = "gold" }: WeekDotsProps) {
  return (
    <div className="mt-5 flex gap-[9px]">
      {days.map((day, i) => (
        <div key={day.dayIso} className="flex flex-col items-center gap-1.5">
          <Dot state={day.state} sessions={day.sessions} variant={variant} />
          <span
            className={cn(
              "text-[9.5px] font-bold tracking-wide",
              variant === "gold" ? "text-black/45" : "text-text-tertiary"
            )}
          >
            {WEEKDAY_LETTERS[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

function Dot({
  state,
  sessions,
  variant,
}: {
  state: ConsistencyDay["state"];
  sessions: number;
  variant: "gold" | "dark";
}) {
  if (state === "closed") {
    return (
      <span
        aria-hidden
        className={cn("my-[7px] h-[1.5px] w-[9px] rounded-full", variant === "gold" ? "bg-black/[0.18]" : "bg-border-strong")}
      />
    );
  }

  if (state === "today") {
    return (
      <span
        aria-hidden
        className={cn(
          "h-4 w-4 rounded-full border-[1.5px] border-dashed",
          variant === "gold" ? "border-black/[0.55]" : "border-border-strong"
        )}
      />
    );
  }

  if (state === "trained") {
    const isDouble = sessions > 1;
    return (
      <span
        aria-hidden
        className={cn("h-4 w-4 rounded-full", variant === "gold" ? "bg-black/[0.82]" : "bg-accent")}
        style={
          isDouble
            ? {
                boxShadow:
                  variant === "gold"
                    ? "0 0 0 2px rgba(0,0,0,0.82), 0 0 0 4px rgba(0,0,0,0.22)"
                    : "0 0 0 2px var(--accent), 0 0 0 4px color-mix(in srgb, var(--accent) 22%, transparent)",
              }
            : undefined
        }
      />
    );
  }

  // "missed" and "future" share the same empty-ring mark — a future day
  // and a missed one are visually indistinguishable until it's in the past.
  return (
    <span
      aria-hidden
      className={cn("h-4 w-4 rounded-full border-[1.5px]", variant === "gold" ? "border-black/[0.28]" : "border-border-strong")}
    />
  );
}
