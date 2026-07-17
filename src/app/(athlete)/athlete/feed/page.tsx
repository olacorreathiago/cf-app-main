import type { Metadata } from "next";
import { getFeedPosts } from "@/lib/athlete/feed-actions";
import { FeedClient } from "./feed-client";
import Link from "next/link";

export const metadata: Metadata = { title: "Feed" };

export const revalidate = 60;

export default async function FeedPage() {
  const posts = await getFeedPosts();

  return (
    <div className="mx-auto w-full max-w-xl px-5 py-7">
      <div className="mb-6">
        <p className="label-caps text-text-tertiary">Comunidade</p>
        <h1 className="font-display text-2xl uppercase text-text-primary">Feed</h1>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border py-20 text-center">
          <span className="text-3xl" aria-hidden>
            📭
          </span>
          <p className="text-sm font-medium text-text-primary">
            Ainda não há posts
          </p>
          <p className="text-xs text-text-tertiary max-w-[200px]">
            Quando a tua box publicar novidades, aparecem aqui.
          </p>
        </div>
      ) : (
        <FeedClient posts={posts} />
      )}
    </div>
  );
}
