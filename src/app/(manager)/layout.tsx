// Fase 1 — Manager layout with sidebar, header, WhatsApp support button
export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100svh] bg-background text-foreground">
      {children}
    </div>
  );
}
