"use client";

import { useEffect, useRef, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { PostCardSkeleton } from "@/components/PostCardSkeleton";
import { deletePost, type LocalPost } from "@/lib/localPosts";

export function FeedList({
    posts,
    searchQuery = "",
    // These four are only relevant to the default, unfiltered browse
    // feed — the caller passing them means "this list is paginated,
    // manage infinite scroll." When they're omitted (e.g. rendering a
    // finite set of search matches), FeedList just renders the given
    // posts with no sentinel, skeletons, or "load more" behavior.
    loadingInitial = false,
    hasMore = false,
    loadingMore = false,
    onLoadMore,
}: {
    posts: LocalPost[];
    searchQuery?: string;
    loadingInitial?: boolean;
    hasMore?: boolean;
    loadingMore?: boolean;
    onLoadMore?: () => void;
}) {
    const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([]);
    const [deletingPostIds, setDeletingPostIds] = useState<string[]>([]);

    // The id of the one post allowed to be playing audio right now.
    // Only one post's music should ever play at a time.
    const [activeAudioPostId, setActiveAudioPostId] = useState<
        string | null
    >(null);

    const visiblePosts = posts.filter(
        (post) => !hiddenPostIds.includes(post.id)
    );

    // Sentinel element sitting just past the last post. As soon as it
    // scrolls into view we ask for the next page — with a generous
    // rootMargin so the next batch starts loading a little before the
    // user actually hits the bottom, the same "stay ahead of the
    // scroll" trick Instagram/TikTok feeds use to avoid a visible
    // pause.
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const onLoadMoreRef = useRef(onLoadMore);

    useEffect(() => {
        onLoadMoreRef.current = onLoadMore;
    });

    useEffect(() => {
        if (!onLoadMoreRef.current || !hasMore) {
            return;
        }

        // The sentinel only exists in the DOM once we're past the
        // initial loading-skeleton render (see the early return
        // below) — this effect's first run can land before that
        // switch happens, when the ref is still null. Re-running
        // whenever loadingInitial changes ensures we retry right
        // after the sentinel actually mounts, instead of silently
        // never attaching an observer.
        const node = sentinelRef.current;

        if (!node) {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    onLoadMoreRef.current?.();
                }
            },
            { rootMargin: "600px 0px" }
        );

        observer.observe(node);

        return () => observer.disconnect();
    }, [hasMore, loadingInitial]);

    async function handleDelete(postId: string) {
        if (deletingPostIds.includes(postId)) return;

        try {
            setDeletingPostIds((ids) => [...ids, postId]);

            await deletePost(postId);

            setHiddenPostIds((ids) => [...ids, postId]);
        } catch (error) {
            console.error(error);

            alert(
                error instanceof Error
                    ? error.message
                    : "Could not delete the post."
            );
        } finally {
            setDeletingPostIds((ids) =>
                ids.filter((id) => id !== postId)
            );
        }
    }

    // First paint, before the initial page has come back — show
    // shimmering placeholders instead of a blank feed.
    if (loadingInitial && visiblePosts.length === 0) {
        return (
            <div>
                <PostCardSkeleton />
                <PostCardSkeleton />
                <PostCardSkeleton />
            </div>
        );
    }

    if (visiblePosts.length === 0) {
        return (
            <div className="px-5 py-12 text-center">
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                    {searchQuery.trim()
                        ? "No results found"
                        : "No posts yet"}
                </p>

                <p className="mt-1 text-sm text-neutral-400 dark:text-neutral-500">
                    {searchQuery.trim()
                        ? "Try searching for another profile, brand, or song."
                        : "Create your first fit post."}
                </p>
            </div>
        );
    }

    return (
        <div>
            {visiblePosts.map((post) => (
                <div key={post.id} className="animate-fade-in-up">
                    <PostCard
                        post={post}
                        isAudioActive={activeAudioPostId === post.id}
                        onRequestAudioActive={() =>
                            setActiveAudioPostId(post.id)
                        }
                        onAudioStopped={() =>
                            setActiveAudioPostId((current) =>
                                current === post.id ? null : current
                            )
                        }
                        onHide={() =>
                            setHiddenPostIds((ids) => [
                                ...ids,
                                post.id,
                            ])
                        }
                        onDelete={() => void handleDelete(post.id)}
                    />
                </div>
            ))}

            {onLoadMore && (
                <div ref={sentinelRef}>
                    {loadingMore && (
                        <>
                            <PostCardSkeleton />
                            <PostCardSkeleton />
                        </>
                    )}

                    {!hasMore && !loadingMore && (
                        <p className="px-5 py-8 text-center text-sm text-neutral-400 dark:text-neutral-500">
                            You&apos;re all caught up.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
