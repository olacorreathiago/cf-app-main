"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { OnboardingShell, PrimaryButton, FieldInput } from "@/components/shared";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { completeAthleteOnboarding } from "@/lib/onboarding/actions";
import {
  athleteOnboardingSchema,
  type AthleteOnboardingValues,
} from "@/schemas/onboarding";

type Gender = "male" | "female" | null;

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male",   label: "Masculino" },
  { value: "female", label: "Feminino" },
  { value: null,     label: "Prefiro não dizer" },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22 } },
};

export function AthleteScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite") ?? undefined;
  const join = searchParams.get("join") ?? undefined;

  const { fullName, nickname, inviteToken, setFullName, setNickname, setInviteToken } =
    useOnboardingStore();

  const [gender, setGender] = useState<Gender>(undefined as unknown as Gender);
  const genderSelected = gender !== (undefined as unknown as Gender);

  // Sync invite token from URL if arriving directly (e.g. after email magic link)
  useEffect(() => {
    if (invite && !inviteToken) setInviteToken(invite);
  }, [invite, inviteToken, setInviteToken]);

  const form = useForm<AthleteOnboardingValues>({
    resolver: zodResolver(athleteOnboardingSchema),
    defaultValues: {
      fullName: fullName || "",
      nickname: nickname || "",
    },
  });

  async function onSubmit(values: AthleteOnboardingValues) {
    if (!genderSelected) {
      toast.error("Selecciona o teu género para continuar.");
      return;
    }
    // Persist to store so data isn't lost on re-render
    setFullName(values.fullName);
    setNickname(values.nickname ?? "");

    try {
      await completeAthleteOnboarding({
        fullName: values.fullName,
        nickname: values.nickname || undefined,
        gender: gender,
        inviteToken: inviteToken ?? invite ?? null,
        joinToken: join ?? null,
      });
    } catch (err: unknown) {
      // Next.js redirect() throws a special error — let it propagate
      if (
        err !== null &&
        typeof err === "object" &&
        "digest" in err &&
        typeof (err as { digest: unknown }).digest === "string" &&
        (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
      ) {
        throw err;
      }
      toast.error("Não foi possível guardar o perfil. Tenta novamente.");
    }
  }

  return (
    <OnboardingShell
      backHref={`/onboarding/role${invite || join ? `?${new URLSearchParams({ ...(invite ? { invite } : {}), ...(join ? { join } : {}) }).toString()}` : ""}`}
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col justify-between lg:justify-center lg:gap-10"
      >
        {/* Heading */}
        <motion.div variants={item} className="pt-6 lg:pt-0">
          <p className="label-caps text-text-tertiary mb-3">Perfil</p>
          <h1 className="font-display text-[2.6rem] leading-[0.92] text-text-primary">
            Como te<br />chamamos?
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            O nickname é opcional e público — podes mudar mais tarde.
          </p>
        </motion.div>

        {/* Form */}
        <motion.div variants={item}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            <FieldInput
              label="Nome completo"
              placeholder="Ana Ferreira"
              autoComplete="name"
              autoCapitalize="words"
              error={form.formState.errors.fullName?.message}
              {...form.register("fullName")}
            />

            <FieldInput
              label="Nickname"
              placeholder="anafit (opcional)"
              autoComplete="username"
              autoCapitalize="none"
              hint="Visível para outros membros da box."
              error={form.formState.errors.nickname?.message}
              {...form.register("nickname")}
            />

            {/* Género */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-secondary">Género</p>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  {GENDER_OPTIONS.filter((o) => o.value !== null).map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setGender(opt.value)}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-sm font-medium transition-all text-left",
                        gender === opt.value
                          ? "border-accent bg-accent text-accent-fg"
                          : "border-border bg-bg-input text-text-secondary hover:border-accent/40 hover:text-text-primary"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setGender(null)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2.5 text-sm font-medium transition-all text-left",
                    gender === null && genderSelected
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border bg-bg-input text-text-secondary hover:border-accent/40 hover:text-text-primary"
                  )}
                >
                  Prefiro não dizer
                </button>
              </div>
              {genderSelected && gender === null && (
                <div className="rounded-xl border border-amber-400/30 bg-amber-500/8 px-3 py-2.5">
                  <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                    Sem género definido, não apareces nos leaderboards da box. Podes alterar nas definições de perfil.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <PrimaryButton
                type="submit"
                loading={form.formState.isSubmitting}
                trailing={
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                }
              >
                {form.formState.isSubmitting ? "A guardar..." : "Concluir registo"}
              </PrimaryButton>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </OnboardingShell>
  );
}
