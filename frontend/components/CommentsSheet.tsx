"use client";

import { useState } from "react";
import { ChevronDown, User, Send } from "lucide-react";

export function CommentsSheet({
    open,
    onClose,
    commentCount,
}: {
    open: boolean;
    onClose: () => void;
    commentCount: number;
}) {
    const [draft, setDraft] = useState("");
    const [postedComments, setPostedComments] = useState<string[]>([]);

    if (!open) return null;

    function handlePost() {
        const trimmed = draft.trim();
        if (!trimmed) return;
        setPostedComments((prev) => [trimmed, ...prev]);
        setDraft("");
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-end">
            <div onClick={onClose} className="absolute inset-0 bg-black/40" />

            <div className="relative z-10 flex h-[70%] w-full flex-col rounded-t-3xl bg-white">
                <div className="flex justify-center pt-2">
                    <div className="h-1 w-10 rounded-full bg-neutral-200" />
                </div>

                <div className="flex items-center px-4 py-3">
                    <div className="h-7 w-7" />
                    <h2 className="flex-1 text-center text-sm font-semibold text-neutral-900">
                        Comments{commentCount > 0 ? ` (${commentCount})` : ""}
                    </h2>
                    <button
                        onClick={onClose}
                        aria-label="Close comments"
                        className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100"
                    >
                        <ChevronDown size={16} className="text-neutral-600" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto border-t border-neutral-100 px-4">
                    {postedComments.map((comment, i) => (
                        <div key={`posted-${i}`} className="flex items-center gap-3 border-b border-neutral-100 py-3">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100">
                                <User size={16} className="text-neutral-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-neutral-900">you</p>
                                <p className="text-sm text-neutral-600">{comment}</p>
                            </div>
                        </div>
                    ))}

                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 border-b border-neutral-100 py-3">
                            <div className="h-8 w-8 flex-shrink-0 rounded-full bg-neutral-100" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-2.5 w-20 rounded-full bg-neutral-100" />
                                <div className={`h-2.5 rounded-full bg-neutral-100 ${i % 2 === 0 ? "w-40" : "w-28"}`} />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-3 border-t border-neutral-100 px-4 py-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100">
                        <User size={16} className="text-neutral-400" />
                    </div>
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handlePost()}
                        placeholder="Add a comment..."
                        className="flex-1 rounded-full bg-neutral-100 px-4 py-2 text-sm outline-none"
                    />
                    <button
                        onClick={handlePost}
                        disabled={!draft.trim()}
                        aria-label="Post comment"
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-neutral-900 disabled:bg-neutral-200"
                    >
                        <Send size={14} className="text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
}