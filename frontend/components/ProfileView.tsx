"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    User,
    ChevronRight,
    ChevronLeft,
    Settings,
    Grid2X2,
    Images,
    Music,
    Image as ImageIcon,
} from "lucide-react";
import type { LocalPost } from "@/lib/localPosts";

export function ProfileView({
    username,
    bio,
    avatarImage,
    isOwnProfile,
    posts = [],
}: {
    username: string;
    bio: string;
    avatarImage?: string | null;
    isOwnProfile: boolean;
    posts?: LocalPost[];
    onPostDeleted?: (postId: string) => void;
}) {
    const router = useRouter();
    const [following, setFollowing] = useState(false);
    const [activeTab, setActiveTab] = useState<"posts" | "collections">("posts");

    return (
        <main className="min-h-screen bg-white px-5 pt-6 pb-[var(--bottom-nav-height)]">
            <div className="flex items-center justify-between px-1">
                {!isOwnProfile ? (
                    <button
                        onClick={() => router.back()}
                        aria-label="Back"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100"
                    >
                        <ChevronLeft size={20} className="text-neutral-700" />
                    </button>
                ) : (
                    <div className="h-9 w-9" />
                )}

                {isOwnProfile ? (
                    <Link href="/profile/settings" aria-label="Settings">
                        <Settings size={22} className="text-neutral-700" />
                    </Link>
                ) : (
                    <div className="h-9 w-9" />
                )}
            </div>

            <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-neutral-100">
                    {avatarImage ? (
                        <img
                            src={avatarImage}
                            alt="Profile"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <User size={30} className="text-neutral-400" />
                    )}
                </div>

                <h1 className="mt-3 text-base font-semibold text-neutral-900">
                    {username}
                </h1>

                <p className="mt-1 text-sm text-neutral-400">{bio}</p>

                {isOwnProfile ? (
                    <Link href="/profile/edit">
                        <button className="mt-4 rounded-full bg-neutral-100 px-5 py-2 text-sm font-medium text-neutral-700">
                            Edit profile
                        </button>
                    </Link>
                ) : (
                    <button
                        onClick={() => setFollowing(!following)}
                        className={`mt-4 rounded-full px-5 py-2 text-sm font-medium ${following
                                ? "bg-neutral-100 text-neutral-700"
                                : "bg-neutral-900 text-white"
                            }`}
                    >
                        {following ? "Following" : "Follow"}
                    </button>
                )}

                <button className="mt-4 flex w-full items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3">
                    <span className="text-sm font-medium text-neutral-700">
                        0 friends
                    </span>
                    <ChevronRight size={16} className="text-neutral-400" />
                </button>
            </div>

            <div className="mt-4 border-t border-neutral-200">
                <div className="grid grid-cols-2 border-b border-neutral-200">
                    <button
                        onClick={() => setActiveTab("posts")}
                        className={`flex flex-col items-center py-3 text-xs ${activeTab === "posts"
                                ? "border-b-2 border-neutral-950 font-medium text-neutral-950"
                                : "text-neutral-400"
                            }`}
                    >
                        <Grid2X2 size={17} />
                        <span className="mt-1">Posts</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("collections")}
                        className={`flex flex-col items-center py-3 text-xs ${activeTab === "collections"
                                ? "border-b-2 border-neutral-950 font-medium text-neutral-950"
                                : "text-neutral-400"
                            }`}
                    >
                        <Images size={17} />
                        <span className="mt-1">Collections</span>
                    </button>
                </div>

                {activeTab === "posts" ? (
                    posts.length === 0 ? (
                        <div className="flex h-40 items-center justify-center">
                            <p className="text-sm text-neutral-400">No posts yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-1 pt-3">
                            {posts.map((post) => (
                                <Link
                                    href={`/profile/post/${post.id}`}
                                    key={post.id}
                                    className="relative aspect-[4/5] overflow-hidden rounded-md bg-neutral-100"
                                >
                                    {post.imageUrl ? (
                                        <img
                                            src={post.imageUrl}
                                            alt={post.caption || "Profile post"}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <ImageIcon
                                                size={22}
                                                className="text-neutral-300"
                                            />
                                        </div>
                                    )}

                                    {post.music && (
                                        <div className="absolute left-1 top-1 rounded-full bg-black/50 p-1">
                                            <Music size={12} className="text-white" />
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="flex h-40 items-center justify-center">
                        <p className="text-sm text-neutral-400">
                            No collections yet
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}