"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AuthSplitShell } from "@/components/shared";
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
    <AuthSplitShell>
      <motion.div variants={container} initial="hidden" animate="show">
        <motion.h1
          variants={item}
          className="mb-6 text-center font-display text-3xl uppercase leading-none tracking-tight text-white lg:text-4xl"
        >
          Vamos começar!
        </motion.h1>

        <motion.div variants={item} className="space-y-3">
          <RoleCard
            label="Sou Atleta"
            description="Marcar aulas, registar WODs e evoluir."
            onClick={() => handleSelect("athlete")}
          />
          <RoleCard
            label="Sou Profissional"
            description="Gerir a tua box, coaches e membros."
            onClick={() => handleSelect("professional")}
          />
        </motion.div>
      </motion.div>
    </AuthSplitShell>
  );
}

interface RoleCardProps {
  label: string;
  description: string;
  onClick: () => void;
}

function RoleCard({ label, description, onClick }: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-between gap-4 rounded-2xl border border-white/[0.12] bg-white/[0.05] px-5 py-4 text-left",
        "transition-colors duration-150 hover:border-accent/40 hover:bg-white/[0.07]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
      )}
    >
      <div>
        <p className="text-base font-semibold text-white">{label}</p>
        <p className="mt-0.5 text-sm text-white/45">{description}</p>
      </div>
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          "bg-white/[0.06] text-white/70 transition-colors duration-150",
          "group-hover:bg-accent group-hover:text-accent-fg"
        )}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  );
}
