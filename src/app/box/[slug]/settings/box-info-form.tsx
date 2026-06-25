"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { boxInfoSchema, type BoxInfoInput } from "@/schemas/box-settings";
import { updateBoxInfo } from "@/lib/box/settings-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BoxLogoUpload } from "./box-logo-upload";
import type { BoxFull } from "@/types";

interface Props {
  box: BoxFull;
  canEdit: boolean;
}

function InfoRow({
  label,
  description,
  error,
  children,
}: {
  label: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between py-5 border-b border-border last:border-0">
      <div className="sm:max-w-xs shrink-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && <p className="text-sm text-text-tertiary mt-0.5">{description}</p>}
      </div>
      <div className="sm:w-64 shrink-0 space-y-1">
        {children}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}

export function BoxInfoForm({ box, canEdit }: Props) {
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BoxInfoInput>({
    resolver: zodResolver(boxInfoSchema),
    defaultValues: {
      name: box.name,
      address: box.address ?? "",
      city: box.city ?? "",
      phone: box.phone ?? "",
      email: box.email ?? "",
      website: box.website ?? "",
      description: box.description ?? "",
    },
  });

  function onSubmit(data: BoxInfoInput) {
    startTransition(async () => {
      const result = await updateBoxInfo(box.id, data);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Informações actualizadas");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-0">

      {/* Logo — upload independente, sem guardar com o resto do form */}
      <div className="pb-5 mb-0 border-b border-border">
        <BoxLogoUpload
          boxId={box.id}
          logoUrl={box.logo_url}
          boxName={box.name}
          canEdit={canEdit}
        />
      </div>

      <InfoRow label="Nome da box" error={errors.name?.message}>
        <Input id="name" {...register("name")} disabled={!canEdit} />
      </InfoRow>

      <InfoRow label="Morada">
        <Input id="address" {...register("address")} disabled={!canEdit} />
      </InfoRow>

      <InfoRow label="Cidade">
        <Input id="city" {...register("city")} disabled={!canEdit} />
      </InfoRow>

      <InfoRow label="Telefone">
        <Input id="phone" {...register("phone")} disabled={!canEdit} />
      </InfoRow>

      <InfoRow label="Email" error={errors.email?.message}>
        <Input id="email" type="email" {...register("email")} disabled={!canEdit} />
      </InfoRow>

      <InfoRow label="Website" error={errors.website?.message}>
        <Input id="website" {...register("website")} placeholder="https://" disabled={!canEdit} />
      </InfoRow>

      <InfoRow label="Descrição" description="Apresentação pública da box">
        <textarea
          id="description"
          {...register("description")}
          disabled={!canEdit}
          rows={4}
          className="w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 resize-none"
        />
      </InfoRow>

      {canEdit && (
        <div className="flex justify-end pt-6">
          <Button type="submit" disabled={pending}>
            {pending ? "A guardar…" : "Guardar informações"}
          </Button>
        </div>
      )}
    </form>
  );
}
