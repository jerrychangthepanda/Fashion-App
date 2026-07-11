"use client";

import { useState } from "react";
import { MoreHorizontal, Music, Trash2 } from "lucide-react";
import type { LocalPost } from "@/lib/localPosts";
import { deletePost } from "@/lib/localPosts";

export function ProfilePostsGrid({
    posts,
    onPostDeleted,
}: {
    posts: LocalPost[];
    onPostDeleted: (postId: string) => void;
}) {
    const [openMenuPostId, setOpenMenuPostId] =
        useState<string | null>(null);

    const [deletingPostId, setDeletingPostId] =
        useState<string | null>(null);

    async function handleDeletePost(postId: string) {
        if (deletingPostId) return;

        try {
            setDeletingPostId(postId);

            await deletePost(postId);

            onPostDeleted(postId);
            setOpenMenuPostId(null);
        } catch (error) {
            console.error(error);

            alert(
                error instanceof Error
                    ? error.message
                    : "Could not delete the post."
            );
        } finally {
            setDeletingPostId(null);
        }
    }

    if (posts.length === 0) {
        return (
            <div className="flex h-40 items-center justify-center">
                <p className="text-sm text-neutral-400">
                    No posts yet
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-3 gap-1 px-1 pt-3">
            {posts.map((post) => (
                <div
                    key={post.id}
                    className="relative aspect-[4/5] overflow-hidden rounded-md bg-neutral-100"
                >
                    {post.imageUrl ? (
                        <img
                            src={post.imageUrl}
                            alt={post.caption || "Profile post"}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="h-full w-full bg-neutral-100" />
                    )}

                    {post.music && (
                        <div className="absolute left-1 top-1 rounded-full bg-black/50 p-1">
                            <Music
                                size={12}
                                className="text-white"
                            />
                        </div>
                    )}

                    <button
                        onClick={() =>
                            setOpenMenuPostId(
                                openMenuPostId === post.id
                                    ? null
                                    : post.id
                            )
                        }
                        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/50"
                        aria-label="Post options"
                    >
                        <MoreHorizontal
                            size={16}
                            className="text-white"
                        />
                    </button>

                    {openMenuPostId === post.id && (
                        <div className="absolute right-1 top-9 z-10 w-32 overflow-hidden rounded-xl bg-white shadow-lg">
                            <button
                                onClick={() =>
                                    void handleDeletePost(post.id)
                                }
                                disabled={
                                    deletingPostId === post.id
                                }
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 disabled:opacity-50"
                            >
                                <Trash2 size={14} />

                                {deletingPostId === post.id
                                    ? "Deleting..."
                                    : "Delete"}
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}