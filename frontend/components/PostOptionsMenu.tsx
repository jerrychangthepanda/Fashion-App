"use client";

import { Link2, Flag, EyeOff, Pencil, Trash2, Bookmark } from "lucide-react";
import type { LocalPost } from "@/lib/localPosts";
import Link from "next/link";
export function PostOptionsMenu({
    open,
    onClose,
    post,
    onHide,
    onDelete,
}: {
    open: boolean;
    onClose: () => void;
    post: LocalPost;
    onHide: () => void;
    onDelete?: () => void;
}) {
    if (!open) return null;

    const isOwnPost = post.username === "you";

    async function handleCopyLink() {
        const fakeUrl = `https://app-placeholder.com/post/${post.id}`;
        try {
            await navigator.clipboard.writeText(fakeUrl);
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
        const confirmed = window.confirm("Delete this post? This can't be undone.");
        if (confirmed && onDelete) {
            onDelete();
        }
        onClose();
    }

    return (
        <>
            <div onClick={onClose} className="fixed inset-0 z-40" />
            <div className="absolute right-4 top-10 z-50 w-40 overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-lg">
                {isOwnPost ? (
                    <>
                        <Link
                            href={`/profile/post/${post.id}/edit`}
                            onClick={onClose}
                            className="flex w-full items-center gap-2.5 border-b border-neutral-100 px-3.5 py-2.5 text-left"
                        >
                            <Pencil size={16} className="text-neutral-600" />
                            <span className="text-sm text-neutral-900">Edit post</span>
                        </Link>

                        <Link
                            href={`/profile/post/${post.id}/collections`}
                            onClick={onClose}
                            className="flex w-full items-center gap-2 border-b border-neutral-100 px-3 py-2.5 text-left"
                        >
                            <Bookmark size={16} className="text-neutral-600" />
                            <span className="text-sm text-neutral-900">Add to Collection</span>
                        </Link>

                        <button
                            onClick={handleDelete}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
                        >
                            <Trash2 size={16} className="text-red-500" />
                            <span className="text-sm text-red-500">Delete post</span>
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={handleCopyLink}
                            className="flex w-full items-center gap-2.5 border-b border-neutral-100 px-3.5 py-2.5 text-left"
                        >
                            <Link2 size={16} className="text-neutral-600" />
                            <span className="text-sm text-neutral-900">Copy link</span>
                        </button>

                        <button
                            onClick={handleHide}
                            className="flex w-full items-center gap-2.5 border-b border-neutral-100 px-3.5 py-2.5 text-left"
                        >
                            <EyeOff size={16} className="text-neutral-600" />
                            <span className="text-sm text-neutral-900">Hide this post</span>
                        </button>

                        <button
                            onClick={handleReport}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
                        >
                            <Flag size={16} className="text-red-500" />
                            <span className="text-sm text-red-500">Report post</span>
                        </button>
                    </>
                )}
            </div>
        </>
    );
}