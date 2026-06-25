import { APP_CONFIG } from "@/lib/config";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: "text-sm tracking-[0.22em]",
  md: "text-xs tracking-[0.28em]",
  lg: "text-base tracking-[0.32em]",
};

export function AppLogo({ className, size = "md" }: AppLogoProps) {
  return (
    <span
      className={cn(
        "font-semibold uppercase text-text-primary select-none",
        sizes[size],
        className
      )}
    >
      {APP_CONFIG.name}
    </span>
  );
}
