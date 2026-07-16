"use client";

import Image from "next/image";
import {
    Check,
    Folder,
    Globe2,
    Lock,
} from "lucide-react";
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
    const imagesFromLoadedPosts = collection.postIds
        .map(
            (id) =>
                posts.find((post) => post.id === id)?.imageUrl
        )
        .filter((url): url is string => Boolean(url));

    const images = Array.from(
        new Set([
            ...imagesFromLoadedPosts,
            ...collection.previewImageUrls,
        ])
    ).slice(0, 4);

    return (
        <button
            onClick={onClick}
            className="flex min-w-0 flex-col items-center gap-1.5"
        >
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-100 dark:bg-neutral-800">
                {images.length === 0 ? (
                    <div className="flex h-full w-full items-center justify-center">
                        <Folder
                            size={22}
                            className="text-neutral-300 dark:text-neutral-600"
                        />
                    </div>
                ) : (
                    <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px">
                        {[0, 1, 2, 3].map((index) => (
                            <div
                                key={index}
                                className="relative overflow-hidden bg-neutral-200 dark:bg-neutral-700"
                            >
                                {images[index] && (
                                    <Image
                                        src={images[index]}
                                        alt=""
                                        fill
                                        sizes="80px"
                                        className="object-cover"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55">
                    {collection.isPublic ? (
                        <Globe2
                            size={13}
                            className="text-white"
                        />
                    ) : (
                        <Lock
                            size={13}
                            className="text-white"
                        />
                    )}
                </div>

                {selected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Check
                            size={20}
                            className="text-white"
                        />
                    </div>
                )}
            </div>

            <span className="w-full truncate text-center text-xs font-medium text-neutral-900 dark:text-neutral-50">
                {collection.name}
            </span>
        </button>
    );
}
