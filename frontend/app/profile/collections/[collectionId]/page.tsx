"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    ChevronLeft,
    Globe2,
    Image as ImageIcon,
    Lock,
    MoreHorizontal,
    Music,
    Pencil,
    Plus,
    Trash2,
} from "lucide-react";
import {
    getPostsByIds,
    type LocalPost,
} from "@/lib/localPosts";
import {
    deleteCollection,
    getCollectionById,
    renameCollection,
    setCollectionVisibility,
    type Collection,
} from "@/lib/collections";
import { supabase } from "@/lib/supabase";

export default function CollectionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const collectionId = params.collectionId as string;

    const [collection, setCollection] =
        useState<Collection | null>(null);
    const [posts, setPosts] = useState<LocalPost[]>([]);
    const [isOwner, setIsOwner] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionInFlight, setActionInFlight] =
        useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadCollection() {
            try {
                const found = await getCollectionById(
                    collectionId
                );

                if (!found) {
                    if (!cancelled) {
                        setCollection(null);
                    }
                    return;
                }

                const [
                    loadedPosts,
                    {
                        data: { user },
                    },
                ] = await Promise.all([
                    getPostsByIds(found.postIds),
                    supabase.auth.getUser(),
                ]);

                if (!cancelled) {
                    setCollection(found);
                    setPosts(loadedPosts);
                    setIsOwner(user?.id === found.userId);
                }
            } catch (error) {
                console.error(
                    "Could not load collection:",
                    error
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadCollection();

        return () => {
            cancelled = true;
        };
    }, [collectionId]);

    async function handleRename() {
        if (!collection || actionInFlight) {
            return;
        }

        const name = window.prompt(
            "Rename this collection:",
            collection.name
        );

        if (!name?.trim()) {
            return;
        }

        const trimmedName = name.trim();
        setActionInFlight(true);

        try {
            await renameCollection(
                collection.id,
                trimmedName
            );

            setCollection({
                ...collection,
                name: trimmedName,
            });
            setShowOptions(false);
        } catch (error) {
            console.error(
                "Couldn't rename the collection:",
                error
            );
            alert("Couldn't rename the collection.");
        } finally {
            setActionInFlight(false);
        }
    }

    async function handleToggleVisibility() {
        if (!collection || actionInFlight) {
            return;
        }

        const newVisibility = !collection.isPublic;
        setActionInFlight(true);

        try {
            await setCollectionVisibility(
                collection.id,
                newVisibility
            );

            setCollection({
                ...collection,
                isPublic: newVisibility,
            });
            setShowOptions(false);
        } catch (error) {
            console.error(
                "Couldn't change collection visibility:",
                error
            );
            alert(
                "Couldn't change the collection visibility."
            );
        } finally {
            setActionInFlight(false);
        }
    }

    async function handleDelete() {
        if (!collection || actionInFlight) {
            return;
        }

        const confirmed = window.confirm(
            "Delete this collection? The posts inside it won't be deleted."
        );

        if (!confirmed) {
            return;
        }

        setActionInFlight(true);

        try {
            await deleteCollection(collection.id);
            router.push("/profile");
            router.refresh();
        } catch (error) {
            console.error(
                "Couldn't delete the collection:",
                error
            );
            alert("Couldn't delete the collection.");
            setActionInFlight(false);
        }
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-white px-5 pt-6 pb-[var(--bottom-nav-height)]">
                <div className="flex h-60 items-center justify-center">
                    <p className="text-sm text-neutral-400">
                        Loading...
                    </p>
                </div>
            </main>
        );
    }

    if (!collection) {
        return (
            <main className="min-h-screen bg-white px-5 pt-6 pb-[var(--bottom-nav-height)]">
                <div className="flex h-60 items-center justify-center text-center">
                    <div>
                        <p className="text-sm font-medium text-neutral-700">
                            Collection not found
                        </p>
                        <p className="mt-1 text-xs text-neutral-400">
                            It may be private or may have been
                            deleted.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-white pb-[var(--bottom-nav-height)]">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                    <button
                        onClick={() => router.back()}
                        aria-label="Back"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100"
                    >
                        <ChevronLeft
                            size={20}
                            className="text-neutral-700"
                        />
                    </button>

                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h1 className="truncate text-base font-semibold text-neutral-900">
                                {collection.name}
                            </h1>

                            {collection.isPublic ? (
                                <Globe2
                                    size={14}
                                    className="shrink-0 text-neutral-400"
                                />
                            ) : (
                                <Lock
                                    size={14}
                                    className="shrink-0 text-neutral-400"
                                />
                            )}
                        </div>

                        <p className="text-xs text-neutral-400">
                            {collection.isPublic
                                ? "Public collection"
                                : "Private collection"}
                        </p>
                    </div>

                    {isOwner && (
                        <button
                            onClick={() =>
                                void handleRename()
                            }
                            aria-label="Rename collection"
                        >
                            <Pencil
                                size={14}
                                className="text-neutral-400"
                            />
                        </button>
                    )}
                </div>

                {isOwner && (
                    <div className="relative">
                        <button
                            onClick={() =>
                                setShowOptions(
                                    (current) => !current
                                )
                            }
                            aria-label="Collection options"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100"
                        >
                            <MoreHorizontal
                                size={19}
                                className="text-neutral-700"
                            />
                        </button>

                        {showOptions && (
                            <>
                                <button
                                    className="fixed inset-0 z-20 cursor-default"
                                    onClick={() =>
                                        setShowOptions(false)
                                    }
                                    aria-label="Close collection options"
                                />

                                <div className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5">
                                    <button
                                        onClick={() =>
                                            void handleToggleVisibility()
                                        }
                                        disabled={
                                            actionInFlight
                                        }
                                        className="flex w-full items-center gap-2 border-b border-neutral-100 px-3 py-3 text-left text-sm font-medium text-neutral-800 disabled:opacity-60"
                                    >
                                        {collection.isPublic ? (
                                            <Lock size={15} />
                                        ) : (
                                            <Globe2
                                                size={15}
                                            />
                                        )}

                                        {collection.isPublic
                                            ? "Make private"
                                            : "Make public"}
                                    </button>

                                    <button
                                        onClick={() =>
                                            void handleDelete()
                                        }
                                        disabled={
                                            actionInFlight
                                        }
                                        className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm font-medium text-red-600 disabled:opacity-60"
                                    >
                                        <Trash2 size={15} />
                                        Delete collection
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {posts.length === 0 && !isOwner ? (
                <div className="flex h-48 items-center justify-center">
                    <p className="text-sm text-neutral-400">
                        No saved posts yet
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-1 p-1">
                    {posts.map((post) => (
                        <Link
                            href={`/profile/post/${post.id}?fromCollection=${collection.id}`}
                            key={post.id}
                            className="relative aspect-[4/5] overflow-hidden rounded-md bg-neutral-100"
                        >
                            {post.imageUrl ? (
                                <img
                                    src={post.imageUrl}
                                    alt={
                                        post.caption ||
                                        "Collection photo"
                                    }
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    <ImageIcon
                                        size={22}
                                        className="text-neutral-300"
                                    />
                                </div>
                            )}

                            {post.music && (
                                <div className="absolute left-1 top-1 rounded-full bg-black/50 p-1">
                                    <Music
                                        size={12}
                                        className="text-white"
                                    />
                                </div>
                            )}
                        </Link>
                    ))}

                    {isOwner && (
                        <Link
                            href={`/profile/collections/${collection.id}/add`}
                            className="flex aspect-[4/5] items-center justify-center rounded-md border-2 border-dashed border-neutral-300"
                        >
                            <Plus
                                size={22}
                                className="text-neutral-400"
                            />
                        </Link>
                    )}
                </div>
            )}
        </main>
    );
}
