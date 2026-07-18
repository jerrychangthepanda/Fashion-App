"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Check,
  Image as ImageIcon,
  Lock,
} from "lucide-react";
import {
  getCurrentUserPosts,
  type LocalPost,
} from "@/lib/localPosts";
import {
  getCollectionById,
  getCollectionPermission,
  setCollectionPostIds,
  type CollectionPermission,
} from "@/lib/collections";
import { BackHeader } from "@/components/BackHeader";

export default function AddPostsToCollectionPage() {
  const router = useRouter();
  const params = useParams();
  const collectionId = String(params.collectionId ?? "");

  const [posts, setPosts] = useState<LocalPost[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set()
  );
  const [permission, setPermission] =
    useState<CollectionPermission>("none");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      try {
        const [collection, loadedPosts, loadedPermission] =
          await Promise.all([
            getCollectionById(collectionId),
            getCurrentUserPosts(),
            getCollectionPermission(collectionId),
          ]);

        if (!collection) {
          throw new Error("Collection not found.");
        }

        if (!cancelled) {
          setSelectedIds(new Set(collection.postIds));
          setPosts(loadedPosts);
          setPermission(loadedPermission);
        }
      } catch (error) {
        console.error("Could not load posts:", error);

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

  const canEdit =
    permission === "owner" || permission === "editor";

  function toggleSelected(postId: string) {
    if (!canEdit) {
      return;
    }

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
    if (saving || !canEdit) {
      return;
    }

    setSaving(true);

    try {
      await setCollectionPostIds(
        collectionId,
        Array.from(selectedIds)
      );
      router.push(`/profile/collections/${collectionId}`);
      router.refresh();
    } catch (error) {
      console.error("Couldn't save the collection:", error);
      alert("Couldn't save the collection.");
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 px-5 pt-6 pb-[var(--bottom-nav-height)]">
      <BackHeader title="Select posts" />

      {loading ? (
        <div className="py-16 text-center text-sm text-neutral-400">
          Loading...
        </div>
      ) : !canEdit ? (
        <div className="mt-12 rounded-3xl bg-neutral-50 dark:bg-neutral-900 px-6 py-12 text-center">
          <Lock
            size={28}
            className="mx-auto text-neutral-400"
          />
          <h2 className="mt-3 text-base font-semibold text-neutral-900 dark:text-neutral-50">
            Viewing access only
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            The owner has not given you editing permission.
          </p>
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-12 rounded-3xl bg-neutral-50 dark:bg-neutral-900 px-6 py-12 text-center">
          <ImageIcon
            size={28}
            className="mx-auto text-neutral-400"
          />
          <h2 className="mt-3 text-base font-semibold text-neutral-900 dark:text-neutral-50">
            No posts are available
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Create a post first, then add it to this collection.
          </p>
        </div>
      ) : (
        <div className="mt-7 grid grid-cols-3 gap-2">
          {posts.map((post) => {
            const selected = selectedIds.has(post.id);

            return (
              <button
                key={post.id}
                onClick={() => toggleSelected(post.id)}
                className="relative aspect-[4/5] overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-800"
              >
                {post.imageUrl ? (
                  <Image
                    src={post.imageUrl}
                    alt={`Post by ${post.username}`}
                    fill
                    sizes="33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon
                      size={24}
                      className="text-neutral-400"
                    />
                  </div>
                )}

                {selected && (
                  <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-neutral-950 text-white dark:bg-white dark:text-neutral-950">
                    <Check size={16} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {canEdit && (
        <button
          onClick={() => void handleSave()}
          disabled={saving || loading}
          className="mt-8 w-full rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 dark:bg-neutral-50 dark:text-neutral-950"
        >
          {saving ? "Saving..." : "Save Collection"}
        </button>
      )}
    </main>
  );
}
