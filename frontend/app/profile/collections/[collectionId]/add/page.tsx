"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
    Check,
    Image as ImageIcon,
} from "lucide-react";
import {
    getCurrentUserPosts,
    type LocalPost,
} from "@/lib/localPosts";
import {
    getCollectionById,
    setCollectionPostIds,
} from "@/lib/collections";
import { BackHeader } from "@/components/BackHeader";

export default function AddPostsToCollectionPage() {
    const router = useRouter();
    const params = useParams();
    const collectionId = params.collectionId as string;

    const [posts, setPosts] = useState<LocalPost[]>([]);
    const [selectedIds, setSelectedIds] = useState<
        Set<string>
    >(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadPage() {
            try {
                const [collection, loadedPosts] =
                    await Promise.all([
                        getCollectionById(collectionId),
                        getCurrentUserPosts(),
                    ]);

                if (!collection) {
                    throw new Error("Collection not found.");
                }

                if (!cancelled) {
                    setSelectedIds(
                        new Set(collection.postIds)
                    );
                    setPosts(loadedPosts);
                }
            } catch (error) {
                console.error(
                    "Could not load posts:",
                    error
                );

                if (!cancelled) {
                    alert("Couldn't load this collection.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadPage();

        return () => {
            cancelled = true;
        };
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

    async function handleSave() {
        if (saving) {
            return;
        }

        setSaving(true);

        try {
            await setCollectionPostIds(
                collectionId,
                Array.from(selectedIds)
            );

            router.push(
                `/profile/collections/${collectionId}`
            );
            router.refresh();
        } catch (error) {
            console.error(
                "Couldn't save the collection:",
                error
            );
            alert("Couldn't save the collection.");
            setSaving(false);
        }
    }

    return (
        <main className="min-h-screen bg-white px-5 pt-6 pb-[var(--bottom-nav-height)]">
            <BackHeader title="Select Posts" />

            {loading ? (
                <div className="flex h-40 items-center justify-center">
                    <p className="text-sm text-neutral-400">
                        Loading...
                    </p>
                </div>
            ) : posts.length === 0 ? (
                <div className="flex h-40 items-center justify-center">
                    <p className="text-sm text-neutral-400">
                        No posts are available
                    </p>
                </div>
            ) : (
                <div className="mt-6 grid grid-cols-3 gap-1">
                    {posts.map((post) => {
                        const selected =
                            selectedIds.has(post.id);

                        return (
                            <button
                                key={post.id}
                                onClick={() =>
                                    toggleSelected(post.id)
                                }
                                className="relative aspect-[4/5] overflow-hidden rounded-md bg-neutral-100"
                            >
                                {post.imageUrl ? (
                                    <Image
                                        src={post.imageUrl}
                                        alt={
                                            post.caption ||
                                            "Post"
                                        }
                                        fill
                                        sizes="(max-width: 480px) 33vw, 160px"
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                        <ImageIcon
                                            size={22}
                                            className="text-neutral-300"
                                        />
                                    </div>
                                )}

                                <div
                                    className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                                        selected
                                            ? "border-neutral-900 bg-neutral-900"
                                            : "border-white bg-black/20"
                                    }`}
                                >
                                    {selected && (
                                        <Check
                                            size={12}
                                            className="text-white"
                                        />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            <button
                onClick={() => void handleSave()}
                disabled={saving || loading}
                className="mt-8 w-full rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
                {saving
                    ? "Saving..."
                    : "Save Collection"}
            </button>
        </main>
    );
}
