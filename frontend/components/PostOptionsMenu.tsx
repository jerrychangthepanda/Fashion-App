"use client";

import { Link2, Flag, EyeOff } from "lucide-react";
import type { Post } from "@/lib/mockData";

export function PostOptionsMenu({
    open,
    onClose,
    post,
    onHide,
}: {
    open: boolean;
    onClose: () => void;
    post: Post;
    onHide: () => void;
}) {
    if (!open) return null;

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

    return (
        <>
            <div onClick={onClose} className="fixed inset-0 z-40" />
            <div className="absolute right-4 top-10 z-50 w-48 overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-lg">
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
            </div>
        </>
    );
}