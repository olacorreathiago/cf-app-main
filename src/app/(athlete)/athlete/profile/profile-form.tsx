"use client";

import { useActionState, useState } from "react";
import { useEffect, useRef } from "react";
import { FieldInput } from "@/components/shared";
import { PrimaryButton } from "@/components/shared";
import { updateAthleteProfile } from "@/lib/athlete/profile-actions";
import type { AthleteFullProfile } from "@/lib/athlete/profile-actions";
import { cn } from "@/lib/utils";

const GENDER_OPTIONS = [
  { value: "male",   label: "Homem" },
  { value: "female", label: "Mulher" },
  { value: "other",  label: "Prefiro não dizer" },
] as const;

interface Props {
  profile: AthleteFullProfile;
}

export function ProfileForm({ profile }: Props) {
  const [state, action, pending] = useActionState(updateAthleteProfile, {});
  const successRef = useRef(false);
  const [gender, setGender] = useState<string>(profile.gender ?? "");

  useEffect(() => {
    if (state.success && !successRef.current) {
      successRef.current = true;
      setTimeout(() => {
        successRef.current = false;
      }, 3000);
    }
  }, [state.success]);

  return (
    <form action={action} className="space-y-5">
      {/* Feedback */}
      {state.error && (
        <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
          Perfil guardado com sucesso.
        </div>
      )}

      {/* Email (read-only) */}
      <FieldInput
        label="Email"
        value={profile.email}
        disabled
        hint="O email não pode ser alterado."
      />

      <FieldInput
        label="Nome completo"
        name="full_name"
        defaultValue={profile.full_name ?? ""}
        placeholder="O teu nome completo"
        required
      />

      <FieldInput
        label="Nickname"
        name="nickname"
        defaultValue={profile.nickname ?? ""}
        placeholder="Como és conhecido no box"
      />

      {/* Género */}
      <div>
        <p className="text-sm font-medium text-text-secondary mb-2">
          Género <span className="text-text-tertiary font-normal text-xs">(usado no leaderboard)</span>
        </p>
        <input type="hidden" name="gender" value={gender} />
        <div className="flex rounded-xl border border-border overflow-hidden">
          {GENDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setGender(opt.value)}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                gender === opt.value
                  ? "bg-accent text-accent-fg"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FieldInput
          label="Telemóvel"
          name="phone"
          type="tel"
          defaultValue={profile.phone ?? ""}
          placeholder="+351 9XX XXX XXX"
        />
        <FieldInput
          label="Data de nascimento"
          name="birth_date"
          type="date"
          defaultValue={profile.birth_date ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FieldInput
          label="Altura (cm)"
          name="height_cm"
          type="number"
          min={80}
          max={260}
          defaultValue={profile.height_cm ?? ""}
          placeholder="175"
        />
        <FieldInput
          label="Nacionalidade"
          name="nationality"
          defaultValue={profile.nationality ?? ""}
          placeholder="Portuguesa"
        />
      </div>

      <FieldInput
        label="NIF"
        name="tax_id"
        defaultValue={profile.tax_id ?? ""}
        placeholder="123456789"
        hint="Necessário para faturação."
      />

      <FieldInput
        label="Contacto de emergência"
        name="emergency_contact"
        defaultValue={profile.emergency_contact ?? ""}
        placeholder="Nome e telemóvel"
      />

      <PrimaryButton type="submit" loading={pending}>
        Guardar alterações
      </PrimaryButton>
    </form>
  );
}
