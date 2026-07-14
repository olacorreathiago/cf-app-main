import type { Metadata } from "next";
import { Suspense } from "react";
import { RoleScreen } from "./role-screen";

export const metadata: Metadata = { title: "Onboarding" };

export default function OnboardingRolePage() {
  return (
    <Suspense>
      <RoleScreen />
    </Suspense>
  );
}
