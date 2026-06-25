"use client";

import { useRef, useState, useTransition } from "react";
import { supabase } from "@/lib/supabase/client";
import { updateBoxLogo } from "@/lib/box/settings-actions";
import { ImageCropModal } from "@/components/shared";
import { toast } from "sonner";

interface Props {
  boxId: string;
  logoUrl: string | null;
  boxName: string;
  canEdit: boolean;
}

export function BoxLogoUpload({ boxId, logoUrl, boxName, canEdit }: Props) {
  const [preview, setPreview] = useState<string | null>(logoUrl);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const initial = (boxName || "B").charAt(0).toUpperCase();

  function handleFileChange(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Ficheiro inválido. Usa uma imagem.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem demasiado grande. Máximo 10 MB.");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
  }

  function handleCropConfirm(blob: Blob) {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);

    startUpload(async () => {
      const path = `${boxId}/logo.jpg`;

      // Remove existing file first so we always do an INSERT (avoids needing UPDATE policy)
      await supabase.storage.from("box-assets").remove([path]);

      const { error: uploadError } = await supabase.storage
        .from("box-assets")
        .upload(path, blob, { contentType: "image/jpeg" });

      if (uploadError) {
        toast.error(`Erro: ${uploadError.message}`);
        return;
      }

      const { data } = supabase.storage.from("box-assets").getPublicUrl(path);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

      setPreview(publicUrl);

      const result = await updateBoxLogo(boxId, publicUrl);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Logo actualizado");
      }
    });
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => canEdit && inputRef.current?.click()}
          disabled={uploading || !canEdit}
          className="group relative h-16 w-16 rounded-xl overflow-hidden border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default shrink-0"
          aria-label="Alterar logo da box"
        >
          {preview ? (
            <img src={preview} alt={boxName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-accent/15 text-xl font-bold text-accent">
              {initial}
            </div>
          )}

          {canEdit && (
            <div
              className={[
                "absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity duration-150",
                uploading ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              ].join(" ")}
            >
              {uploading ? (
                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-white">
                  <path d="M10 3v10M6 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3 17h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </div>
          )}
        </button>

        {canEdit && (
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-sm text-accent hover:underline disabled:opacity-50"
            >
              {uploading ? "A carregar…" : "Alterar logo"}
            </button>
            <p className="text-xs text-text-tertiary">PNG, JPG ou WEBP · máx. 10 MB · recorte 1:1</p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileChange(file);
            e.target.value = "";
          }}
        />
      </div>

      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspect={1}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </>
  );
}
