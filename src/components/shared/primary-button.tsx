import { cn } from "@/lib/utils";

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "light";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  /** Icon or element on the right side */
  trailing?: React.ReactNode;
}

const variants = {
  primary: cn(
    "bg-accent text-accent-fg font-semibold",
    "hover:bg-accent-hover active:scale-[0.98]",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:bg-accent/40 disabled:text-accent-fg/60"
  ),
  // Cream neutral CTA — used on the dark auth entry screens
  light: cn(
    "bg-[#E8E6DF] text-[#0A0A0A] font-semibold",
    "hover:bg-[#D9D7CE] active:scale-[0.98]",
    "focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]",
    "disabled:opacity-50"
  ),
  secondary: cn(
    "bg-bg-card text-text-primary font-medium border border-border",
    "hover:bg-bg-card-hover hover:border-border-strong",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:opacity-40"
  ),
  ghost: cn(
    "text-text-secondary font-medium",
    "hover:text-text-primary hover:bg-bg-card",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:opacity-40"
  ),
};

const sizes = {
  sm: "h-9 px-5 text-sm gap-2",
  md: "h-12 px-7 text-base gap-2.5",
  lg: "h-14 px-8 text-lg gap-3",
};

export function PrimaryButton({
  variant = "primary",
  size = "md",
  loading = false,
  trailing,
  className,
  children,
  disabled,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex w-full items-center justify-center rounded-2xl",
        "outline-none select-none",
        "transition-all duration-150",
        "disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg
            className="size-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {children}
        </span>
      ) : (
        <>
          <span>{children}</span>
          {trailing && <span aria-hidden="true">{trailing}</span>}
        </>
      )}
    </button>
  );
}
