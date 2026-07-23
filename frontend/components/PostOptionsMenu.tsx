"use client";

import {
    Ban,
    Bookmark,
    EyeOff,
    Flag,
    FolderMinus,
    Link2,
    Pencil,
    Trash2,
} from "lucide-react";
import Link from "next/link";
import type { LocalPost } from "@/lib/localPosts";
import { blockUser } from "@/lib/blocks";
import { reportPost } from "@/lib/reports";

export function PostOptionsMenu({
    open,
    onClose,
    post,
    isOwnPost,
    onHide,
    onDelete,
    collectionId,
    onRemoveFromCollection,
}: {
    open: boolean;
    onClose: () => void;
    post: LocalPost;
    isOwnPost: boolean;
    onHide: () => void;
    onDelete?: () => void;
    // When set, a post is being viewed from inside one of the
    // current user's OWN collections — this is independent of
    // isOwnPost, since you can save (and un-save) someone else's
    // post to your own collection. Only pass this when the
    // signed-in user actually owns the collection being viewed;
    // callers are responsible for that check.
    collectionId?: string | null;
    onRemoveFromCollection?: () => void;
}) {
    if (!open) {
        return null;
    }

    const canRemoveFromCollection = Boolean(
        collectionId && onRemoveFromCollection
    );

    async function handleCopyLink() {
        const postUrl = `${window.location.origin}/profile/post/${post.id}`;

        try {
            await navigator.clipboard.writeText(postUrl);
            alert("Link copied!");
        } catch {
            alert("Couldn't copy the link.");
        }

        onClose();
    }

    async function handleReport() {
        const confirmed = window.confirm(
            "Report this post? Our team will review it."
        );

        onClose();

        if (!confirmed) {
            return;
        }

        const rawReason = window.prompt(
            "Optional: what's wrong with this post? (leave blank to skip)"
        );
        const reason =
            rawReason && rawReason.trim() ? rawReason.trim() : null;

        try {
            await reportPost(post.id, post.userId, reason);
            alert("Thanks, this post has been reported.");
        } catch (error) {
            console.error("Could not report post:", error);

            alert("Couldn't report this post.");
        }
    }

    async function handleBlock() {
        const confirmed = window.confirm(
            `Block @${post.username}? They won't be able to see your posts or profile, follow you, or like/comment on your posts. This also unfollows each other.`
        );

        onClose();

        if (!confirmed) {
            return;
        }

        try {
            await blockUser(post.userId);

            // Blocking changes what a lot of screens should show
            // (feed, search, this post itself if it's now hidden by
            // RLS) — a full reload is the simplest way to guarantee
            // every one of them reflects it correctly.
            window.location.reload();
        } catch (error) {
            console.error("Could not block user:", error);

            alert("Couldn't block this account.");
        }
    }

    function handleHide() {
        onHide();
        onClose();
    }

    function handleRemoveFromCollection() {
        if (onRemoveFromCollection) {
            onRemoveFromCollection();
        }

        onClose();
    }

    function handleDelete() {
        const confirmed = window.confirm(
            "Delete this post? This can't be undone."
        );

        if (confirmed && onDelete) {
            onDelete();
        }

        onClose();
    }

    return (
        <>
            <button
                onClick={onClose}
                className="fixed inset-0 z-40 cursor-default"
                aria-label="Close post options"
            />

            <div className="absolute right-4 top-10 z-50 w-48 overflow-hidden rounded-xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg">
                {isOwnPost ? (
                    <>
                        <Link
                            href={`/profile/post/${post.id}/edit`}
                            onClick={onClose}
                            className="flex w-full items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-800 px-3.5 py-2.5 text-left"
                        >
                            <Pencil
                                size={16}
                                className="text-neutral-600 dark:text-neutral-300"
                            />
                            <span className="text-sm text-neutral-900 dark:text-neutral-50">
                                Edit post
                            </span>
                        </Link>

                        <Link
                            href={`/profile/post/${post.id}/collections`}
                            onClick={onClose}
                            className="flex w-full items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-800 px-3.5 py-2.5 text-left"
                        >
                            <Bookmark
                                size={16}
                                className="text-neutral-600 dark:text-neutral-300"
                            />
                            <span className="text-sm text-neutral-900 dark:text-neutral-50">
                                Save to collection
                            </span>
                        </Link>

                        {canRemoveFromCollection && (
                            <button
                                onClick={handleRemoveFromCollection}
                                className="flex w-full items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-800 px-3.5 py-2.5 text-left"
                            >
                                <FolderMinus
                                    size={16}
                                    className="text-neutral-600 dark:text-neutral-300"
                                />
                                <span className="text-sm text-neutral-900 dark:text-neutral-50">
                                    Remove from Collection
                                </span>
                            </button>
                        )}

                        <button
                            onClick={handleDelete}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
                        >
                            <Trash2
                                size={16}
                                className="text-red-500"
                            />
                            <span className="text-sm text-red-500">
                                Delete post
                            </span>
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => void handleCopyLink()}
                            className="flex w-full items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-800 px-3.5 py-2.5 text-left"
                        >
                            <Link2
                                size={16}
                                className="text-neutral-600 dark:text-neutral-300"
                            />
                            <span className="text-sm text-neutral-900 dark:text-neutral-50">
                                Copy link
                            </span>
                        </button>

                        <Link
                            href={`/profile/post/${post.id}/collections`}
                            onClick={onClose}
                            className="flex w-full items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-800 px-3.5 py-2.5 text-left"
                        >
                            <Bookmark
                                size={16}
                                className="text-neutral-600 dark:text-neutral-300"
                            />
                            <span className="text-sm text-neutral-900 dark:text-neutral-50">
                                Save to collection
                            </span>
                        </Link>

                        {canRemoveFromCollection && (
                            <button
                                onClick={handleRemoveFromCollection}
                                className="flex w-full items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-800 px-3.5 py-2.5 text-left"
                            >
                                <FolderMinus
                                    size={16}
                                    className="text-neutral-600 dark:text-neutral-300"
                                />
                                <span className="text-sm text-neutral-900 dark:text-neutral-50">
                                    Remove from Collection
                                </span>
                            </button>
                        )}

                        <button
                            onClick={handleHide}
                            className="flex w-full items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-800 px-3.5 py-2.5 text-left"
                        >
                            <EyeOff
                                size={16}
                                className="text-neutral-600 dark:text-neutral-300"
                            />
                            <span className="text-sm text-neutral-900 dark:text-neutral-50">
                                Hide this post
                            </span>
                        </button>

                        <button
                            onClick={() => void handleReport()}
                            className="flex w-full items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-800 px-3.5 py-2.5 text-left"
                        >
                            <Flag
                                size={16}
                                className="text-red-500"
                            />
                            <span className="text-sm text-red-500">
                                Report post
                            </span>
                        </button>

                        <button
                            onClick={() => void handleBlock()}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
                        >
                            <Ban
                                size={16}
                                className="text-red-500"
                            />
                            <span className="text-sm text-red-500">
                                Block user
                            </span>
                        </button>
                    </>
                )}
            </div>
        </>
    );
}
