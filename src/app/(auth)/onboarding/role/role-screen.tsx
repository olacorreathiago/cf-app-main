"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { OnboardingShell } from "@/components/shared";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { cn } from "@/lib/utils";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22 } },
};

export function RoleScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite") ?? undefined;
  const join = searchParams.get("join") ?? undefined;

  const { setProfileType, setInviteToken } = useOnboardingStore();

  function handleSelect(role: "athlete" | "professional") {
    setProfileType(role);
    if (invite) setInviteToken(invite);

    const qs = new URLSearchParams();
    if (invite) qs.set("invite", invite);
    if (join) qs.set("join", join);
    const params = qs.toString() ? `?${qs.toString()}` : "";

    router.push(
      role === "athlete"
        ? `/onboarding/athlete${params}`
        : `/onboarding/professional${params}`
    );
  }

  return (
    <OnboardingShell>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col justify-between lg:justify-center lg:gap-12"
      >
        {/* Heading */}
        <motion.div variants={item} className="pt-6 lg:pt-0">
          <p className="label-caps text-text-tertiary mb-3">Começo</p>
          <h1 className="font-display text-[2.6rem] leading-[0.92] text-text-primary">
            Como queres<br />começar?
          </h1>
        </motion.div>

        {/* Options */}
        <motion.div variants={item} className="space-y-3 pb-2">
          <RoleButton
            label="Sou atleta"
            description="Marcar aulas, registar WODs e acompanhar a minha evolução."
            onClick={() => handleSelect("athlete")}
          />
          <RoleButton
            label="Sou profissional"
            description="Gerir a minha box, coaches e membros."
            onClick={() => handleSelect("professional")}
          />
        </motion.div>
      </motion.div>
    </OnboardingShell>
  );
}

interface RoleButtonProps {
  label: string;
  description: string;
  onClick: () => void;
}

function RoleButton({ label, description, onClick }: RoleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-2xl border border-border bg-bg-card px-5 py-4 text-left",
        "transition-all duration-150",
        "hover:border-accent/40 hover:bg-bg-card-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:scale-[0.99]"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-base font-semibold text-text-primary">{label}</p>
          <p className="text-sm leading-snug text-text-tertiary">{description}</p>
        </div>
        {/* Arrow */}
        <span className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          "bg-bg-input text-text-tertiary",
          "transition-all duration-150",
          "group-hover:bg-accent group-hover:text-accent-fg"
        )}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2.5 7h9M8 3.5l3.5 3.5L8 10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </button>
  );
}
