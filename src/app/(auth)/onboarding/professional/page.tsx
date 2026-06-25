import { Suspense } from "react";
import { ProfessionalScreen } from "./professional-screen";

export default function ProfessionalOnboardingPage() {
  return (
    <Suspense>
      <ProfessionalScreen />
    </Suspense>
  );
}
