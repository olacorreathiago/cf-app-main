import { getPostById } from "@/lib/athlete/feed-actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PostDetailClient } from "./post-detail-client";

interface Props {
  params: Promise<{ postId: string }>;
}

export default async function PostDetailPage({ params }: Props) {
  const { postId } = await params;
  const post = await getPostById(postId);

  if (!post) notFound();

  const publishedLabel = new Date(post.published_at).toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6">
      {/* Back */}
      <Link
        href="/athlete/feed"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-text-tertiary transition-colors hover:text-text-primary"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M9 3L4 7l5 4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Feed
      </Link>

      <article className="rounded-2xl border border-border bg-bg-card overflow-hidden">
        {/* Box header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60">
          {post.box_logo_url ? (
            <img
              src={post.box_logo_url}
              alt={post.box_name}
              className="h-10 w-10 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-fg text-base font-bold">
              {post.box_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-text-primary">{post.box_name}</p>
            <p className="text-xs text-text-tertiary capitalize">
              <time dateTime={post.published_at}>{publishedLabel}</time>
              {post.author_name && <span> · {post.author_name}</span>}
            </p>
          </div>
        </div>

        {/* Image */}
        {post.image_url && (
          <img
            src={post.image_url}
            alt=""
            className="w-full object-cover max-h-[480px]"
          />
        )}

        {/* Body */}
        {post.body && (
          <div className="px-5 py-4">
            <p className="text-base text-text-primary leading-relaxed whitespace-pre-wrap">
              {post.body}
            </p>
          </div>
        )}

        {/* Reactions */}
        <div className="border-t border-border/60 px-4 py-3">
          <PostDetailClient
            postId={post.id}
            initialReacted={post.my_reaction}
            initialCount={post.reaction_count}
          />
        </div>
      </article>
    </div>
  );
}
