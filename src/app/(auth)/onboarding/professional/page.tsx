import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfessionalScreen } from "./professional-screen";

export const metadata: Metadata = { title: "Registo Profissional" };

export default function ProfessionalOnboardingPage() {
  return (
    <Suspense>
      <ProfessionalScreen />
    </Suspense>
  );
}
