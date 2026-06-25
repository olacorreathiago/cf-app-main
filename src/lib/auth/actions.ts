"use client";

import { supabase } from "@/lib/supabase/client";
import { APP_CONFIG } from "@/lib/config";

function callbackUrl(params?: Record<string, string>): string {
  const url = new URL("/api/auth/callback", APP_CONFIG.url);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return url.toString();
}

export async function signInWithMagicLink(
  email: string,
  options?: { next?: string; invite?: string; join?: string }
): Promise<void> {
  const params: Record<string, string> = {};
  if (options?.next) params.next = options.next;
  if (options?.invite) params.invite = options.invite;
  if (options?.join) params.join = options.join;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl(params),
      shouldCreateUser: true,
    },
  });

  if (error) throw new Error(error.message);
}

export async function signInWithGoogle(
  options?: { next?: string; invite?: string; join?: string }
): Promise<void> {
  const params: Record<string, string> = {};
  if (options?.next) params.next = options.next;
  if (options?.invite) params.invite = options.invite;
  if (options?.join) params.join = options.join;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl(params),
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  window.location.assign("/login");
}
