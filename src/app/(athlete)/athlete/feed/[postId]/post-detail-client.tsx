"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toggleReaction } from "@/lib/athlete/feed-actions";

interface Props {
  postId: string;
  initialReacted: boolean;
  initialCount: number;
}

export function PostDetailClient({ postId, initialReacted, initialCount }: Props) {
  const [reacted, setReacted] = useState(initialReacted);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    const next = !reacted;
    setReacted(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      const result = await toggleReaction(postId, reacted, [
        `/athlete/feed/${postId}`,
      ]);
      if (result.error) {
        setReacted(reacted);
        setCount((c) => c + (reacted ? 1 : -1));
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
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
          className="text-lg leading-none"
        >
          {reacted ? "❤️" : "🤍"}
        </motion.span>
        <AnimatePresence mode="wait">
          <motion.span
            key={count}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.15 }}
            className="tabular-nums"
          >
            {count > 0 ? count : "Reagir"}
          </motion.span>
        </AnimatePresence>
      </button>

      {count > 0 && (
        <p className="text-xs text-text-tertiary">
          {count === 1 ? "1 pessoa reagiu" : `${count} pessoas reagiram`}
        </p>
      )}
    </div>
  );
}
