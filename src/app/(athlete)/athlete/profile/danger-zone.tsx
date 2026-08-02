"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { DrawerShell, FieldInput, PrimaryButton } from "@/components/shared";
import { requestAccountDeletion, type AccountDeletionBlockedBox } from "@/lib/account/deletion-actions";

const schema = z.object({
  confirmEmail: z.string().min(1, "Introduz o teu email").email("Email inválido"),
});
type FormValues = z.infer<typeof schema>;

export function ProfileDangerZone({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [blockedBoxes, setBlockedBoxes] = useState<AccountDeletionBlockedBox[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { confirmEmail: "" },
  });

  function handleClose() {
    form.reset();
    setBlockedBoxes([]);
    setOpen(false);
  }

  async function onSubmit(values: FormValues) {
    const result = await requestAccountDeletion(values);
    if (result.blockedBoxes?.length) {
      setBlockedBoxes(result.blockedBoxes);
      return;
    }
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Conta agendada para exclusão.");
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <section className="space-y-3">
        <p className="label-caps text-text-tertiary">Zona de perigo</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex w-full items-center gap-3 rounded-2xl border border-error/30 bg-error/5 px-5 py-4 text-sm font-medium text-error transition-colors duration-150 hover:bg-error/10"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 4h10M6.5 4V2.5A1 1 0 017.5 1.5h1a1 1 0 011 1V4M4.5 4v9a1.5 1.5 0 001.5 1.5h4a1.5 1.5 0 001.5-1.5V4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Apagar conta
        </button>
      </section>

      <DrawerShell
        open={open}
        onClose={handleClose}
        widthClassName="lg:w-[420px]"
        header={
          <>
            <p className="label-caps text-text-tertiary mb-1">Zona de perigo</p>
            <h2 className="font-display text-2xl leading-tight text-text-primary">
              Apagar conta
            </h2>
          </>
        }
      >
        <div className="space-y-5">
          {blockedBoxes.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">
                És owner de boxes ainda ativas. Transfere a propriedade ou encerra a box
                primeiro:
              </p>
              <div className="rounded-2xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
                {blockedBoxes.map((b) => (
                  <a
                    key={b.slug}
                    href={`/box/${b.slug}/settings`}
                    className="flex items-center justify-between px-4 py-3 text-sm text-text-primary hover:bg-bg-input transition-colors"
                  >
                    {b.name}
                    <span className="text-text-tertiary">→</span>
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-error/20 bg-error/5 px-4 py-3.5">
                <p className="text-sm text-text-primary leading-relaxed">
                  A tua conta fica agendada para exclusão. Tens <strong>30 dias</strong> para
                  recuperar — depois disso, os teus dados pessoais são anonimizados. Os teus
                  resultados e PRs mantêm-se, sem nome associado.
                </p>
              </div>

              <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-3">
                <FieldInput
                  label={`Escreve "${email}" para confirmar`}
                  type="email"
                  placeholder={email}
                  autoComplete="off"
                  autoCapitalize="none"
                  error={form.formState.errors.confirmEmail?.message}
                  {...form.register("confirmEmail")}
                />
                <PrimaryButton
                  type="submit"
                  loading={form.formState.isSubmitting}
                  className="bg-error text-white hover:bg-error/90"
                >
                  {form.formState.isSubmitting ? "A apagar…" : "Apagar a minha conta"}
                </PrimaryButton>
              </form>
            </>
          )}
        </div>
      </DrawerShell>
    </>
  );
}
