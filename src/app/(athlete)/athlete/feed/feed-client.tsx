"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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

function BoxAvatar({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) {
  const initial = name.charAt(0).toUpperCase();
  return logoUrl ? (
    <img
      src={logoUrl}
      alt={name}
      className="h-9 w-9 rounded-xl object-cover shrink-0"
    />
  ) : (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg text-sm font-bold">
      {initial}
    </div>
  );
}

function HeartButton({
  postId,
  initialReacted,
  initialCount,
}: {
  postId: string;
  initialReacted: boolean;
  initialCount: number;
}) {
  const [reacted, setReacted] = useState(initialReacted);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    const next = !reacted;
    setReacted(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      const result = await toggleReaction(postId, reacted);
      if (result.error) {
        setReacted(reacted);
        setCount((c) => c + (reacted ? 1 : -1));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      aria-label={reacted ? "Remover reacção" : "Reagir com ❤️"}
      aria-pressed={reacted}
      className={cn(
        "group flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        reacted
          ? "bg-red-50 text-red-500 dark:bg-red-500/10"
          : "text-text-tertiary hover:bg-bg-input hover:text-text-secondary"
      )}
    >
      <motion.span
        key={reacted ? "on" : "off"}
        initial={{ scale: 0.7 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        aria-hidden
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
          className="tabular-nums leading-none"
        >
          {count > 0 ? count : ""}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function PostCard({ post }: { post: FeedPost }) {
  const isLong = (post.body?.length ?? 0) > 200;
  const [expanded, setExpanded] = useState(false);
  const displayBody =
    isLong && !expanded ? post.body!.slice(0, 200).trimEnd() + "…" : post.body;

  return (
    <article
      className={cn(
        "rounded-2xl border bg-bg-card overflow-hidden transition-shadow duration-200 hover:shadow-sm",
        post.pinned ? "border-accent/40" : "border-border"
      )}
      aria-label={`${post.type === "recado" ? "Recado" : "Post"} de ${post.box_name}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <BoxAvatar name={post.box_name} logoUrl={post.box_logo_url} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary truncate">
            {post.box_name}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <time dateTime={post.published_at} className="text-[11px] text-text-tertiary">
              {formatDate(post.published_at)}
            </time>
            {post.author_name && (
              <span className="text-[11px] text-text-tertiary">· {post.author_name}</span>
            )}
            {post.type === "recado" && (
              <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Recado
              </span>
            )}
          </div>
        </div>

        {/* Link to detail */}
        {post.pinned && (
          <span className="text-sm shrink-0" aria-label="Post fixado" title="Fixado">📌</span>
        )}
        <Link
          href={`/athlete/feed/${post.id}`}
          aria-label="Ver post completo"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-bg-input hover:text-text-primary"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M4 7h6M7 4l3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>

      {/* Image */}
      {post.image_url && (
        <Link href={`/athlete/feed/${post.id}`} tabIndex={-1} aria-hidden>
          <img
            src={post.image_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full object-cover max-h-80"
          />
        </Link>
      )}

      {/* Body */}
      {post.body && (
        <div className={cn("px-4", post.image_url ? "pt-3" : "pt-0", "pb-3")}>
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
            {displayBody}
          </p>
          {isLong && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-1 text-xs font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
            >
              Ver mais
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border/60 px-3 py-2">
        <HeartButton
          postId={post.id}
          initialReacted={post.my_reaction}
          initialCount={post.reaction_count}
        />
        <Link
          href={`/athlete/feed/${post.id}`}
          className="rounded-lg px-3 py-1.5 text-xs text-text-tertiary transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Ver post →
        </Link>
      </div>
    </article>
  );
}

interface Props {
  posts: FeedPost[];
}

export function FeedClient({ posts }: Props) {
  return (
    <div className="space-y-4" role="feed" aria-label="Feed da box" aria-busy="false">
      {posts.map((post, i) => (
        <motion.div
          key={post.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.04, 0.24), duration: 0.28 }}
        >
          <PostCard post={post} />
        </motion.div>
      ))}
    </div>
  );
}
