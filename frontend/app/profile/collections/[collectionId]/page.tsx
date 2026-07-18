"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
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
  Share2,
  Trash2,
  X,
} from "lucide-react";
import {
  getPostsByIds,
  type LocalPost,
} from "@/lib/localPosts";
import {
  deleteCollection,
  getCollectionById,
  getCollectionPermission,
  removePostFromCollection,
  renameCollection,
  setCollectionVisibility,
  type Collection,
  type CollectionPermission,
} from "@/lib/collections";

export default function CollectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const collectionId = String(params.collectionId ?? "");

  const [collection, setCollection] =
    useState<Collection | null>(null);
  const [posts, setPosts] = useState<LocalPost[]>([]);
  const [permission, setPermission] =
    useState<CollectionPermission>("none");
  const [showOptions, setShowOptions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionInFlight, setActionInFlight] =
    useState(false);
  const [removingPostIds, setRemovingPostIds] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    let cancelled = false;

    async function loadCollection() {
      try {
        const [found, loadedPermission] = await Promise.all([
          getCollectionById(collectionId),
          getCollectionPermission(collectionId),
        ]);

        if (!found) {
          if (!cancelled) {
            setCollection(null);
            setPermission("none");
          }
          return;
        }

        const loadedPosts = await getPostsByIds(found.postIds);

        if (!cancelled) {
          setCollection(found);
          setPosts(loadedPosts);
          setPermission(loadedPermission);
        }
      } catch (error) {
        console.error("Could not load collection:", error);
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

  const isOwner = permission === "owner";
  const canEdit =
    permission === "owner" || permission === "editor";

  async function handleRename() {
    if (!collection || !canEdit || actionInFlight) {
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
      await renameCollection(collection.id, trimmedName);
      setCollection({
        ...collection,
        name: trimmedName,
      });
      setShowOptions(false);
    } catch (error) {
      console.error("Couldn't rename the collection:", error);
      alert("Couldn't rename the collection.");
    } finally {
      setActionInFlight(false);
    }
  }

  async function handleToggleVisibility() {
    if (!collection || !isOwner || actionInFlight) {
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
      alert("Couldn't change the collection visibility.");
    } finally {
      setActionInFlight(false);
    }
  }

  async function handleDelete() {
    if (!collection || !isOwner || actionInFlight) {
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
      console.error("Couldn't delete the collection:", error);
      alert("Couldn't delete the collection.");
      setActionInFlight(false);
    }
  }

  async function handleRemovePost(postId: string) {
    if (!collection || !canEdit || removingPostIds.has(postId)) {
      return;
    }

    const confirmed = window.confirm(
      "Remove this post from the collection?"
    );

    if (!confirmed) {
      return;
    }

    setRemovingPostIds((current) => {
      const updated = new Set(current);
      updated.add(postId);
      return updated;
    });

    try {
      await removePostFromCollection(collection.id, postId);
      setPosts((current) =>
        current.filter((post) => post.id !== postId)
      );
      setCollection((current) =>
        current
          ? {
              ...current,
              postIds: current.postIds.filter(
                (id) => id !== postId
              ),
            }
          : current
      );
    } catch (error) {
      console.error(
        "Couldn't remove the post from the collection:",
        error
      );
      alert("Couldn't remove this post.");
    } finally {
      setRemovingPostIds((current) => {
        const updated = new Set(current);
        updated.delete(postId);
        return updated;
      });
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-neutral-950 px-5 py-8 text-sm text-neutral-500">
        Loading...
      </main>
    );
  }

  if (!collection || permission === "none") {
    return (
      <main className="min-h-screen bg-white dark:bg-neutral-950 px-5 py-8">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="mt-16 text-center">
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            Collection not found
          </h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            It may be private, your access may have been removed, or
            it may have been deleted.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 px-5 pt-6 pb-[var(--bottom-nav-height)]">
      <header className="flex items-start gap-3">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold text-neutral-950 dark:text-neutral-50">
              {collection.name}
            </h1>

            {collection.isPublic ? (
              <Globe2
                size={16}
                className="shrink-0 text-neutral-400"
              />
            ) : (
              <Lock
                size={16}
                className="shrink-0 text-neutral-400"
              />
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {collection.isPublic
                ? "Public collection"
                : "Private collection"}
            </span>

            {!isOwner && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                {permission === "editor"
                  ? "Can edit"
                  : "Can view"}
              </span>
            )}
          </div>
        </div>

        {canEdit && (
          <button
            onClick={() => void handleRename()}
            disabled={actionInFlight}
            aria-label="Rename collection"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 disabled:opacity-60 dark:bg-neutral-800 dark:text-neutral-200"
          >
            <Pencil size={17} />
          </button>
        )}

        {isOwner && (
          <div className="relative">
            <button
              onClick={() =>
                setShowOptions((current) => !current)
              }
              aria-label="Collection options"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
            >
              <MoreHorizontal size={19} />
            </button>

            {showOptions && (
              <>
                <button
                  onClick={() => setShowOptions(false)}
                  aria-label="Close collection options"
                  className="fixed inset-0 z-40"
                />

                <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
                  <Link
                    href={`/profile/collections/${collection.id}/share`}
                    onClick={() => setShowOptions(false)}
                    className="flex w-full items-center gap-2 border-b border-neutral-100 px-4 py-3 text-left text-sm font-medium text-neutral-800 dark:border-neutral-800 dark:text-neutral-200"
                  >
                    <Share2 size={17} />
                    Share & permissions
                  </Link>

                  <button
                    onClick={() =>
                      void handleToggleVisibility()
                    }
                    disabled={actionInFlight}
                    className="flex w-full items-center gap-2 border-b border-neutral-100 px-4 py-3 text-left text-sm font-medium text-neutral-800 disabled:opacity-60 dark:border-neutral-800 dark:text-neutral-200"
                  >
                    {collection.isPublic ? (
                      <Lock size={17} />
                    ) : (
                      <Globe2 size={17} />
                    )}
                    {collection.isPublic
                      ? "Make private"
                      : "Make public"}
                  </button>

                  <button
                    onClick={() => void handleDelete()}
                    disabled={actionInFlight}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-red-600 disabled:opacity-60"
                  >
                    <Trash2 size={17} />
                    Delete collection
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      <div className="mt-8">
        {posts.length === 0 && !canEdit ? (
          <div className="rounded-3xl bg-neutral-50 dark:bg-neutral-900 px-6 py-12 text-center">
            <ImageIcon
              size={30}
              className="mx-auto text-neutral-400"
            />
            <h2 className="mt-3 text-base font-semibold text-neutral-900 dark:text-neutral-50">
              No saved posts yet
            </h2>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800"
              >
                <Link
                  href={`/profile/post/${post.id}?fromCollection=${collection.id}`}
                  className="block h-full"
                >
                  {post.imageUrl ? (
                    <Image
                      src={post.imageUrl}
                      alt={`Post by ${post.username}`}
                      fill
                      sizes="(max-width: 640px) 50vw, 320px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon
                        size={28}
                        className="text-neutral-400"
                      />
                    </div>
                  )}

                  {post.music && (
                    <span className="absolute bottom-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white">
                      <Music size={14} />
                    </span>
                  )}
                </Link>

                {canEdit && (
                  <button
                    onClick={() =>
                      void handleRemovePost(post.id)
                    }
                    disabled={removingPostIds.has(post.id)}
                    aria-label="Remove post from collection"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white backdrop-blur disabled:opacity-60"
                  >
                    {removingPostIds.has(post.id) ? (
                      <span className="text-xs">...</span>
                    ) : (
                      <X size={16} />
                    )}
                  </button>
                )}
              </div>
            ))}

            {canEdit && (
              <Link
                href={`/profile/collections/${collection.id}/add`}
                className="flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-neutral-300 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400"
              >
                <Plus size={24} />
                <span className="text-sm font-medium">Add posts</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
