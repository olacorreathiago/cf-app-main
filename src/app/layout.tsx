import "./globals.css";
import type { Metadata, Viewport } from "next";
import { League_Gothic, Roboto_Flex } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const displayFont = League_Gothic({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const bodyFont = Roboto_Flex({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Zekko",
    template: "%s · Zekko",
  },
  description: "Zekko — gestão completa para boxes de CrossFit. Aulas, WODs, métricas e comunidade.",
  applicationName: "Zekko",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/favicon.png",
    apple: "/icons/favicon.png",
    other: [{ rel: "mask-icon", url: "/icons/icon-maskable.svg", color: "#0A0A0A" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
    { media: "(prefers-color-scheme: light)", color: "#F5F5F0" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt"
      suppressHydrationWarning
      className={cn(displayFont.variable, bodyFont.variable)}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className="bg-background text-foreground font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {/* App-wide page filter (film grain + light sweep) from the Figma
              design — same treatment as the auth screens, across every page. */}
          <div aria-hidden className="pointer-events-none fixed inset-0 bg-cover bg-center filter-page" />
          {children}
          <Toaster
            position="bottom-center"
            toastOptions={{
              classNames: {
                toast: "surface-card text-text-primary border-border",
                error: "!text-error !border-error/20",
                success: "!text-success !border-success/20",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
