"use client";

import { useEffect, useRef, useState } from "react";
import { PostCard } from "@/components/PostCard";
import { PostCardSkeleton } from "@/components/PostCardSkeleton";
import { deletePost, type LocalPost } from "@/lib/localPosts";
import { getLikedPostIds } from "@/lib/likes";
import { getHiddenPostIds, hidePost } from "@/lib/hiddenPosts";

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

    // Hides persist across sessions in the hidden_posts table — load
    // the signed-in user's full hidden-post list once on mount and
    // merge it into local state, so a post hidden last session stays
    // hidden instead of only living in this component's state for the
    // rest of the current session.
    useEffect(() => {
        let cancelled = false;

        getHiddenPostIds()
            .then((ids) => {
                if (cancelled || ids.size === 0) {
                    return;
                }

                setHiddenPostIds((current) => [
                    ...current,
                    ...Array.from(ids).filter(
                        (id) => !current.includes(id)
                    ),
                ]);
            })
            .catch((error) => {
                console.error(
                    "Could not load hidden posts:",
                    error
                );
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // The id of the one post allowed to be playing audio right now.
    // Only one post's music should ever play at a time.
    const [activeAudioPostId, setActiveAudioPostId] = useState<
        string | null
    >(null);

    // Which of the currently-rendered posts the signed-in user has
    // liked — fetched in one batched query per page instead of one
    // request per post (the old per-card fetch was the main N+1
    // culprit alongside the count queries denormalization removed).
    const [likedPostIds, setLikedPostIds] = useState<Set<string>>(
        new Set()
    );
    const fetchedLikeIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const newIds = posts
            .map((post) => post.id)
            .filter((id) => !fetchedLikeIdsRef.current.has(id));

        if (newIds.length === 0) {
            return;
        }

        newIds.forEach((id) => fetchedLikeIdsRef.current.add(id));

        let cancelled = false;

        getLikedPostIds(newIds)
            .then((ids) => {
                if (cancelled || ids.size === 0) {
                    return;
                }

                setLikedPostIds((current) => {
                    const next = new Set(current);
                    ids.forEach((id) => next.add(id));
                    return next;
                });
            })
            .catch((error) => {
                console.error(
                    "Could not load liked posts:",
                    error
                );
            });

        return () => {
            cancelled = true;
        };
    }, [posts]);

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
                        initialLiked={likedPostIds.has(post.id)}
                        isAudioActive={activeAudioPostId === post.id}
                        onRequestAudioActive={() =>
                            setActiveAudioPostId(post.id)
                        }
                        onAudioStopped={() =>
                            setActiveAudioPostId((current) =>
                                current === post.id ? null : current
                            )
                        }
                        onHide={() => {
                            // Optimistic: hide immediately, persist
                            // in the background. If the write fails
                            // the post stays hidden for the rest of
                            // this session (matches the previous
                            // session-only behavior) but the error is
                            // logged rather than silently dropped.
                            setHiddenPostIds((ids) => [
                                ...ids,
                                post.id,
                            ]);

                            hidePost(post.id).catch((error) => {
                                console.error(
                                    "Could not persist hidden post:",
                                    error
                                );
                            });
                        }}
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
