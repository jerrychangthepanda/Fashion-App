"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { BackHeader } from "@/components/BackHeader";
import { CollectionTile } from "@/components/CollectionTile";
import { getPosts, type LocalPost } from "@/lib/localPosts";
import {
  addPostToCollection,
  createCollection,
  getEditableCollections,
  removePostFromCollection,
  type EditableCollection,
} from "@/lib/collections";

export default function AddToCollectionPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as string;

  const [collections, setCollections] = useState<
    EditableCollection[]
  >([]);
  const [posts, setPosts] = useState<LocalPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyCollectionId, setBusyCollectionId] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      try {
        const [loadedCollections, loadedPosts] =
          await Promise.all([
            getEditableCollections(),
            getPosts(),
          ]);

        if (!cancelled) {
          setCollections(loadedCollections);
          setPosts(loadedPosts);
        }
      } catch (error) {
        console.error("Could not load collections:", error);

        if (!cancelled) {
          alert("Couldn't load your collections.");
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
  }, []);

  async function handleToggle(collectionId: string) {
    if (busyCollectionId) {
      return;
    }

    const collection = collections.find(
      (item) => item.id === collectionId
    );

    if (!collection) {
      return;
    }

    const isAlreadySaved = collection.postIds.includes(postId);
    setBusyCollectionId(collectionId);

    try {
      if (isAlreadySaved) {
        await removePostFromCollection(collectionId, postId);
      } else {
        await addPostToCollection(collectionId, postId);
      }

      setCollections((current) =>
        current.map((item) => {
          if (item.id !== collectionId) {
            return item;
          }

          return {
            ...item,
            postIds: isAlreadySaved
              ? item.postIds.filter((id) => id !== postId)
              : [postId, ...item.postIds],
          };
        })
      );
    } catch (error) {
      console.error("Couldn't update the collection:", error);
      alert("Couldn't update the collection.");
    } finally {
      setBusyCollectionId(null);
    }
  }

  async function handleCreateNew() {
    const name = window.prompt("Name this collection:");

    if (!name?.trim()) {
      return;
    }

    const isPublic = window.confirm(
      "Make this collection public?\n\nOK = Public\nCancel = Private"
    );

    try {
      const newCollection = await createCollection(
        name.trim(),
        isPublic
      );
      await addPostToCollection(newCollection.id, postId);

      const savedPost = posts.find((post) => post.id === postId);

      setCollections((current) => [
        {
          ...newCollection,
          permission: "owner",
          postIds: [postId],
          previewImageUrls: savedPost?.imageUrl
            ? [savedPost.imageUrl]
            : [],
        },
        ...current,
      ]);
    } catch (error) {
      console.error("Couldn't create the collection:", error);
      alert("Couldn't create the collection.");
    }
  }

  return (
    <main className="min-h-screen bg-white px-5 pb-[var(--bottom-nav-height)] pt-6 dark:bg-neutral-950">
      <BackHeader title="Save to Collection" />

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-neutral-400 dark:text-neutral-500">
            Loading...
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-4">
            {collections.map((collection) => (
              <div
                key={collection.id}
                className={
                  busyCollectionId === collection.id
                    ? "opacity-60"
                    : ""
                }
              >
                <CollectionTile
                  collection={collection}
                  posts={posts}
                  selected={collection.postIds.includes(postId)}
                  onClick={() =>
                    void handleToggle(collection.id)
                  }
                />

                {collection.permission === "editor" && (
                  <p className="mt-1 text-center text-[10px] font-medium text-neutral-400 dark:text-neutral-500">
                    Shared editor
                  </p>
                )}
              </div>
            ))}

            <button
              onClick={() => void handleCreateNew()}
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
          </div>

          {collections.length === 0 && (
            <p className="mt-5 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Create a collection to save this post.
            </p>
          )}
        </>
      )}

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
