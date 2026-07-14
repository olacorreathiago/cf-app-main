import type { Metadata } from "next";
import { getAthleteLeaderboardData } from "@/lib/athlete/leaderboard-actions";
import { LeaderboardClient } from "./leaderboard-client";

export const metadata: Metadata = { title: "Leaderboard" };

export default async function AthleteLeaderboardPage() {
  const data = await getAthleteLeaderboardData();

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-7 space-y-6">
      <div>
        <h1 className="font-display text-xl text-text-primary">Leaderboard</h1>
        <p className="text-sm text-text-tertiary mt-0.5">Rankings da tua box</p>
      </div>

      <LeaderboardClient
        benchmarkWods={data.benchmarkWods}
        myUserId={data.myUserId}
      />
    </div>
  );
}
