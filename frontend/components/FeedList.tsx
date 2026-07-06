"use client";

import { useState } from "react";
import type { Post } from "@/lib/mockData";
import { PostCard } from "@/components/PostCard";

export function FeedList({ posts }: { posts: Post[] }) {
    const [hiddenIds, setHiddenIds] = useState<string[]>([]);

    function hidePost(id: string) {
        setHiddenIds((prev) => [...prev, id]);
    }

    const visiblePosts = posts.filter((post) => !hiddenIds.includes(post.id));

    return (
        <div>
            {visiblePosts.map((post) => (
                <PostCard key={post.id} post={post} onHide={() => hidePost(post.id)} />
            ))}
        </div>
    );
}