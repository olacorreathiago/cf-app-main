"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function switchActiveBox(boxId: string) {
  const cookieStore = await cookies();
  cookieStore.set("athlete_active_box", boxId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: "lax",
  });
  redirect("/athlete");
}
