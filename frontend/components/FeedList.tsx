"use client";

import { useState } from "react";
import { PostCard } from "@/components/PostCard";
import { deletePost, type LocalPost } from "@/lib/localPosts";

export function FeedList({
    posts,
    searchQuery = "",
}: {
    posts: LocalPost[];
    searchQuery?: string;
}) {
    const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([]);
    const [deletingPostIds, setDeletingPostIds] = useState<string[]>([]);

    const visiblePosts = posts.filter(
        (post) => !hiddenPostIds.includes(post.id)
    );

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

    if (visiblePosts.length === 0) {
        return (
            <div className="px-5 py-12 text-center">
                <p className="text-sm font-medium text-neutral-700">
                    {searchQuery.trim()
                        ? "No results found"
                        : "No posts yet"}
                </p>

                <p className="mt-1 text-sm text-neutral-400">
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
                <PostCard
                    key={post.id}
                    post={post}
                    onHide={() =>
                        setHiddenPostIds((ids) => [
                            ...ids,
                            post.id,
                        ])
                    }
                    onDelete={() => void handleDelete(post.id)}
                />
            ))}
        </div>
    );
}