interface ClosedBoxBadgeProps {
  /** Owner's closure message — shown as the tooltip. Always rendered as plain text. */
  closureMessage?: string | null;
  className?: string;
}

const DEFAULT_TOOLTIP = "Esta box encerrou.";

export function ClosedBoxBadge({ closureMessage, className }: ClosedBoxBadgeProps) {
  return (
    <span
      title={closureMessage?.trim() || DEFAULT_TOOLTIP}
      className={`inline-flex items-center rounded-full bg-bg-input px-2 py-0.5 text-[10px] font-medium text-text-tertiary ${className ?? ""}`}
    >
      Box encerrada
    </span>
  );
}
