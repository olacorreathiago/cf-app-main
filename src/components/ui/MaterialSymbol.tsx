type MaterialSymbolProps = {
  name: string;
  className?: string;
};

const symbolAliases: Record<string, string> = {
  arrow_back: "arrow_back",
  arrow_forward: "arrow_forward",
  business_center: "work",
  fitness_center: "exercise",
  sports_gymnastics: "sports_gymnastics",
  person: "person",
  mail: "mail",
  smartphone: "smartphone",
  badge: "badge",
  password: "password",
  calendar_month: "calendar_month",
  height: "height",
  monitor_weight: "monitor_weight",
  expand_more: "expand_more",
  check: "check",
  school: "school",
  workspace_premium: "workspace_premium",
  key: "key",
  close: "close",
};

function resolveFontSize(className: string) {
  const arbitrarySizeMatch = className.match(/size-\[([^\]]+)\]/);

  if (arbitrarySizeMatch?.[1]) {
    return arbitrarySizeMatch[1];
  }

  const scaleMatch = className.match(/size-([0-9]+(?:\.[0-9]+)?)/);

  if (!scaleMatch?.[1]) {
    return undefined;
  }

  const scale = Number(scaleMatch[1]);

  if (Number.isNaN(scale)) {
    return undefined;
  }

  return `${scale / 4}rem`;
}

export default function MaterialSymbol({
  name,
  className = "",
}: MaterialSymbolProps) {
  const fontSize = resolveFontSize(className);
  const symbolName = symbolAliases[name] ?? name;

  return (
    <span
      aria-hidden="true"
      suppressHydrationWarning
      className={`material-symbols-outlined inline-flex select-none items-center justify-center leading-none ${className}`}
      style={fontSize ? { fontSize, lineHeight: 1 } : { lineHeight: 1 }}
    >
      {symbolName}
    </span>
  );
}
