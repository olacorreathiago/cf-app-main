"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toggleReaction } from "@/lib/athlete/feed-actions";
import type { FeedPost } from "@/lib/athlete/feed-actions";

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "agora mesmo";
  if (diffMins < 60) return `há ${diffMins} min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `há ${diffDays} dias`;
  return date.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
}

/* ── Post Drawer (only for type="post") ──────────────────────── */

function PostDrawer({ post, onClose }: { post: FeedPost; onClose: () => void }) {
  const [reacted, setReacted] = useState(post.my_reaction);
  const [count, setCount] = useState(post.reaction_count);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleToggle() {
    const next = !reacted;
    setReacted(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      const result = await toggleReaction(post.id, reacted);
      if (result.error) {
        setReacted(reacted);
        setCount((c) => c + (reacted ? 1 : -1));
      }
    });
  }

  const publishedLabel = new Date(post.published_at).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        key="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Post de ${post.box_name}`}
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "rounded-t-3xl border-t border-border bg-bg-base",
          "lg:bottom-0 lg:left-auto lg:right-0 lg:top-0 lg:w-[440px]",
          "lg:rounded-none lg:rounded-l-3xl lg:border-l lg:border-t-0",
          "overflow-y-auto max-h-[90svh] lg:max-h-none"
        )}
      >
        <div className="flex justify-center pt-4 pb-1 lg:hidden" aria-hidden>
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        <div className="flex items-center justify-between px-5 pb-3 pt-4 lg:pt-6">
          <div className="flex items-center gap-1.5">
            <p className="label-caps text-text-tertiary">Post</p>
            {post.pinned && (
              <span className="text-xs text-accent" aria-label="Fixado">📌</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-input text-text-tertiary transition-colors hover:text-text-primary"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-3 px-5 pb-4">
          {post.box_logo_url ? (
            <img src={post.box_logo_url} alt={post.box_name} className="h-9 w-9 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg text-sm font-bold">
              {post.box_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-text-primary">{post.box_name}</p>
            <p className="text-[11px] text-text-tertiary capitalize">
              <time dateTime={post.published_at}>{publishedLabel}</time>
            </p>
          </div>
        </div>

        {post.image_url && (
          <img src={post.image_url} alt="" className="w-full object-cover max-h-72" />
        )}

        {post.body && (
          <div className="px-5 py-4">
            <p className="text-base text-text-primary leading-relaxed whitespace-pre-wrap">
              {post.body}
            </p>
          </div>
        )}

        <div className="border-t border-border/60 px-5 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleToggle}
            disabled={pending}
            aria-label={reacted ? "Remover reacção" : "Reagir com ❤️"}
            aria-pressed={reacted}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
              reacted
                ? "bg-red-50 text-red-500 dark:bg-red-500/10"
                : "border border-border text-text-tertiary hover:border-red-200 hover:text-red-400"
            )}
          >
            <motion.span
              key={reacted ? "on" : "off"}
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
              aria-hidden
              className="text-base leading-none"
            >
              {reacted ? "❤️" : "🤍"}
            </motion.span>
            <AnimatePresence mode="wait">
              <motion.span
                key={count}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className="tabular-nums"
              >
                {count > 0 ? count : "Reagir"}
              </motion.span>
            </AnimatePresence>
          </button>

          <Link
            href={`/athlete/feed/${post.id}`}
            className="text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
          >
            Ver post completo →
          </Link>
        </div>
      </motion.div>
    </>
  );
}

/* ── Preview cards ───────────────────────────────────────────── */

function PostPreviewCard({ post, onClick }: { post: FeedPost; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-border bg-bg-base overflow-hidden transition-all duration-150 hover:border-accent/30 hover:bg-bg-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex items-start gap-3 p-3">
        {post.image_url && (
          <img src={post.image_url} alt="" aria-hidden className="h-12 w-12 rounded-lg object-cover shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          {post.body && (
            <p className="text-sm text-text-primary line-clamp-2 leading-snug">{post.body}</p>
          )}
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            {post.pinned && <span className="text-[10px] text-accent" aria-label="Fixado">📌</span>}
            <time dateTime={post.published_at} className="text-[11px] text-text-tertiary">
              {formatDate(post.published_at)}
            </time>
            {post.reaction_count > 0 && (
              <span className="text-[11px] text-text-tertiary">· ❤️ {post.reaction_count}</span>
            )}
          </div>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="shrink-0 mt-0.5 text-text-tertiary">
          <path d="M4 7h6M7 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </button>
  );
}

function RecadoRow({ post }: { post: FeedPost }) {
  return (
    <Link
      href="/athlete/feed"
      className="flex items-start gap-2.5 rounded-xl border border-border bg-bg-base px-3 py-2.5 transition-all duration-150 hover:border-accent/30 hover:bg-bg-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
          <path d="M5 1.5v4M5 7.5v1" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        {post.body && (
          <p className="text-sm text-text-primary line-clamp-2 leading-snug">{post.body}</p>
        )}
        <time dateTime={post.published_at} className="mt-1 block text-[11px] text-text-tertiary">
          {formatDate(post.published_at)}
        </time>
      </div>
    </Link>
  );
}

/* ── Main export ─────────────────────────────────────────────── */

interface Props {
  posts: FeedPost[];
  boxName: string;
}

export function FeedPreview({ posts, boxName }: Props) {
  const [activePost, setActivePost] = useState<FeedPost | null>(null);

  if (posts.length === 0) return null;

  const pinnedPosts = posts.filter((p) => p.pinned);
  const otherPosts = posts.filter((p) => !p.pinned);
  const ordered = [...pinnedPosts, ...otherPosts];

  return (
    <>
      <div className="rounded-2xl border border-border bg-bg-card overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <p className="label-caps text-text-tertiary">Recados da box</p>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-bg-input px-2 py-0.5 text-[10px] font-medium text-text-tertiary">
              {boxName}
            </span>
            <Link
              href="/athlete/feed"
              className="text-xs text-text-tertiary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              Ver tudo →
            </Link>
          </div>
        </div>
        <div className="px-4 pb-4 space-y-2">
          {ordered.map((post) =>
            post.type === "recado" ? (
              <RecadoRow key={post.id} post={post} />
            ) : (
              <PostPreviewCard
                key={post.id}
                post={post}
                onClick={() => setActivePost(post)}
              />
            )
          )}
        </div>
      </div>

      <AnimatePresence>
        {activePost && (
          <PostDrawer post={activePost} onClose={() => setActivePost(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
