import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/boxes"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isAuthPath = pathname.startsWith("/login") || pathname.startsWith("/onboarding") || pathname.startsWith("/invite") || pathname.startsWith("/join");
  // /box/[slug]/dropin is a public self-registration page — no auth required
  const isBoxDropIn = /^\/box\/[^/]+\/dropin(\/|$)/.test(pathname);
  const isProtectedPath = !isBoxDropIn && (pathname.startsWith("/dashboard") || pathname.startsWith("/athlete") || pathname.startsWith("/manager") || pathname.startsWith("/box"));

  // Unauthenticated user trying to access protected route
  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isProtectedPath) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("profile_type, approval_status, onboarding_completed, deleted_at")
      .eq("id", user.id)
      .single();

    // Profile row missing or onboarding not finished → redirect to role selection
    if (!profile || !profile.onboarding_completed) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding/role";
      return NextResponse.redirect(url);
    }

    // Account deletion requested — login still works, but everything routes
    // through the recovery screen until the 30-day window runs out.
    if (profile.deleted_at && !pathname.startsWith("/athlete/deleted")) {
      const url = request.nextUrl.clone();
      url.pathname = "/athlete/deleted";
      return NextResponse.redirect(url);
    }

    // Professional pending or rejected — block dashboard access
    if (
      profile.profile_type === "professional" &&
      (profile.approval_status === "pending_approval" || profile.approval_status === "rejected") &&
      !pathname.startsWith("/waiting-approval")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/waiting-approval";
      return NextResponse.redirect(url);
    }

    // Suspended athlete — block all athlete routes except /athlete/prs and /athlete/suspended
    const isAthletePath = pathname.startsWith("/athlete");
    const isAllowedWhileSuspended =
      pathname === "/athlete/prs" || pathname.startsWith("/athlete/suspended");

    if (isAthletePath && !isAllowedWhileSuspended) {
      const { data: memberships } = await supabase
        .from("memberships")
        .select("status")
        .eq("user_id", user.id)
        .in("status", ["active", "suspended"]);

      const hasActive = (memberships ?? []).some((m) => m.status === "active");
      const hasSuspended = (memberships ?? []).some((m) => m.status === "suspended");

      if (!hasActive && hasSuspended) {
        const url = request.nextUrl.clone();
        url.pathname = "/athlete/suspended";
        return NextResponse.redirect(url);
      }
    }

    // Closed box — only its owner may still reach it (to reopen), and only
    // via /settings or /billing. layout.tsx already bars non-owners, but it
    // never restricted which sub-route an admitted owner can browse to, so
    // every other page (classes, members, wods...) stayed reachable by
    // direct URL even though the sidebar hides the links.
    const boxMatch = pathname.match(/^\/box\/([^/]+)(\/.*)?$/);
    if (boxMatch) {
      const boxSlug = boxMatch[1];
      const { data: box } = await supabase
        .from("boxes")
        .select("id, deleted_at")
        .eq("slug", boxSlug)
        .maybeSingle();

      if (box?.deleted_at) {
        const { data: ownerMembership } = await supabase
          .from("memberships")
          .select("id")
          .eq("user_id", user.id)
          .eq("box_id", box.id)
          .eq("role", "owner")
          .maybeSingle();

        if (!ownerMembership) {
          const url = request.nextUrl.clone();
          url.pathname = "/athlete";
          return NextResponse.redirect(url);
        }

        const isAllowedWhileClosed =
          pathname.startsWith(`/box/${boxSlug}/settings`) || pathname.startsWith(`/box/${boxSlug}/billing`);

        if (!isAllowedWhileClosed) {
          const url = request.nextUrl.clone();
          url.pathname = `/box/${boxSlug}/billing`;
          return NextResponse.redirect(url);
        }
      }
    }
  }

  // Authenticated user hitting login page → redirect to dashboard
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/athlete";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
