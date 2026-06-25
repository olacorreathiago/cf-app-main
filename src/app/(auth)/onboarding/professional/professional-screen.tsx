"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { OnboardingShell, PrimaryButton, FieldInput } from "@/components/shared";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { completeProfessionalOnboarding } from "@/lib/onboarding/actions";
import {
  professionalOnboardingSchema,
  type ProfessionalOnboardingValues,
} from "@/schemas/onboarding";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22 } },
};

export function ProfessionalScreen() {
  const searchParams = useSearchParams();
  const invite = searchParams.get("invite") ?? undefined;

  const { fullName, professionalId, phone, inviteToken, setFullName, setProfessionalId, setPhone, setInviteToken } =
    useOnboardingStore();

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
    setFullName(values.fullName);
    setProfessionalId(values.professionalId);
    setPhone(values.phone);

    try {
      await completeProfessionalOnboarding({
        fullName: values.fullName,
        professionalId: values.professionalId,
        phone: values.phone,
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
    <OnboardingShell
      backHref={`/onboarding/role${invite ? `?invite=${invite}` : ""}`}
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col justify-between lg:justify-center lg:gap-10"
      >
        {/* Heading */}
        <motion.div variants={item} className="pt-6 lg:pt-0">
          <p className="label-caps text-text-tertiary mb-3">Perfil profissional</p>
          <h1 className="font-display text-[2.6rem] leading-[0.92] text-text-primary">
            Conta-nos<br />sobre ti.
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            O teu perfil será revisto pela equipa antes de ficares ativo.
          </p>
        </motion.div>

        {/* Form */}
        <motion.div variants={item}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            <FieldInput
              label="Nome completo"
              placeholder="João Silva"
              autoComplete="name"
              autoCapitalize="words"
              error={form.formState.errors.fullName?.message}
              {...form.register("fullName")}
            />

            <FieldInput
              label="Cédula profissional"
              placeholder="CF-12345"
              autoCapitalize="characters"
              hint="Número de cédula emitido pela entidade competente."
              error={form.formState.errors.professionalId?.message}
              {...form.register("professionalId")}
            />

            <FieldInput
              label="Contacto telefónico"
              placeholder="+351 912 345 678"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              error={form.formState.errors.phone?.message}
              {...form.register("phone")}
            />

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
                {form.formState.isSubmitting ? "A enviar..." : "Submeter para aprovação"}
              </PrimaryButton>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </OnboardingShell>
  );
}
