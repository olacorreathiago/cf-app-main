"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { boxInfoSchema, type BoxInfoInput } from "@/schemas/box-settings";
import { updateBoxInfo } from "@/lib/box/settings-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BoxFull } from "@/types";

interface Props {
  box: BoxFull;
  canEdit: boolean;
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
      logo_url: box.logo_url ?? "",
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Nome da box</Label>
          <Input id="name" {...register("name")} disabled={!canEdit} className="mt-1" />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="address">Morada</Label>
          <Input id="address" {...register("address")} disabled={!canEdit} className="mt-1" />
        </div>

        <div>
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" {...register("city")} disabled={!canEdit} className="mt-1" />
        </div>

        <div>
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" {...register("phone")} disabled={!canEdit} className="mt-1" />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} disabled={!canEdit} className="mt-1" />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div>
          <Label htmlFor="website">Website</Label>
          <Input id="website" {...register("website")} placeholder="https://" disabled={!canEdit} className="mt-1" />
          {errors.website && <p className="mt-1 text-xs text-red-500">{errors.website.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="logo_url">Logo (URL)</Label>
          <Input id="logo_url" {...register("logo_url")} placeholder="https://" disabled={!canEdit} className="mt-1" />
          {errors.logo_url && <p className="mt-1 text-xs text-red-500">{errors.logo_url.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="description">Descrição</Label>
          <textarea
            id="description"
            {...register("description")}
            disabled={!canEdit}
            rows={3}
            className="mt-1 w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 resize-none"
          />
        </div>
      </div>

      {canEdit && (
        <div className="flex justify-end">
          <Button type="submit" disabled={pending} size="sm">
            {pending ? "A guardar…" : "Guardar informações"}
          </Button>
        </div>
      )}
    </form>
  );
}
