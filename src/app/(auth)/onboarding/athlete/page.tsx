import { Suspense } from "react";
import { AthleteScreen } from "./athlete-screen";

export default function AthleteOnboardingPage() {
  return (
    <Suspense>
      <AthleteScreen />
    </Suspense>
  );
}
