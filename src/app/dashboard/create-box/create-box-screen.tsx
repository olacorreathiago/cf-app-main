"use client";

import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { OnboardingShell, PrimaryButton, FieldInput } from "@/components/shared";
import { createBox } from "@/lib/box/actions";
import { createBoxSchema, type CreateBoxValues } from "@/schemas/onboarding";
import { cn } from "@/lib/utils";

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

  const formContent = (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="flex flex-1 flex-col justify-between lg:justify-start lg:gap-8"
    >
      {/* Heading */}
      <motion.div variants={item} className="pt-6 lg:pt-0">
        <p className="label-caps text-text-tertiary mb-3">Nova box</p>
        <h1 className="font-display text-[2.6rem] leading-[0.92] text-text-primary">
          Cria a tua<br />box.
        </h1>
        <p className="mt-3 text-sm text-text-secondary">
          Após criação, a box entra em revisão antes de ficar visível no diretório.
        </p>
      </motion.div>

      {/* Form */}
      <motion.div variants={item}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
          <FieldInput
            label="Nome da box"
            placeholder="CrossFit Lisboa"
            autoCapitalize="words"
            error={form.formState.errors.name?.message}
            {...form.register("name")}
          />

          <FieldInput
            label="Slug (URL)"
            placeholder="crossfit-lisboa"
            autoCapitalize="none"
            hint="Identificador único — não pode ser alterado depois."
            error={form.formState.errors.slug?.message}
            {...form.register("slug", {
              onChange: () => { slugEditedRef.current = true; },
            })}
          />

          <div className="grid lg:grid-cols-2 gap-3">
            <FieldInput
              label="Cidade"
              placeholder="Lisboa"
              autoCapitalize="words"
              error={form.formState.errors.city?.message}
              {...form.register("city")}
            />

            <FieldInput
              label="Telefone"
              placeholder="+351 912 345 678"
              type="tel"
              inputMode="tel"
              hint="Opcional"
              error={form.formState.errors.phone?.message}
              {...form.register("phone")}
            />
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
              {form.formState.isSubmitting ? "A criar..." : "Criar box"}
            </PrimaryButton>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );

  return (
    <>
      {/* Mobile: full-screen OnboardingShell */}
      <div className="lg:hidden">
        <OnboardingShell backHref="/dashboard">
          {formContent}
        </OnboardingShell>
      </div>

      {/* Desktop: centred card inside dashboard layout */}
      <div className="hidden lg:block mx-auto w-full max-w-lg px-6 py-8">
        <Link
          href="/dashboard"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-text-tertiary transition-colors duration-150 hover:text-text-secondary"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Voltar
        </Link>
        {formContent}
      </div>
    </>
  );
}
