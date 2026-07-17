"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { AuthSplitShell, AuthField, PrimaryButton } from "@/components/shared";
import { createBox } from "@/lib/box/actions";
import { createBoxSchema, type CreateBoxValues } from "@/schemas/onboarding";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22 } },
};

const BoxIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="2" y="2" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M2 6h12" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);
const LinkIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="1.5" y="4" width="13" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M4.5 8h3M9.5 8h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const LocationIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M8 14s5-4.2 5-8A5 5 0 003 6c0 3.8 5 8 5 8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    <circle cx="8" cy="6" r="1.75" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);
const PhoneIcon = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M5.5 2.5l1.2 2.6-1.3 1a7 7 0 003 3l1-1.3 2.6 1.2v2.4c0 .6-.5 1.1-1.1 1A11 11 0 013 4.6c-.1-.6.4-1.1 1-1.1h1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

export function CreateBoxScreen() {
  const slugEditedRef = useRef(false);

  const form = useForm<CreateBoxValues>({
    resolver: zodResolver(createBoxSchema),
    defaultValues: { name: "", slug: "", city: "", phone: "" },
  });

  const nameValue = form.watch("name");

  useEffect(() => {
    if (!slugEditedRef.current) {
      form.setValue("slug", toSlug(nameValue), { shouldValidate: false });
    }
  }, [nameValue, form]);

  async function onSubmit(values: CreateBoxValues) {
    try {
      await createBox(values);
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
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("duplicate") || msg.includes("unique")) {
        form.setError("slug", { message: "Este slug já está em uso. Escolhe outro." });
      } else {
        toast.error("Não foi possível criar a box. Tenta novamente.");
      }
    }
  }

  return (
    <AuthSplitShell
      backHref="/athlete"
      heroTitle={
        <>
          Cria a tua<br />
          box.
        </>
      }
      heroSubtitle="Após criação, a box entra em revisão antes de ficar visível no diretório."
    >
      <motion.div variants={container} initial="hidden" animate="show">
        <motion.div variants={item} className="mb-6 text-center">
          <h1 className="font-display text-3xl uppercase leading-none tracking-tight text-white lg:text-4xl">
            Nova box
          </h1>
          <p className="mt-2 text-sm text-white/55">
            Preenche os dados da tua box para a submeter à plataforma.
          </p>
        </motion.div>

        <motion.form
          variants={item}
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="space-y-4"
        >
          <AuthField
            label="Nome da box"
            placeholder="CrossFit Lisboa"
            autoCapitalize="words"
            trailingIcon={BoxIcon}
            error={form.formState.errors.name?.message}
            {...form.register("name")}
          />

          <AuthField
            label="Slug (URL)"
            placeholder="crossfit-lisboa"
            autoCapitalize="none"
            hint="Identificador único — não pode ser alterado depois."
            trailingIcon={LinkIcon}
            error={form.formState.errors.slug?.message}
            {...form.register("slug", {
              onChange: () => {
                slugEditedRef.current = true;
              },
            })}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AuthField
              label="Cidade"
              placeholder="Lisboa"
              autoCapitalize="words"
              trailingIcon={LocationIcon}
              error={form.formState.errors.city?.message}
              {...form.register("city")}
            />

            <AuthField
              label="Telefone"
              placeholder="+351 912 345 678"
              type="tel"
              inputMode="tel"
              hint="Opcional"
              trailingIcon={PhoneIcon}
              error={form.formState.errors.phone?.message}
              {...form.register("phone")}
            />
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
              {form.formState.isSubmitting ? "A submeter..." : "Submeter para aprovação"}
            </PrimaryButton>
          </div>
        </motion.form>
      </motion.div>
    </AuthSplitShell>
  );
}
