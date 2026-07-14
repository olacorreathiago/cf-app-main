import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getBoxPosts } from "@/lib/box/post-actions";
import { PostsClient } from "./posts-client";

export const metadata: Metadata = { title: "Posts" };

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function BoxPostsPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: box } = await supabase
    .from("boxes")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!box) redirect("/dashboard");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("box_id", box.id)
    .in("role", ["owner", "partner", "manager"])
    .maybeSingle();

  if (!membership) redirect(`/box/${slug}`);

  const posts = await getBoxPosts(box.id);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <PostsClient posts={posts} boxId={box.id} slug={slug} />
    </div>
  );
}
