"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Image as ImageIcon, MoreHorizontal, Music, Pencil, Plus, Trash2 } from "lucide-react";
import { getLocalPosts, type LocalPost } from "@/lib/localPosts";
import {
    getCollections,
    renameCollection,
    deleteCollection,
    type Collection,
} from "@/lib/collections";

export default function CollectionDetailPage() {
    const router = useRouter();
    const params = useParams();
    const collectionId = params.collectionId as string;

    const [collection, setCollection] = useState<Collection | null>(null);
    const [posts, setPosts] = useState<LocalPost[]>([]);
    const [showOptions, setShowOptions] = useState(false);

    useEffect(() => {
        const found = getCollections().find((c) => c.id === collectionId);
        setCollection(found ?? null);
        setPosts(getLocalPosts());
    }, [collectionId]);

    function handleRename() {
        if (!collection) return;
        const name = window.prompt("Rename this collection:", collection.name);
        if (!name || !name.trim()) return;

        renameCollection(collection.id, name.trim());
        setCollection({ ...collection, name: name.trim() });
    }

    function handleDelete() {
        if (!collection) return;
        const confirmed = window.confirm("Delete this collection? The posts inside it won't be deleted.");
        if (!confirmed) return;

        deleteCollection(collection.id);
        router.push("/profile");
    }

    if (!collection) {
        return (
            <main className="min-h-screen bg-white px-5 pt-6 pb-[var(--bottom-nav-height)]">
                <div className="flex h-60 items-center justify-center">
                    <p className="text-sm text-neutral-400">Collection not found</p>
                </div>
            </main>
        );
    }

    const collectionPosts = collection.postIds
        .map((id) => posts.find((post) => post.id === id))
        .filter(Boolean) as LocalPost[];

    return (
        <main className="min-h-screen bg-white pb-[var(--bottom-nav-height)]">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.push("/profile")}
                        aria-label="Back"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100"
                    >
                        <ChevronLeft size={20} className="text-neutral-700" />
                    </button>
                    <h1 className="text-base font-semibold text-neutral-900">{collection.name}</h1>
                    <button onClick={handleRename} aria-label="Rename collection">
                        <Pencil size={14} className="text-neutral-400" />
                    </button>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowOptions(!showOptions)}
                        aria-label="Collection options"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100"
                    >
                        <MoreHorizontal size={19} className="text-neutral-700" />
                    </button>

                    {showOptions && (
                        <div className="absolute right-0 top-11 z-30 w-40 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5">
                            <button
                                onClick={handleDelete}
                                className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm font-medium text-red-600"
                            >
                                <Trash2 size={15} />
                                Delete Collection
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-1 p-1">
                {collectionPosts.map((post) => (
                    <Link
                        href={`/profile/post/${post.id}?fromCollection=${collection.id}`}
                        key={post.id}
                        className="relative aspect-[4/5] overflow-hidden rounded-md bg-neutral-100"
                    >
                        {post.imageUrl ? (
                            <img
                                src={post.imageUrl}
                                alt={post.caption || "Collection photo"}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center">
                                <ImageIcon size={22} className="text-neutral-300" />
                            </div>
                        )}

                        {post.music && (
                            <div className="absolute left-1 top-1 rounded-full bg-black/50 p-1">
                                <Music size={12} className="text-white" />
                            </div>
                        )}
                    </Link>
                ))}

                <Link
                    href={`/profile/collections/${collection.id}/add`}
                    className="flex aspect-[4/5] items-center justify-center rounded-md border-2 border-dashed border-neutral-300"
                >
                    <Plus size={22} className="text-neutral-400" />
                </Link>
            </div>
        </main>
    );
}