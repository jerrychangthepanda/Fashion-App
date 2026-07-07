"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { BackHeader } from "@/components/BackHeader";
import { CollectionTile } from "@/components/CollectionTile";
import { getLocalPosts, type LocalPost } from "@/lib/localPosts";
import {
    getCollections,
    createCollection,
    togglePostInCollection,
    type Collection,
} from "@/lib/collections";

export default function AddToCollectionPage() {
    const params = useParams();
    const router = useRouter();
    const postId = params.postId as string;

    const [collections, setCollections] = useState<Collection[]>([]);
    const [posts, setPosts] = useState<LocalPost[]>([]);

    useEffect(() => {
        setCollections(getCollections());
        setPosts(getLocalPosts());
    }, []);

    function handleToggle(collectionId: string) {
        togglePostInCollection(collectionId, postId);
        setCollections(getCollections());
    }

    function handleCreateNew() {
        const name = window.prompt("Name this collection:");
        if (!name || !name.trim()) return;

        const newCollection = createCollection(name.trim());
        if (!newCollection) {
            alert("Couldn't create the collection — storage might be full.");
            return;
        }

        togglePostInCollection(newCollection.id, postId);
        setCollections(getCollections());
    }

    return (
        <main className="min-h-screen bg-white px-5 pt-6 pb-[var(--bottom-nav-height)]">
            <BackHeader title="Add to Collection" />

            <div className="mt-6 grid grid-cols-3 gap-4">
                {collections.map((collection) => (
                    <CollectionTile
                        key={collection.id}
                        collection={collection}
                        posts={posts}
                        selected={collection.postIds.includes(postId)}
                        onClick={() => handleToggle(collection.id)}
                    />
                ))}

                <button onClick={handleCreateNew} className="flex flex-col items-center gap-1.5">
                    <div className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-neutral-300">
                        <Plus size={22} className="text-neutral-400" />
                    </div>
                    <span className="text-xs font-medium text-neutral-500">Create new</span>
                </button>
            </div>

            <button
                onClick={() => {
                    router.back();
                    router.refresh();
                }}
                className="mt-8 w-full rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white"
            >
                Done
            </button>
        </main>
    );
}