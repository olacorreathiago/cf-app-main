import type { Metadata } from "next";
import { Suspense } from "react";
import { AthleteScreen } from "./athlete-screen";

export const metadata: Metadata = { title: "Registo Atleta" };

export default function AthleteOnboardingPage() {
  return (
    <Suspense>
      <AthleteScreen />
    </Suspense>
  );
}
