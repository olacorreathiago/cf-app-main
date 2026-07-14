import type { Metadata } from "next";
import { getAthletePrsData } from "@/lib/athlete/prs-actions";
import { PrsClient } from "./prs-client";

export const metadata: Metadata = { title: "PRs" };

export default async function AthletePrsPage() {
  const data = await getAthletePrsData();

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-7 space-y-5">
      <div>
        <h1 className="font-display text-xl text-text-primary">Personal Records</h1>
        <p className="text-sm text-text-tertiary mt-0.5">Os teus benchmarks e recordes pessoais.</p>
      </div>

      <PrsClient benchmarks={data.benchmarks} />
    </div>
  );
}
