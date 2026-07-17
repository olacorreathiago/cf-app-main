"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function switchActiveBox(boxId: string, returnTo?: string) {
  const cookieStore = await cookies();
  cookieStore.set("athlete_active_box", boxId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: "lax",
  });
  // Stay on the current athlete page and refresh its data for the newly active
  // box, rather than always bouncing back to the home dashboard.
  const dest = returnTo && returnTo.startsWith("/athlete") ? returnTo : "/athlete";
  redirect(dest);
}
