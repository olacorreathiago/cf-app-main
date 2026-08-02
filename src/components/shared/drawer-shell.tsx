"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DrawerShellProps {
  open: boolean;
  onClose: () => void;
  /** lg breakpoint side-drawer width class, e.g. "lg:w-[480px]" */
  widthClassName?: string;
  /** Fixed header content (title, back button, etc). The close "X" is rendered automatically. */
  header: React.ReactNode;
  /** Fixed footer content (primary/secondary actions). Omit for no footer. */
  footer?: React.ReactNode;
  /** Scrollable body content. */
  children: React.ReactNode;
  closeLabel?: string;
}

export function DrawerShell({
  open,
  onClose,
  widthClassName = "lg:w-[440px]",
  header,
  footer,
  children,
  closeLabel = "Fechar",
}: DrawerShellProps) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 flex flex-col",
              "min-h-[50dvh] max-h-[92dvh] rounded-t-3xl border-t border-border bg-bg-base",
              "lg:bottom-0 lg:left-auto lg:right-0 lg:top-0 lg:min-h-0 lg:max-h-none lg:h-dvh",
              "lg:rounded-none lg:rounded-l-3xl lg:border-l lg:border-t-0",
              widthClassName
            )}
          >
            {/* Drag handle (mobile) */}
            <div className="mx-auto mt-3 mb-1 h-1 w-10 shrink-0 rounded-full bg-border lg:hidden" />

            {/* Header — fixed, close button always visible */}
            <div className="shrink-0 px-6 pt-4 pb-5 lg:pt-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">{header}</div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={closeLabel}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-input text-text-tertiary transition-colors hover:text-text-primary"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>

            {/* Footer — fixed, subtle fade above so scrolled content is visible passing behind it */}
            {footer && (
              <div className="relative shrink-0">
                <div className="pointer-events-none absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-bg-base to-transparent" />
                <div
                  className="border-t border-border px-6 pt-4 space-y-2"
                  style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
                >
                  {footer}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
