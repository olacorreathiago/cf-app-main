"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type PostType = "post" | "recado";

export interface FeedPost {
  id: string;
  box_id: string;
  box_name: string;
  box_logo_url: string | null;
  author_name: string | null;
  type: PostType;
  body: string | null;
  image_url: string | null;
  published_at: string;
  pinned: boolean;
  reaction_count: number;
  my_reaction: boolean;
}

async function getActiveBoxIds(userId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from("memberships")
    .select("box_id")
    .eq("user_id", userId)
    .eq("status", "active");
  return (data ?? []).map((m) => m.box_id);
}

async function enrichWithReactions(
  posts: { id: string }[],
  userId: string
): Promise<{ countMap: Record<string, number>; mySet: Set<string> }> {
  if (posts.length === 0) return { countMap: {}, mySet: new Set() };
  const ids = posts.map((p) => p.id);
  const { data: reactions } = await supabaseAdmin
    .from("post_reactions")
    .select("source_id, user_id")
    .eq("source_type", "post")
    .in("source_id", ids)
    .eq("emoji", "❤️");

  const countMap: Record<string, number> = {};
  const mySet = new Set<string>();
  for (const r of reactions ?? []) {
    countMap[r.source_id] = (countMap[r.source_id] ?? 0) + 1;
    if (r.user_id === userId) mySet.add(r.source_id);
  }
  return { countMap, mySet };
}

function mapPost(
  p: {
    id: string;
    box_id: string;
    type: string | null;
    body: string | null;
    image_url: string | null;
    published_at: string;
    pinned: boolean | null;
    boxes: unknown;
    profiles: unknown;
  },
  countMap: Record<string, number>,
  mySet: Set<string>
): FeedPost {
  const box = p.boxes as { name: string; logo_url: string | null } | null;
  const profile = p.profiles as { full_name: string | null } | null;
  return {
    id: p.id,
    box_id: p.box_id,
    box_name: box?.name ?? "",
    box_logo_url: box?.logo_url ?? null,
    author_name: profile?.full_name ?? null,
    type: (p.type ?? "post") as PostType,
    body: p.body,
    image_url: p.image_url,
    published_at: p.published_at,
    pinned: p.pinned ?? false,
    reaction_count: countMap[p.id] ?? 0,
    my_reaction: mySet.has(p.id),
  };
}

const POST_SELECT =
  "id, box_id, type, body, image_url, published_at, pinned, boxes(name, logo_url), profiles(full_name)";

export async function getFeedPosts(): Promise<FeedPost[]> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const boxIds = await getActiveBoxIds(user.id);
  if (boxIds.length === 0) return [];

  const now = new Date().toISOString();
  const { data: posts } = await supabaseAdmin
    .from("box_posts")
    .select(POST_SELECT)
    .in("box_id", boxIds)
    .lte("published_at", now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(50);

  if (!posts || posts.length === 0) return [];

  const { countMap, mySet } = await enrichWithReactions(posts, user.id);
  return posts.map((p) => mapPost(p as never, countMap, mySet));
}

export async function getLatestBoxPosts(
  boxId: string,
  limit = 3
): Promise<FeedPost[]> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const now = new Date().toISOString();

  // Always include all pinned + latest up to limit non-pinned
  const { data: pinned } = await supabaseAdmin
    .from("box_posts")
    .select(POST_SELECT)
    .eq("box_id", boxId)
    .eq("pinned", true)
    .lte("published_at", now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("published_at", { ascending: false });

  const { data: latest } = await supabaseAdmin
    .from("box_posts")
    .select(POST_SELECT)
    .eq("box_id", boxId)
    .eq("pinned", false)
    .lte("published_at", now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("published_at", { ascending: false })
    .limit(limit);

  const all = [...(pinned ?? []), ...(latest ?? [])];
  if (all.length === 0) return [];

  const { countMap, mySet } = await enrichWithReactions(all, user.id);
  return all.map((p) => mapPost(p as never, countMap, mySet));
}

export async function getPostById(postId: string): Promise<FeedPost | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: post } = await supabaseAdmin
    .from("box_posts")
    .select(POST_SELECT)
    .eq("id", postId)
    .single();

  if (!post) return null;

  const userId = user?.id ?? "";
  const { countMap, mySet } = await enrichWithReactions([post], userId);
  return mapPost(post as never, countMap, mySet);
}

export async function toggleReaction(
  postId: string,
  currentlyReacted: boolean,
  paths: string[] = []
): Promise<{ error?: string }> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  if (currentlyReacted) {
    await supabaseAdmin
      .from("post_reactions")
      .delete()
      .eq("source_type", "post")
      .eq("source_id", postId)
      .eq("user_id", user.id)
      .eq("emoji", "❤️");
  } else {
    await supabaseAdmin.from("post_reactions").upsert({
      source_type: "post",
      source_id: postId,
      user_id: user.id,
      emoji: "❤️",
    });
  }

  for (const path of ["/athlete", "/athlete/feed", ...paths]) {
    revalidatePath(path);
  }
  return {};
}
