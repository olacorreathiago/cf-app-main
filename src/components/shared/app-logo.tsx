import { APP_CONFIG } from "@/lib/config";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-5xl",
};

/**
 * Zekko wordmark — condensed gothic display type in brand gold with a
 * trailing dot, matching the Figma identity. Defaults to gold; pass a
 * `text-*` colour via `className` to override (className wins over the base).
 */
export function AppLogo({ className, size = "md" }: AppLogoProps) {
  return (
    <span
      className={cn(
        "font-display uppercase leading-none tracking-tight text-accent select-none",
        sizes[size],
        className
      )}
    >
      {APP_CONFIG.name}
      <span className="text-accent">.</span>
    </span>
  );
}
