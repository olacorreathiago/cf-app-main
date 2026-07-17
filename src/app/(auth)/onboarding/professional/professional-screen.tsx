"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AuthSplitShell, AuthField, PrimaryButton } from "@/components/shared";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { completeProfessionalOnboarding } from "@/lib/onboarding/actions";
import {
  professionalOnboardingSchema,
  type ProfessionalOnboardingValues,
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

const IdIcon = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="6.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M10.5 7.5h3M10.5 10h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const PhoneIcon = (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
    <path d="M6 2.5 4 3c-1 .3-1.6 1.3-1.2 2.3a13 13 0 0 0 7 7c1 .4 2-.2 2.3-1.2l.5-2-2.6-1.3-1.2 1.2a9.5 9.5 0 0 1-3.3-3.3L6.6 4.4 6 2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

export function ProfessionalScreen() {
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite") ?? undefined;

  const { fullName, professionalId, phone, inviteToken, setFullName, setProfessionalId, setPhone, setInviteToken } =
    useOnboardingStore();

  const [gender, setGender] = useState<Gender>(undefined as unknown as Gender);
  const genderSelected = gender !== (undefined as unknown as Gender);

  useEffect(() => {
    if (invite && !inviteToken) setInviteToken(invite);
  }, [invite, inviteToken, setInviteToken]);

  const form = useForm<ProfessionalOnboardingValues>({
    resolver: zodResolver(professionalOnboardingSchema),
    defaultValues: {
      fullName: fullName || "",
      professionalId: professionalId || "",
      phone: phone || "",
    },
  });

  async function onSubmit(values: ProfessionalOnboardingValues) {
    if (!genderSelected) {
      toast.error("Selecciona o teu género para continuar.");
      return;
    }
    setFullName(values.fullName);
    setProfessionalId(values.professionalId);
    setPhone(values.phone);

    try {
      await completeProfessionalOnboarding({
        fullName: values.fullName,
        professionalId: values.professionalId,
        phone: values.phone,
        gender: gender,
        inviteToken: inviteToken ?? invite ?? null,
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

  return (
    <AuthSplitShell backHref={`/onboarding/role${invite ? `?invite=${invite}` : ""}`}>
      <motion.div variants={container} initial="hidden" animate="show">
        <motion.div variants={item} className="mb-6 text-center">
          <h1 className="font-display text-3xl uppercase leading-none tracking-tight text-white lg:text-4xl">
            Dados pessoais
          </h1>
          <p className="mt-2 text-sm text-white/55">
            O teu perfil será revisto pela equipa antes de ficares ativo.
          </p>
        </motion.div>

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
            label="Cédula profissional"
            placeholder="CF123456"
            autoCapitalize="characters"
            hint="Número de cédula emitido pela entidade competente."
            trailingIcon={IdIcon}
            error={form.formState.errors.professionalId?.message}
            {...form.register("professionalId")}
          />

          <AuthField
            label="Contacto telefónico"
            placeholder="+351 910 901 910"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            trailingIcon={PhoneIcon}
            error={form.formState.errors.phone?.message}
            {...form.register("phone")}
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
              {form.formState.isSubmitting ? "A enviar..." : "Submeter para aprovação"}
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
