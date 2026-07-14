"use client";

import {
    Bookmark,
    EyeOff,
    Flag,
    Link2,
    Pencil,
    Trash2,
} from "lucide-react";
import Link from "next/link";
import type { LocalPost } from "@/lib/localPosts";

export function PostOptionsMenu({
    open,
    onClose,
    post,
    isOwnPost,
    onHide,
    onDelete,
}: {
    open: boolean;
    onClose: () => void;
    post: LocalPost;
    isOwnPost: boolean;
    onHide: () => void;
    onDelete?: () => void;
}) {
    if (!open) {
        return null;
    }

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

    function handleReport() {
        const confirmed = window.confirm("Report this post?");

        if (confirmed) {
            alert("Reporting isn't fully wired up yet, but noted.");
        }

        onClose();
    }

    function handleHide() {
        onHide();
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

            <div className="absolute right-4 top-10 z-50 w-48 overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-lg">
                {isOwnPost ? (
                    <>
                        <Link
                            href={`/profile/post/${post.id}/edit`}
                            onClick={onClose}
                            className="flex w-full items-center gap-2.5 border-b border-neutral-100 px-3.5 py-2.5 text-left"
                        >
                            <Pencil
                                size={16}
                                className="text-neutral-600"
                            />
                            <span className="text-sm text-neutral-900">
                                Edit post
                            </span>
                        </Link>

                        <Link
                            href={`/profile/post/${post.id}/collections`}
                            onClick={onClose}
                            className="flex w-full items-center gap-2.5 border-b border-neutral-100 px-3.5 py-2.5 text-left"
                        >
                            <Bookmark
                                size={16}
                                className="text-neutral-600"
                            />
                            <span className="text-sm text-neutral-900">
                                Save to collection
                            </span>
                        </Link>

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
                            className="flex w-full items-center gap-2.5 border-b border-neutral-100 px-3.5 py-2.5 text-left"
                        >
                            <Link2
                                size={16}
                                className="text-neutral-600"
                            />
                            <span className="text-sm text-neutral-900">
                                Copy link
                            </span>
                        </button>

                        <Link
                            href={`/profile/post/${post.id}/collections`}
                            onClick={onClose}
                            className="flex w-full items-center gap-2.5 border-b border-neutral-100 px-3.5 py-2.5 text-left"
                        >
                            <Bookmark
                                size={16}
                                className="text-neutral-600"
                            />
                            <span className="text-sm text-neutral-900">
                                Save to collection
                            </span>
                        </Link>

                        <button
                            onClick={handleHide}
                            className="flex w-full items-center gap-2.5 border-b border-neutral-100 px-3.5 py-2.5 text-left"
                        >
                            <EyeOff
                                size={16}
                                className="text-neutral-600"
                            />
                            <span className="text-sm text-neutral-900">
                                Hide this post
                            </span>
                        </button>

                        <button
                            onClick={handleReport}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
                        >
                            <Flag
                                size={16}
                                className="text-red-500"
                            />
                            <span className="text-sm text-red-500">
                                Report post
                            </span>
                        </button>
                    </>
                )}
            </div>
        </>
    );
}
