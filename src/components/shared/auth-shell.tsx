import * as React from "react";
import Link from "next/link";
import { AppLogo } from "./app-logo";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Dark auth input — label + trailing icon, theme-independent                */
/* -------------------------------------------------------------------------- */

interface AuthFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /** Icon rendered on the right inside the input. */
  trailingIcon?: React.ReactNode;
}

export const AuthField = React.forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, error, hint, trailingIcon, className, id, ...props }, ref) => {
    const inputId = id ?? React.useId();
    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-white/85">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            className={cn(
              "h-14 w-full rounded-2xl border border-white/[0.16] bg-transparent px-4 text-base text-white",
              "placeholder:text-white/35",
              "outline-none transition-colors duration-150",
              "focus:border-accent/70",
              "aria-invalid:border-error aria-invalid:focus:border-error",
              trailingIcon && "pr-12",
              className
            )}
            {...props}
          />
          {trailingIcon && (
            <span className="pointer-events-none absolute right-4 flex items-center text-white/40">
              {trailingIcon}
            </span>
          )}
        </div>
        {error ? (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        ) : hint ? (
          <p className="text-sm text-white/40">{hint}</p>
        ) : null}
      </div>
    );
  }
);
AuthField.displayName = "AuthField";

/* -------------------------------------------------------------------------- */
/*  Shared pieces                                                             */
/* -------------------------------------------------------------------------- */

function BackButton({ href }: { href: string }) {
  return (
    <Link
      href={href}
      aria-label="Voltar"
      className="flex h-10 w-10 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

/** Frosted dark card used across the centered auth screens. */
export function AuthCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[28px] border border-white/[0.06] bg-white/[0.05] p-7 backdrop-blur-sm sm:p-8",
        className
      )}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Centered shell — login, check e-mail, review                              */
/* -------------------------------------------------------------------------- */

export function AuthCenteredShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  /** Small print rendered under the card (e.g. terms). */
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-[440px]">
        <div className="mb-9 flex justify-center">
          <AppLogo size="xl" />
        </div>
        {children}
        {footer && (
          <div className="mt-6 text-center text-sm text-white/45">{footer}</div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Split shell — role, athlete, professional onboarding                      */
/* -------------------------------------------------------------------------- */

export function AuthSplitShell({
  children,
  backHref,
  heroTitle,
  heroSubtitle,
}: {
  /** Right-hand form content. */
  children: React.ReactNode;
  backHref?: string;
  /** Hero headline. Defaults to the onboarding tagline. */
  heroTitle?: React.ReactNode;
  /** Hero supporting copy. Defaults to the product blurb. */
  heroSubtitle?: React.ReactNode;
}) {
  return (
    <div className="lg:grid lg:min-h-[100svh] lg:grid-cols-2">
      {/* Hero — desktop only */}
      <aside className="relative hidden lg:flex lg:flex-col lg:justify-center lg:px-16 xl:px-20">
        <AppLogo size="xl" />
        <h2 className="mt-8 font-display text-[clamp(3.25rem,5.5vw,5rem)] uppercase leading-[0.88] text-white">
          {heroTitle ?? (
            <>
              Treina.<br />
              Evolui.<br />
              Supera.
            </>
          )}
        </h2>
        <p className="mt-6 max-w-sm text-base leading-relaxed text-white/45">
          {heroSubtitle ??
            "Com o Zekko tens a gestão completa para boxes de CrossFit. Aulas, WODs, métricas e comunidade — tudo num só lugar."}
        </p>
        {/* vertical divider */}
        <span
          aria-hidden
          className="absolute inset-y-[14%] right-0 w-px bg-white/[0.08]"
        />
      </aside>

      {/* Form panel */}
      <main className="flex min-h-[100svh] flex-col px-6 py-8 lg:justify-center lg:px-16 xl:px-20">
        {/* Mobile header: back + logo */}
        <div className="relative mb-10 flex h-10 items-center lg:hidden">
          {backHref && <div className="absolute left-0"><BackButton href={backHref} /></div>}
          <div className="mx-auto">
            <AppLogo size="lg" />
          </div>
        </div>

        {/* Desktop back */}
        {backHref && (
          <div className="mb-8 hidden lg:block">
            <BackButton href={backHref} />
          </div>
        )}

        <div className="mx-auto w-full max-w-[420px] lg:mx-0">{children}</div>
      </main>
    </div>
  );
}
