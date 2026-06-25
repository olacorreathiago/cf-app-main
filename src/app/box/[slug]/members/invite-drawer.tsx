"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { FieldInput, PrimaryButton } from "@/components/shared";
import { createEmailInvite } from "@/lib/invite/actions";
import { APP_CONFIG } from "@/lib/config";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().min(1, "Introduz um email").email("Email inválido"),
});
type FormValues = z.infer<typeof schema>;

interface InviteDrawerProps {
  open: boolean;
  onClose: () => void;
  boxId: string;
  boxName: string;
  slug: string;
  joinToken: string;
}

export function InviteDrawer({ open, onClose, boxId, boxName, joinToken }: InviteDrawerProps) {
  const router = useRouter();
  const [linkCopied, setLinkCopied] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailDelivered, setEmailDelivered] = useState(false);
  const [addedDirectly, setAddedDirectly] = useState(false);

  const joinLink = `${APP_CONFIG.url}/join/${joinToken}`;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function handleClose() {
    form.reset();
    setLinkCopied(false);
    setEmailSent(false);
    setEmailDelivered(false);
    setAddedDirectly(false);
    onClose();
    router.refresh();
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(joinLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  }

  async function onSubmit(values: FormValues) {
    try {
      const result = await createEmailInvite({ email: values.email, boxId });
      setEmailDelivered(result.emailSent);
      setAddedDirectly(result.addedDirectly);
      setEmailSent(true);
      form.reset();
    } catch (err: unknown) {
      if (
        err !== null &&
        typeof err === "object" &&
        "digest" in err &&
        typeof (err as { digest: unknown }).digest === "string" &&
        (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
      ) throw err;
      const message = err instanceof Error ? err.message : "Não foi possível registar o convite. Tenta novamente.";
      toast.error(message);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50",
              "rounded-t-3xl border-t border-border bg-bg-base px-6 pb-10 pt-5",
              "lg:bottom-0 lg:left-auto lg:right-0 lg:top-0 lg:w-[420px]",
              "lg:rounded-none lg:rounded-l-3xl lg:border-l lg:border-t-0 lg:border-border",
              "lg:pb-10 lg:pt-8"
            )}
          >
            {/* Handle (mobile only) */}
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-border lg:hidden" />

            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="label-caps text-text-tertiary mb-1">Convidar membro</p>
                <h2 className="font-display text-2xl leading-tight text-text-primary">
                  {boxName}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Partilha o link ou envia um convite por email.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Fechar"
                className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-input text-text-tertiary transition-colors hover:text-text-primary"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="space-y-5">
              {/* Permanent box link */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-secondary">Link da box</p>
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-bg-input px-4 py-3">
                  <p className="flex-1 truncate font-mono text-sm text-text-primary">
                    {joinLink}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    aria-label="Copiar link"
                    className={cn(
                      "shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150",
                      linkCopied
                        ? "bg-success/15 text-success"
                        : "bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:border-accent/40"
                    )}
                  >
                    {linkCopied ? (
                      <>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Copiado
                      </>
                    ) : (
                      <>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M8 4V2.5A1.5 1.5 0 0 0 6.5 1H2.5A1.5 1.5 0 0 0 1 2.5v4A1.5 1.5 0 0 0 2.5 8H4" stroke="currentColor" strokeWidth="1.3" />
                        </svg>
                        Copiar
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-text-tertiary">
                  Qualquer pessoa com este link entra como atleta.
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-text-tertiary">ou envia por email</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Email invite */}
              {emailSent ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl border border-success/20 bg-success/5 px-4 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <p className="text-sm text-text-primary">
                      {addedDirectly
                        ? "Atleta já tem conta — foi adicionado diretamente à box."
                        : emailDelivered
                        ? "Convite enviado por email."
                        : "Convite registado. Partilha o link acima."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailSent(false)}
                    className="w-full text-center text-sm text-text-tertiary transition-colors hover:text-text-secondary"
                  >
                    Convidar outro atleta
                  </button>
                </div>
              ) : (
                <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-3">
                  <FieldInput
                    label="Email do atleta"
                    type="email"
                    placeholder="atleta@email.com"
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                    error={form.formState.errors.email?.message}
                    {...form.register("email")}
                  />
                  <PrimaryButton
                    type="submit"
                    loading={form.formState.isSubmitting}
                    trailing={
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    }
                  >
                    {form.formState.isSubmitting ? "A enviar..." : "Enviar convite"}
                  </PrimaryButton>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
