"use client";

import { useState } from "react";
import { PostCard } from "@/components/PostCard";
import { deleteLocalPost, type LocalPost } from "@/lib/localPosts";

export function FeedList({ posts }: { posts: LocalPost[] }) {
    const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([]);

    const visiblePosts = posts.filter((post) => !hiddenPostIds.includes(post.id));

    function handleDelete(postId: string) {
        deleteLocalPost(postId);
        setHiddenPostIds((ids) => [...ids, postId]);
    }

    return (
        <div>
            {visiblePosts.map((post) => (
                <PostCard
                    key={post.id}
                    post={post}
                    onHide={() => setHiddenPostIds((ids) => [...ids, post.id])}
                    onDelete={() => handleDelete(post.id)}
                />
            ))}
        </div>
    );
}