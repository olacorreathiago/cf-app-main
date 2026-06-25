"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { OnboardingShell, PrimaryButton, FieldInput, GoogleButton } from "@/components/shared";
import { signInWithMagicLink, signInWithGoogle } from "@/lib/auth/actions";
import { magicLinkSchema, type MagicLinkFormValues } from "@/schemas/auth";
import { cn } from "@/lib/utils";

type ScreenState = "idle" | "sent";

export function LoginScreen() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? undefined;
  const invite = searchParams.get("invite") ?? undefined;
  const join = searchParams.get("join") ?? undefined;

  const [screen, setScreen] = useState<ScreenState>("idle");
  const [sentEmail, setSentEmail] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  const form = useForm<MagicLinkFormValues>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit({ email }: MagicLinkFormValues) {
    try {
      await signInWithMagicLink(email, { next, invite, join });
      setSentEmail(email);
      setScreen("sent");
    } catch {
      toast.error("Não foi possível enviar o link. Tenta novamente.");
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle({ next, invite, join });
    } catch {
      toast.error("Erro ao iniciar sessão com Google.");
      setGoogleLoading(false);
    }
  }

  return (
    <OnboardingShell>
      {/* Mobile: hero pushes form to bottom. Desktop: just the form, centered by layout. */}
      <div className="flex flex-1 flex-col lg:justify-center lg:gap-8">

        {/* Mobile hero */}
        <div className="flex flex-1 flex-col justify-end pb-8 lg:hidden">
          <p className="label-caps text-text-tertiary mb-2">Bem-vindo</p>
          <h1 className="font-display text-[2.6rem] leading-[0.92] text-text-primary">
            O teu treino,<br />a tua evolução.
          </h1>
        </div>

        {/* Desktop heading */}
        <div className="hidden lg:block space-y-1">
          <p className="label-caps text-text-tertiary">Acesso</p>
          <h1 className="text-2xl font-bold text-text-primary">Entra na tua conta</h1>
          <p className="text-sm text-text-secondary">Usa o teu email ou Google para continuar.</p>
        </div>

        {/* Form */}
        <AnimatePresence mode="wait">
          {screen === "idle" ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22 }}
              className="space-y-3"
            >
              <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-3">
                <FieldInput
                  label="Email"
                  type="email"
                  placeholder="o.teu@email.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  inputMode="email"
                  error={form.formState.errors.email?.message}
                  {...form.register("email")}
                />

                <PrimaryButton
                  type="submit"
                  loading={form.formState.isSubmitting}
                  trailing={
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                >
                  {form.formState.isSubmitting ? "A enviar..." : "Enviar link de acesso"}
                </PrimaryButton>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-text-tertiary">ou</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <GoogleButton onClick={handleGoogle} loading={googleLoading} />

              <div className="pt-1 text-center">
                <a
                  href="/"
                  className={cn(
                    "text-sm text-text-tertiary underline-offset-4",
                    "hover:text-text-secondary hover:underline",
                    "transition-colors duration-150"
                  )}
                >
                  Continuar como visitante
                </a>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="sent"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22 }}
              className="space-y-6"
            >
              <div className="flex justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 ring-1 ring-accent/20">
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                    <path d="M4.5 9A2.5 2.5 0 0 1 7 6.5h22A2.5 2.5 0 0 1 31.5 9v18A2.5 2.5 0 0 1 29 29.5H7A2.5 2.5 0 0 1 4.5 27V9Z" stroke="currentColor" strokeWidth="1.75" className="text-accent" />
                    <path d="M4.5 9.5l13.5 10L31.5 9.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-accent" />
                  </svg>
                </div>
              </div>

              <div className="space-y-2 text-center">
                <h2 className="text-xl font-semibold text-text-primary">
                  Verifica o teu email
                </h2>
                <p className="text-sm leading-relaxed text-text-secondary">
                  Enviámos um link de acesso para{" "}
                  <span className="font-medium text-text-primary">{sentEmail}</span>.
                  <br />
                  Clica no link para entrar.
                </p>
              </div>

              <div className="space-y-3">
                <PrimaryButton
                  variant="secondary"
                  onClick={() => {
                    setScreen("idle");
                    form.reset();
                  }}
                >
                  Usar outro email
                </PrimaryButton>
                <p className="text-center text-xs text-text-tertiary">
                  Não encontras o email? Verifica a pasta de spam.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </OnboardingShell>
  );
}
