"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, MoreHorizontal, User, Image as ImageIcon } from "lucide-react";
import type { Post } from "@/lib/mockData";
import { CommentsSheet } from "@/components/CommentsSheet";
import { PostOptionsMenu } from "@/components/PostOptionsMenu";

export function PostCard({ post, onHide }: { post: Post; onHide: () => void }) {
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(post.likes);
    const [showComments, setShowComments] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

    function toggleLike() {
        setLikeCount((count) => (liked ? count - 1 : count + 1));
        setLiked(!liked);
    }

    return (
        <article className="border-b border-neutral-100 pb-4">
            <div className="relative flex items-center justify-between px-4 py-3">
                <Link href={`/u/${post.username}`} className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100">
                        <User size={16} className="text-neutral-400" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-neutral-900">{post.username}</p>
                        <p className="text-xs text-neutral-400">{post.timeAgo}</p>
                    </div>
                </Link>

                <button onClick={() => setShowOptions(true)} aria-label="Post options">
                    <MoreHorizontal size={18} className="text-neutral-400" />
                </button>

                <PostOptionsMenu
                    open={showOptions}
                    onClose={() => setShowOptions(false)}
                    post={post}
                    onHide={onHide}
                />
            </div>

            <div className="mx-4 flex aspect-[4/5] items-center justify-center rounded-2xl bg-neutral-100">
                <ImageIcon size={28} className="text-neutral-300" />
            </div>

            <div className="px-4 pt-3">
                <p className="text-sm text-neutral-900">{post.caption}</p>

                {post.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mt-3 flex items-center gap-4">
                    <button onClick={toggleLike} className="flex items-center gap-1.5">
                        <Heart
                            size={18}
                            className={liked ? "fill-red-500 text-red-500" : "text-neutral-500"}
                        />
                        <span className="text-sm text-neutral-500">{likeCount}</span>
                    </button>
                    <button onClick={() => setShowComments(true)} className="flex items-center gap-1.5">
                        <MessageCircle size={18} className="text-neutral-500" />
                        <span className="text-sm text-neutral-500">{post.comments}</span>
                    </button>
                </div>
            </div>

            <CommentsSheet
                open={showComments}
                onClose={() => setShowComments(false)}
                commentCount={post.comments}
            />
        </article>
    );
}