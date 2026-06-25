"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { updateAvatarUrl } from "@/lib/athlete/profile-actions";

interface Props {
  userId: string;
  avatarUrl: string | null;
  displayName: string;
}

export function AvatarUpload({ userId, avatarUrl, displayName }: Props) {
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [uploading, startUpload] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const initial = (displayName || "A").charAt(0).toUpperCase();

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Ficheiro inválido. Usa uma imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Imagem demasiado grande. Máximo 5 MB.");
      return;
    }

    setError(null);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/avatar.${ext}`;

    startUpload(async () => {
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        setError("Erro ao carregar imagem. Tenta novamente.");
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust so the new image shows immediately
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      // Optimistic preview before the server round-trip
      setPreview(publicUrl);

      await updateAvatarUrl(publicUrl);

      // Refresh server component data (updates completion bar + layout ring)
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group relative h-20 w-20 rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base"
        aria-label="Alterar foto de perfil"
      >
        {preview ? (
          <img src={preview} alt={displayName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-accent/20 text-2xl font-semibold text-accent">
            {initial}
          </div>
        )}

        {/* Overlay */}
        <div
          className={[
            "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 transition-opacity duration-150",
            uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          ].join(" ")}
        >
          {uploading ? (
            <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-white">
              <path d="M10 3v10M6 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 17h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </div>
      </button>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-xs text-accent hover:underline disabled:opacity-50"
      >
        {uploading ? "A carregar…" : "Alterar foto"}
      </button>

      {error && <p className="text-xs text-error">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
