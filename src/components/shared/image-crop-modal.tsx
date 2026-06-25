"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";

interface Props {
  imageSrc: string;
  aspect?: number;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

async function getCroppedBlob(imageSrc: string, croppedArea: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = croppedArea.width;
  canvas.height = croppedArea.height;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    croppedArea.x,
    croppedArea.y,
    croppedArea.width,
    croppedArea.height,
    0,
    0,
    croppedArea.width,
    croppedArea.height
  );

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Canvas empty"))), "image/jpeg", 0.92)
  );
}

export function ImageCropModal({ imageSrc, aspect = 1, onConfirm, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  async function handleConfirm() {
    if (!croppedArea) return;
    setProcessing(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea);
      onConfirm(blob);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-bg-card border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <p className="text-sm font-semibold text-text-primary">Recortar imagem</p>
          <p className="text-xs text-text-tertiary mt-0.5">Ajusta e recorta em formato quadrado</p>
        </div>

        {/* Crop area */}
        <div className="relative h-72 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom slider */}
        <div className="px-4 py-3 border-b border-border">
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-accent"
            aria-label="Zoom"
          />
        </div>

        <div className="flex justify-end gap-2 p-4">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={processing}>
            Cancelar
          </Button>
          <Button type="button" size="sm" onClick={handleConfirm} disabled={processing}>
            {processing ? "A processar…" : "Aplicar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
