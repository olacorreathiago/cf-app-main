"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AuthSplitShell, AuthField, PrimaryButton } from "@/components/shared";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { completeAthleteOnboarding } from "@/lib/onboarding/actions";
import {
  athleteOnboardingSchema,
  type AthleteOnboardingValues,
} from "@/schemas/onboarding";

type Gender = "male" | "female" | null;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22 } },
};

const PersonIcon = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.4" />
    <path d="M3.5 15c.6-2.6 2.8-4 5.5-4s4.9 1.4 5.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const TagIcon = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M8.4 2.5H3.5A1 1 0 0 0 2.5 3.5v4.9a1 1 0 0 0 .3.7l6.1 6.1a1 1 0 0 0 1.4 0l4.9-4.9a1 1 0 0 0 0-1.4L9.1 2.8a1 1 0 0 0-.7-.3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <circle cx="6" cy="6" r="1" fill="currentColor" />
  </svg>
);

export function AthleteScreen() {
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite") ?? undefined;
  const join = searchParams.get("join") ?? undefined;

  const { fullName, nickname, inviteToken, setFullName, setNickname, setInviteToken } =
    useOnboardingStore();

  const [gender, setGender] = useState<Gender>(undefined as unknown as Gender);
  const genderSelected = gender !== (undefined as unknown as Gender);

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

  const backHref = `/onboarding/role${invite || join ? `?${new URLSearchParams({ ...(invite ? { invite } : {}), ...(join ? { join } : {}) }).toString()}` : ""}`;

  return (
    <AuthSplitShell backHref={backHref}>
      <motion.div variants={container} initial="hidden" animate="show">
        <motion.h1
          variants={item}
          className="mb-6 text-center font-display text-3xl uppercase leading-none tracking-tight text-white lg:text-4xl"
        >
          Dados pessoais
        </motion.h1>

        <motion.form
          variants={item}
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          <AuthField
            label="Nome completo"
            placeholder="João da Silva"
            autoComplete="name"
            autoCapitalize="words"
            trailingIcon={PersonIcon}
            error={form.formState.errors.fullName?.message}
            {...form.register("fullName")}
          />

          <AuthField
            label="Nickname"
            placeholder="The Rock"
            autoComplete="username"
            autoCapitalize="none"
            hint="Opcional e visível para outros membros da box."
            trailingIcon={TagIcon}
            error={form.formState.errors.nickname?.message}
            {...form.register("nickname")}
          />

          {/* Género */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-white/85">Género</p>
            <div className="grid grid-cols-2 gap-2">
              <RadioPill label="Masculino" selected={gender === "male"} onClick={() => setGender("male")} />
              <RadioPill label="Feminino" selected={gender === "female"} onClick={() => setGender("female")} />
            </div>
            <RadioPill
              label="Prefiro não dizer"
              selected={genderSelected && gender === null}
              onClick={() => setGender(null)}
              fullWidth
            />
            {genderSelected && gender === null && (
              <div className="rounded-xl border border-accent/25 bg-accent/[0.08] px-3 py-2.5">
                <p className="text-xs leading-relaxed text-accent">
                  Sem género definido, não apareces nos leaderboards da box. Podes alterar nas definições de perfil.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2">
            <PrimaryButton
              type="submit"
              className="h-14"
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
        </motion.form>
      </motion.div>
    </AuthSplitShell>
  );
}

function RadioPill({
  label,
  selected,
  onClick,
  fullWidth,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-14 items-center justify-between rounded-2xl border bg-transparent px-4 text-sm font-medium transition-colors",
        fullWidth && "w-full",
        selected
          ? "border-accent text-white"
          : "border-white/[0.16] text-white/50 hover:border-white/30 hover:text-white"
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-full border",
          selected ? "border-accent" : "border-white/30"
        )}
      >
        {selected && <span className="h-2 w-2 rounded-full bg-accent" />}
      </span>
    </button>
  );
}
