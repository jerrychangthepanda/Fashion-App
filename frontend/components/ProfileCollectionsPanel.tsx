"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { CollectionTile } from "@/components/CollectionTile";
import type {
  Collection,
  SharedCollection,
} from "@/lib/collections";
import type { LocalPost } from "@/lib/localPosts";

type CollectionSubtab = "mine" | "shared";

export function ProfileCollectionsPanel({
  collections,
  sharedCollections,
  posts,
  isOwnProfile,
  onOpenCollection,
  onCreateCollection,
}: {
  collections: Collection[];
  sharedCollections: SharedCollection[];
  posts: LocalPost[];
  isOwnProfile: boolean;
  onOpenCollection: (collectionId: string) => void;
  onCreateCollection: () => void;
}) {
  const [activeSubtab, setActiveSubtab] =
    useState<CollectionSubtab>("mine");

  const visibleCollections =
    isOwnProfile && activeSubtab === "shared"
      ? sharedCollections
      : collections;

  return (
    <div className="pt-3">
      {isOwnProfile && (
        <div className="mx-auto grid max-w-sm grid-cols-2 rounded-full bg-neutral-100 p-1 dark:bg-neutral-900">
          <button
            type="button"
            onClick={() => setActiveSubtab("mine")}
            aria-pressed={activeSubtab === "mine"}
            className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
              activeSubtab === "mine"
                ? "bg-white text-neutral-950 shadow-sm dark:bg-neutral-800 dark:text-neutral-50"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            My collections
          </button>

          <button
            type="button"
            onClick={() => setActiveSubtab("shared")}
            aria-pressed={activeSubtab === "shared"}
            className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
              activeSubtab === "shared"
                ? "bg-white text-neutral-950 shadow-sm dark:bg-neutral-800 dark:text-neutral-50"
                : "text-neutral-500 dark:text-neutral-400"
            }`}
          >
            Shared collections
          </button>
        </div>
      )}

      {visibleCollections.length === 0 &&
      (!isOwnProfile || activeSubtab === "shared") ? (
        <div className="flex h-40 items-center justify-center px-6 text-center">
          <p className="text-sm text-neutral-400 dark:text-neutral-500">
            {isOwnProfile
              ? "Collections that friends share with you will appear here."
              : "No public collections yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 pt-4">
          {visibleCollections.map((collection) => {
            const sharedCollection =
              isOwnProfile && activeSubtab === "shared"
                ? (collection as SharedCollection)
                : null;

            return (
              <div key={collection.id} className="min-w-0">
                <CollectionTile
                  collection={collection}
                  posts={posts}
                  onClick={() =>
                    onOpenCollection(collection.id)
                  }
                />

                {sharedCollection && (
                  <div className="mt-1 flex justify-center">
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                      {sharedCollection.accessRole === "editor"
                        ? "Can edit"
                        : "Can view"}
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {isOwnProfile && activeSubtab === "mine" && (
            <button
              type="button"
              onClick={onCreateCollection}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-600">
                <Plus
                  size={22}
                  className="text-neutral-400 dark:text-neutral-500"
                />
              </div>

              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Create new
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
