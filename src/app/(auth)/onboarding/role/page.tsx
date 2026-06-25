import { Suspense } from "react";
import { RoleScreen } from "./role-screen";

export default function OnboardingRolePage() {
  return (
    <Suspense>
      <RoleScreen />
    </Suspense>
  );
}
