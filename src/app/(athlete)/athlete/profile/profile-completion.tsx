"use client";

import type { AthleteFullProfile } from "@/lib/athlete/profile-actions";

const FIELDS: Array<{ key: keyof AthleteFullProfile; label: string }> = [
  { key: "avatar_url", label: "Foto de perfil" },
  { key: "nickname", label: "Nickname" },
  { key: "phone", label: "Telemóvel" },
  { key: "birth_date", label: "Data de nascimento" },
  { key: "emergency_contact", label: "Contacto de emergência" },
];

interface Props {
  profile: AthleteFullProfile;
}

export function ProfileCompletion({ profile }: Props) {
  const missing: string[] = [];
  let filled = 0;
  for (const f of FIELDS) {
    if (profile[f.key]) {
      filled++;
    } else {
      missing.push(f.label);
    }
  }
  const pct = Math.round((filled / FIELDS.length) * 100);

  if (pct === 100) return null;

  return (
    <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-primary">
          Perfil {pct}% completo
        </p>
        <span className="text-xs text-text-tertiary">
          {missing.length} campo{missing.length !== 1 ? "s" : ""} em falta
        </span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-yellow-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xs text-text-tertiary">Em falta: {missing.join(", ")}</p>
    </div>
  );
}
