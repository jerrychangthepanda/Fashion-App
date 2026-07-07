"use client";

import { Check, Folder } from "lucide-react";
import type { Collection } from "@/lib/collections";
import type { LocalPost } from "@/lib/localPosts";

export function CollectionTile({
    collection,
    posts,
    selected,
    onClick,
}: {
    collection: Collection;
    posts: LocalPost[];
    selected?: boolean;
    onClick?: () => void;
}) {
    const images = collection.postIds
        .map((id) => posts.find((post) => post.id === id)?.imageUrl)
        .filter(Boolean) as string[];

    return (
        <button onClick={onClick} className="flex flex-col items-center gap-1.5">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-100">
                {images.length === 0 ? (
                    <div className="flex h-full w-full items-center justify-center">
                        <Folder size={22} className="text-neutral-300" />
                    </div>
                ) : (
                    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="overflow-hidden bg-neutral-200">
                                {images[i] && (
                                    <img src={images[i]} alt="" className="h-full w-full object-cover" />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {selected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Check size={20} className="text-white" />
                    </div>
                )}
            </div>

            <span className="w-full truncate text-center text-xs font-medium text-neutral-900">
                {collection.name}
            </span>
        </button>
    );
}