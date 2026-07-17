"use client";

import { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { createPost, deletePost, togglePin, uploadPostImage } from "@/lib/box/post-actions";
import type { BoxPost, PostType } from "@/lib/box/post-actions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function avatarInitial(name: string | null) {
  return (name ?? "B").charAt(0).toUpperCase();
}

/* ── Type pill ───────────────────────────────────────────────── */
function TypePill({ type }: { type: PostType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        type === "recado"
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          : "bg-accent/10 text-accent"
      )}
    >
      {type === "recado" ? "Recado" : "Post"}
    </span>
  );
}

/* ── Image upload button ─────────────────────────────────────── */
function ImageUpload({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (url: string) => void;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const result = await uploadPostImage(fd);
    setUploading(false);
    if (result.error) {
      toast.error(result.error);
    } else if (result.url) {
      onChange(result.url);
    }
    // reset so same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-text-secondary transition-colors",
            "hover:border-accent/40 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
          )}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
            <rect x="1" y="1" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.35" />
            <circle cx="4.5" cy="4.5" r="1.25" stroke="currentColor" strokeWidth="1.2" />
            <path d="M1 9.5l3-3 2.5 2.5 2-2 3.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {uploading ? "A fazer upload…" : value ? "Substituir imagem" : "Adicionar imagem"}
        </button>
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-xs text-text-tertiary hover:text-red-500 transition-colors"
          >
            Remover
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="sr-only"
        onChange={handleFile}
        aria-label="Escolher imagem"
      />
      {value && (
        <div className="overflow-hidden rounded-xl border border-border">
          <img
            src={value}
            alt="Pré-visualização"
            className="max-h-48 w-full object-cover"
          />
        </div>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────── */

interface Props {
  posts: BoxPost[];
  boxId: string;
  slug: string;
}

export function PostsClient({ posts: initial, boxId, slug }: Props) {
  const [posts, setPosts] = useState(initial);
  const [type, setType] = useState<PostType>("post");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    if (!body.trim() && !imageUrl.trim()) {
      toast.error("Adiciona texto ou imagem.");
      return;
    }
    if (type === "recado" && imageUrl) {
      toast.error("Recados são só texto.");
      return;
    }
    startTransition(async () => {
      const result = await createPost(boxId, slug, {
        type,
        body: body || undefined,
        image_url: imageUrl || undefined,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(type === "recado" ? "Recado publicado!" : "Post publicado!");
        setBody("");
        setImageUrl("");
      }
    });
  }

  function handleDelete(postId: string) {
    startTransition(async () => {
      const result = await deletePost(postId, slug);
      if (result.error) {
        toast.error(result.error);
      } else {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        setConfirmDeleteId(null);
        toast.success("Eliminado.");
      }
    });
  }

  function handlePin(postId: string, currentlyPinned: boolean) {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, pinned: !currentlyPinned } : p))
    );
    startTransition(async () => {
      const result = await togglePin(postId, currentlyPinned, slug);
      if (result.error) {
        toast.error(result.error);
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, pinned: currentlyPinned } : p))
        );
      }
    });
  }

  const isRecado = type === "recado";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl uppercase text-text-primary">Feed de Notícias</h1>
        <p className="label-caps mt-1 text-text-tertiary">
          Comunica com os membros da box
        </p>
      </div>

      {/* Composer */}
      <div className="rounded-2xl border border-border bg-bg-card p-4 space-y-4">
        {/* Type toggle */}
        <div className="flex items-center gap-1 rounded-xl bg-bg-input p-1 w-fit">
          {(["post", "recado"] as PostType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); if (t === "recado") setImageUrl(""); }}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-150",
                type === t
                  ? "bg-bg-card text-text-primary shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary"
              )}
            >
              {t === "post" ? "Post" : "Recado"}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              isRecado
                ? "Escreve um recado curto…"
                : "Escreve uma mensagem para os membros…"
            }
            rows={isRecado ? 2 : 3}
            maxLength={isRecado ? 280 : undefined}
            className="w-full resize-none rounded-xl border border-border bg-bg-input px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {isRecado && (
            <p className="text-right text-[11px] text-text-tertiary tabular-nums">
              {body.length}/280
            </p>
          )}
        </div>

        {!isRecado && (
          <ImageUpload
            value={imageUrl}
            onChange={setImageUrl}
            disabled={pending}
          />
        )}

        <div className="flex justify-end">
          <button
            type="button"
            disabled={pending || (!body.trim() && !imageUrl.trim())}
            onClick={handleCreate}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-opacity disabled:opacity-40"
          >
            {pending ? "A publicar…" : "Publicar"}
          </button>
        </div>
      </div>

      {/* Posts list */}
      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-text-tertiary">
            Ainda não há nada publicado. Começa acima!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {posts.map((post) => (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className={cn(
                  "rounded-2xl border bg-bg-card overflow-hidden",
                  post.pinned ? "border-accent/40" : "border-border"
                )}
              >
                {post.image_url && (
                  <img
                    src={post.image_url}
                    alt=""
                    className="w-full max-h-64 object-cover"
                  />
                )}
                <div className="p-4 space-y-2.5">
                  {/* Meta row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                        {avatarInitial(post.author_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-medium text-text-primary leading-none">
                            {post.author_name ?? "Box"}
                          </p>
                          <TypePill type={post.type} />
                          {post.pinned && (
                            <span
                              className="text-[10px] text-accent"
                              title="Fixado na dashboard"
                              aria-label="Post fixado"
                            >
                              📌
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-text-tertiary mt-0.5">
                          {formatDate(post.published_at)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="flex items-center gap-0.5 text-xs text-text-tertiary mr-1">
                        <span aria-hidden>❤️</span>
                        {post.reaction_count}
                      </span>

                      {/* Pin */}
                      <button
                        type="button"
                        title={post.pinned ? "Desafixar" : "Fixar na dashboard"}
                        disabled={pending}
                        onClick={() => handlePin(post.id, post.pinned)}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                          post.pinned
                            ? "text-accent hover:text-text-tertiary"
                            : "text-text-tertiary hover:text-accent"
                        )}
                      >
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
                          <path d="M5 1.5h4M7 1.5v4l2.5 2.5H4.5L7 5.5V1.5M7 9v4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>

                      {/* Delete */}
                      {confirmDeleteId === post.id ? (
                        <div className="flex items-center gap-1.5 ml-1">
                          <span className="text-[11px] text-text-tertiary">Eliminar?</span>
                          <button
                            onClick={() => handleDelete(post.id)}
                            disabled={pending}
                            className="text-[11px] font-semibold text-red-500 hover:underline disabled:opacity-50"
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[11px] text-text-tertiary"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(post.id)}
                          title="Eliminar"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                        >
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {post.body && (
                    <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                      {post.body}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
