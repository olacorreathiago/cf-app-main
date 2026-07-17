import type { Metadata } from "next";
import { getAthleteResultsCalendar } from "@/lib/athlete/results-actions";
import { ResultsCalendar } from "./results-calendar";

export const metadata: Metadata = { title: "Resultados" };

export default async function AthleteResultsPage() {
  const now = new Date();
  const data = await getAthleteResultsCalendar(now.getFullYear(), now.getMonth() + 1);

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-7 space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase text-text-primary">Resultados</h1>
        <p className="label-caps mt-1 text-text-tertiary">Histórico de treinos</p>
      </div>

      <ResultsCalendar
        initialYear={now.getFullYear()}
        initialMonth={now.getMonth() + 1}
        daysWithResults={data.daysWithResults}
        activeBoxId={data.activeBoxId}
      />
    </div>
  );
}
