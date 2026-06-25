"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type PostType = "post" | "recado";

export interface BoxPost {
  id: string;
  author_id: string;
  author_name: string | null;
  type: PostType;
  body: string | null;
  image_url: string | null;
  published_at: string;
  pinned: boolean;
  reaction_count: number;
}

export async function getBoxPosts(boxId: string): Promise<BoxPost[]> {
  const { data: posts } = await supabaseAdmin
    .from("box_posts")
    .select("id, author_id, type, body, image_url, published_at, pinned, profiles(full_name)")
    .eq("box_id", boxId)
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(100);

  if (!posts || posts.length === 0) return [];

  const ids = posts.map((p) => p.id);
  const { data: reactions } = await supabaseAdmin
    .from("post_reactions")
    .select("source_id")
    .eq("source_type", "post")
    .in("source_id", ids)
    .eq("emoji", "❤️");

  const countMap: Record<string, number> = {};
  for (const r of reactions ?? []) {
    countMap[r.source_id] = (countMap[r.source_id] ?? 0) + 1;
  }

  return posts.map((p) => {
    const profile = p.profiles as unknown as { full_name: string | null } | null;
    return {
      id: p.id,
      author_id: p.author_id,
      author_name: profile?.full_name ?? null,
      type: (p.type ?? "post") as PostType,
      body: p.body,
      image_url: p.image_url,
      published_at: p.published_at,
      pinned: p.pinned ?? false,
      reaction_count: countMap[p.id] ?? 0,
    };
  });
}

export async function createPost(
  boxId: string,
  slug: string,
  data: { type: PostType; body?: string; image_url?: string }
): Promise<{ error?: string }> {
  if (!data.body?.trim() && !data.image_url?.trim()) {
    return { error: "O post precisa de texto ou imagem." };
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabaseAdmin.from("box_posts").insert({
    box_id: boxId,
    author_id: user.id,
    type: data.type,
    body: data.body?.trim() || null,
    image_url: data.image_url?.trim() || null,
    pinned: false,
  });

  if (error) return { error: "Erro ao publicar." };

  revalidatePath(`/box/${slug}/posts`);
  revalidatePath("/athlete");
  revalidatePath("/athlete/feed");
  return {};
}

export async function togglePin(
  postId: string,
  currentlyPinned: boolean,
  slug: string
): Promise<{ error?: string }> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabaseAdmin
    .from("box_posts")
    .update({ pinned: !currentlyPinned })
    .eq("id", postId);

  if (error) return { error: "Erro ao fixar post." };

  revalidatePath(`/box/${slug}/posts`);
  revalidatePath("/athlete");
  revalidatePath("/athlete/feed");
  return {};
}

export async function deletePost(
  postId: string,
  slug: string
): Promise<{ error?: string }> {
  const { error } = await supabaseAdmin
    .from("box_posts")
    .delete()
    .eq("id", postId);

  if (error) return { error: "Erro ao eliminar." };

  revalidatePath(`/box/${slug}/posts`);
  revalidatePath("/athlete");
  revalidatePath("/athlete/feed");
  return {};
}

export async function uploadPostImage(
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "Sem ficheiro." };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const allowed = ["jpg", "jpeg", "png", "gif", "webp"];
  if (!allowed.includes(ext)) return { error: "Formato não suportado." };
  if (file.size > 10 * 1024 * 1024) return { error: "Ficheiro demasiado grande (máx 10 MB)." };

  const buffer = Buffer.from(await file.arrayBuffer());
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from("post-images")
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) return { error: "Erro no upload da imagem." };

  const { data } = supabaseAdmin.storage.from("post-images").getPublicUrl(path);
  return { url: data.publicUrl };
}
