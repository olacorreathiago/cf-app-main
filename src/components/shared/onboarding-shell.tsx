"use client";

import { useRouter } from "next/navigation";
import { AppLogo } from "@/components/shared/app-logo";
import { cn } from "@/lib/utils";

interface OnboardingShellProps {
  children: React.ReactNode;
  /** Back button destination. Omit to hide the back button. */
  backHref?: string;
  /** Called instead of router.push(backHref) if provided */
  onBack?: () => void;
  className?: string;
}

export function OnboardingShell({
  children,
  backHref,
  onBack,
  className,
}: OnboardingShellProps) {
  const router = useRouter();

  function handleBack() {
    if (onBack) {
      onBack();
    } else if (backHref) {
      router.push(backHref);
    }
  }

  const showBack = Boolean(backHref || onBack);

  return (
    <div className={cn(
      // Mobile: full viewport, no scroll
      "relative flex h-[100svh] flex-col overflow-hidden px-6 pb-8",
      // Desktop: let the auth layout handle height/centering
      "lg:h-full lg:overflow-visible lg:px-10 lg:pb-0",
      className
    )}>
      {/* Top bar — hidden entirely on desktop (brand panel handles branding) */}
      <div className="flex h-14 items-center justify-center lg:hidden">
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            aria-label="Voltar"
            className={cn(
              "absolute left-0 flex h-10 w-10 items-center justify-center",
              "rounded-full text-text-secondary transition-colors duration-150",
              "hover:bg-bg-card hover:text-text-primary",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            )}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12.5 15L7.5 10L12.5 5"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        <AppLogo className="lg:hidden" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
