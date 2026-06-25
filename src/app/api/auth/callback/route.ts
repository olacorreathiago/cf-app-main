import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const invite = searchParams.get("invite");
  const join = searchParams.get("join");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no_user`);
  }

  // Check if profile exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_type, approval_status")
    .eq("id", user.id)
    .single();

  // Build redirect URL — preserve invite/join token through onboarding
  const buildUrl = (path: string) => {
    const url = new URL(`${origin}${path}`);
    if (invite) url.searchParams.set("invite", invite);
    if (join) url.searchParams.set("join", join);
    return url.toString();
  };

  if (!profile) {
    return NextResponse.redirect(buildUrl("/onboarding/role"));
  }

  if (profile.profile_type === "professional" && profile.approval_status === "pending_approval") {
    return NextResponse.redirect(`${origin}/waiting-approval`);
  }

  if (join) {
    return NextResponse.redirect(`${origin}/join/${join}`);
  }

  if (invite) {
    return NextResponse.redirect(`${origin}/invite?token=${invite}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
