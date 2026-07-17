"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  AuthCenteredShell,
  AuthCard,
  AuthField,
  PrimaryButton,
  GoogleButton,
} from "@/components/shared";
import { signInWithMagicLink, signInWithGoogle } from "@/lib/auth/actions";
import { magicLinkSchema, type MagicLinkFormValues } from "@/schemas/auth";

type ScreenState = "idle" | "sent";

const ArrowRight = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TermsFooter = (
  <>
    Ao entrar, aceitas os nossos{" "}
    <span className="text-white/70 underline underline-offset-4">
      termos e política de privacidade
    </span>
  </>
);

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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("limit")) {
        toast.error("Aguarda um momento antes de pedir outro link.");
      } else {
        toast.error(msg || "Não foi possível enviar o link. Tenta novamente.");
      }
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
    <AuthCenteredShell footer={TermsFooter}>
      <AnimatePresence mode="wait">
        {screen === "idle" ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
          >
            <AuthCard>
              <div className="mb-6 text-center">
                <h1 className="font-display text-3xl uppercase leading-none tracking-tight text-white">
                  Entra na tua conta
                </h1>
                <p className="mt-2 text-sm text-white/55">
                  Usa o teu email ou Google para continuar.
                </p>
              </div>

              <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-3">
                <AuthField
                  type="email"
                  placeholder="oteuemail@exemplo.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  inputMode="email"
                  aria-label="Email"
                  error={form.formState.errors.email?.message}
                  trailingIcon={
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                      <rect x="2" y="3.5" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M2.5 5l6.5 4.5L15.5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                  {...form.register("email")}
                />

                <PrimaryButton
                  type="submit"
                  variant="light"
                  className="h-14"
                  loading={form.formState.isSubmitting}
                  trailing={ArrowRight}
                >
                  {form.formState.isSubmitting ? "A enviar..." : "Enviar link de acesso"}
                </PrimaryButton>
              </form>

              {/* Divider */}
              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-white/40">ou</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <GoogleButton
                onClick={handleGoogle}
                loading={googleLoading}
                className="h-14 border-white/[0.16] bg-transparent text-white hover:border-white/30 hover:bg-white/[0.04]"
              >
                Continuar com o Google
              </GoogleButton>
            </AuthCard>
          </motion.div>
        ) : (
          <motion.div
            key="sent"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
          >
            <AuthCard>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3B4C99]">
                  <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
                    <rect x="3" y="5.5" width="20" height="15" rx="2.5" stroke="#fff" strokeWidth="1.6" />
                    <path d="M4 7l9 6.5L22 7" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>

                <h2 className="mt-5 font-display text-2xl uppercase leading-none tracking-tight text-white">
                  Verifica o teu email
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/60">
                  Enviámos um link de acesso para
                  <br />
                  <span className="font-semibold text-white">{sentEmail}</span>.
                  <br />
                  Clica no link para entrar.
                </p>

                <div className="mt-7 w-full">
                  <PrimaryButton
                    variant="light"
                    className="h-14"
                    onClick={() => {
                      setScreen("idle");
                      form.reset();
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Utilizar outro email
                    </span>
                  </PrimaryButton>
                </div>
              </div>
            </AuthCard>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthCenteredShell>
  );
}
