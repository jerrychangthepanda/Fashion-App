"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, Image as ImageIcon } from "lucide-react";
import { getLocalPosts, type LocalPost } from "@/lib/localPosts";
import { getCollections, setCollectionPostIds } from "@/lib/collections";
import { BackHeader } from "@/components/BackHeader";

export default function AddPostsToCollectionPage() {
    const router = useRouter();
    const params = useParams();
    const collectionId = params.collectionId as string;

    const [posts, setPosts] = useState<LocalPost[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        setPosts(getLocalPosts());

        const collection = getCollections().find((c) => c.id === collectionId);
        if (collection) {
            setSelectedIds(new Set(collection.postIds));
        }
    }, [collectionId]);

    function toggleSelected(postId: string) {
        setSelectedIds((current) => {
            const updated = new Set(current);
            if (updated.has(postId)) {
                updated.delete(postId);
            } else {
                updated.add(postId);
            }
            return updated;
        });
    }

    function handleSave() {
        const success = setCollectionPostIds(collectionId, Array.from(selectedIds));
        if (!success) {
            alert("Couldn't save — storage might be full.");
            return;
        }
        router.push(`/profile/collections/${collectionId}`);
    }

    return (
        <main className="min-h-screen bg-white px-5 pt-6 pb-[var(--bottom-nav-height)]">
            <BackHeader title="Select Posts" />

            {posts.length === 0 ? (
                <div className="flex h-40 items-center justify-center">
                    <p className="text-sm text-neutral-400">You haven't posted anything yet</p>
                </div>
            ) : (
                <div className="mt-6 grid grid-cols-3 gap-1">
                    {posts.map((post) => {
                        const selected = selectedIds.has(post.id);
                        return (
                            <button
                                key={post.id}
                                onClick={() => toggleSelected(post.id)}
                                className="relative aspect-[4/5] overflow-hidden rounded-md bg-neutral-100"
                            >
                                {post.imageUrl ? (
                                    <img
                                        src={post.imageUrl}
                                        alt={post.caption || "Post"}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <ImageIcon size={22} className="text-neutral-300" />
                                    </div>
                                )}

                                <div
                                    className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                                        selected
                                            ? "border-neutral-900 bg-neutral-900"
                                            : "border-white bg-black/20"
                                    }`}
                                >
                                    {selected && <Check size={12} className="text-white" />}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            <button
                onClick={handleSave}
                className="mt-8 w-full rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white"
            >
                Add to Collection
            </button>
        </main>
    );
}