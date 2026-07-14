/**
 * Auth shell background — always the Zekko dark identity, independent of the
 * app light/dark theme. The page filter (film grain + light sweep) is the
 * exported Figma asset `design/assets/Filter.png` → /textures/zekko-filter.webp.
 * Individual screens choose their own layout: centered card (login, check
 * e-mail, review) or split hero (onboarding).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-[#131313] text-white antialiased">
      {/* Page filter — grain + smoke light sweep from the Figma design */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-cover bg-center filter-page"
      />

      <div className="relative">{children}</div>
    </div>
  );
}
