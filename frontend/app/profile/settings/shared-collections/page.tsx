"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderSymlink } from "lucide-react";
import { BackHeader } from "@/components/BackHeader";
import { CollectionTile } from "@/components/CollectionTile";
import {
  getSharedCollections,
  leaveSharedCollection,
  type SharedCollection,
} from "@/lib/collections";

export default function SharedCollectionsPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<
    SharedCollection[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [leavingIds, setLeavingIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSharedCollections() {
      try {
        const sharedCollections = await getSharedCollections();

        if (!cancelled) {
          setCollections(sharedCollections);
        }
      } catch (error) {
        console.error("Could not load shared collections:", error);

        if (!cancelled) {
          alert("Couldn't load collections shared with you.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSharedCollections();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLeave(collection: SharedCollection) {
    if (leavingIds.has(collection.id)) {
      return;
    }

    const confirmed = window.confirm(
      `Leave "${collection.name}"? You will lose your shared access.`
    );

    if (!confirmed) {
      return;
    }

    setLeavingIds((current) => {
      const updated = new Set(current);
      updated.add(collection.id);
      return updated;
    });

    try {
      await leaveSharedCollection(collection.id);
      setCollections((current) =>
        current.filter((item) => item.id !== collection.id)
      );
    } catch (error) {
      console.error("Could not leave collection:", error);
      alert("Couldn't leave this collection.");
    } finally {
      setLeavingIds((current) => {
        const updated = new Set(current);
        updated.delete(collection.id);
        return updated;
      });
    }
  }

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 px-5 pt-6 pb-[var(--bottom-nav-height)]">
      <BackHeader title="Shared collections" />

      <p className="mt-5 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
        These collections were shared directly with you. Editors can
        rename the collection and add or remove posts; viewers can only open it.
      </p>

      {loading ? (
        <div className="py-16 text-center text-sm text-neutral-400">
          Loading shared collections...
        </div>
      ) : collections.length === 0 ? (
        <div className="mt-12 rounded-3xl bg-neutral-50 dark:bg-neutral-900 px-6 py-12 text-center">
          <FolderSymlink
            size={30}
            className="mx-auto text-neutral-400"
          />
          <h2 className="mt-3 text-base font-semibold text-neutral-900 dark:text-neutral-50">
            Nothing shared yet
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            A collection will appear here after a friend gives you
            access.
          </p>
        </div>
      ) : (
        <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-7">
          {collections.map((collection) => (
            <div key={collection.id} className="min-w-0">
              <CollectionTile
                collection={collection}
                posts={[]}
                onClick={() =>
                  router.push(
                    `/profile/collections/${collection.id}`
                  )
                }
              />

              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  {collection.accessRole === "editor"
                    ? "Can edit"
                    : "Can view"}
                </span>

                <button
                  onClick={() => void handleLeave(collection)}
                  disabled={leavingIds.has(collection.id)}
                  className="text-xs font-medium text-red-500 disabled:opacity-60"
                >
                  {leavingIds.has(collection.id)
                    ? "Leaving..."
                    : "Leave"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
