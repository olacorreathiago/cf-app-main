export const APP_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "CrossFit App",
  supportWhatsApp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;
