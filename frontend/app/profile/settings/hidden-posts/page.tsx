"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, Image as ImageIcon } from "lucide-react";
import { BackHeader } from "@/components/BackHeader";
import {
  getHiddenPosts,
  unhidePost,
} from "@/lib/hiddenPosts";
import type { LocalPost } from "@/lib/localPosts";

export default function HiddenPostsPage() {
  const [posts, setPosts] = useState<LocalPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [unhidingIds, setUnhidingIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    let cancelled = false;

    async function loadHiddenPosts() {
      try {
        const hiddenPosts = await getHiddenPosts();

        if (!cancelled) {
          setPosts(hiddenPosts);
        }
      } catch (error) {
        console.error("Could not load hidden posts:", error);

        if (!cancelled) {
          alert("Couldn't load your hidden posts.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHiddenPosts();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUnhide(postId: string) {
    if (unhidingIds.has(postId)) {
      return;
    }

    setUnhidingIds((current) => {
      const updated = new Set(current);
      updated.add(postId);
      return updated;
    });

    try {
      await unhidePost(postId);
      setPosts((current) =>
        current.filter((post) => post.id !== postId)
      );
    } catch (error) {
      console.error("Could not unhide post:", error);
      alert("Couldn't unhide this post.");
    } finally {
      setUnhidingIds((current) => {
        const updated = new Set(current);
        updated.delete(postId);
        return updated;
      });
    }
  }

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 px-5 pt-6 pb-[var(--bottom-nav-height)]">
      <BackHeader title="Hidden posts" />

      <p className="mt-5 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
        Hidden posts stay out of your feed until you unhide them.
      </p>

      {loading ? (
        <div className="py-16 text-center text-sm text-neutral-400">
          Loading hidden posts...
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-12 rounded-3xl bg-neutral-50 dark:bg-neutral-900 px-6 py-12 text-center">
          <Eye
            size={28}
            className="mx-auto text-neutral-400"
          />
          <h2 className="mt-3 text-base font-semibold text-neutral-900 dark:text-neutral-50">
            No hidden posts
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Posts you hide will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {posts.map((post) => {
            const unhiding = unhidingIds.has(post.id);

            return (
              <article
                key={post.id}
                className="overflow-hidden rounded-3xl border border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-900"
              >
                <Link
                  href={`/profile/post/${post.id}`}
                  className="block"
                >
                  <div className="relative aspect-[4/3] bg-neutral-100 dark:bg-neutral-800">
                    {post.imageUrl ? (
                      <Image
                        src={post.imageUrl}
                        alt={`Post by ${post.username}`}
                        fill
                        sizes="(max-width: 640px) 100vw, 640px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon
                          size={30}
                          className="text-neutral-400"
                        />
                      </div>
                    )}
                  </div>
                </Link>

                <div className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                      @{post.username}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400">
                      {post.caption || "No caption"}
                    </p>
                  </div>

                  <button
                    onClick={() => void handleUnhide(post.id)}
                    disabled={unhiding}
                    className="shrink-0 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-neutral-50 dark:text-neutral-950"
                  >
                    {unhiding ? "Unhiding..." : "Unhide"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
