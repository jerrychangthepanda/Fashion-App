"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    User,
    ChevronLeft,
    Settings,
    Grid2X2,
    Images,
    Music,
    Image as ImageIcon,
    Plus,
    Search,
    MoreHorizontal,
    Ban,
    Flag,
    X,
} from "lucide-react";
import type { LocalPost } from "@/lib/localPosts";
import {
  createCollection,
  type Collection,
  type SharedCollection,
} from "@/lib/collections";
import { ProfileCollectionsPanel } from "@/components/ProfileCollectionsPanel";
import {
    followUser,
    getFollowerCount,
    getFollowers,
    getFollowingCount,
    getFollowingList,
    isFollowing,
    unfollowUser,
    type FollowListUser,
} from "@/lib/follows";
import { blockUser } from "@/lib/blocks";
import { reportUser } from "@/lib/reports";

function FollowListSheet({
    open,
    title,
    users,
    onClose,
}: {
    open: boolean;
    title: string;
    users: FollowListUser[];
    onClose: () => void;
}) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredUsers = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();

        if (!query) {
            return users;
        }

        return users.filter((user) => {
            return (
                user.username
                    .toLowerCase()
                    .includes(query) ||
                user.name
                    .toLowerCase()
                    .includes(query) ||
                user.bio
                    .toLowerCase()
                    .includes(query)
            );
        });
    }, [users, searchQuery]);

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[60] bg-black/30">
            <button
                className="absolute inset-0 h-full w-full"
                aria-label="Close"
                onClick={onClose}
            />

            <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] rounded-t-3xl bg-white dark:bg-neutral-950 pb-6">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-5 py-4">
                    <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                        {title}
                    </h2>

                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
                    >
                        <X
                            size={17}
                            className="text-neutral-600 dark:text-neutral-300"
                        />
                    </button>
                </div>

                <div className="px-4 py-3">
                    <div className="flex items-center gap-2 rounded-full bg-neutral-100 dark:bg-neutral-800 px-4 py-2.5">
                        <Search
                            size={18}
                            className="text-neutral-400 dark:text-neutral-500"
                        />

                        <input
                            value={searchQuery}
                            onChange={(event) =>
                                setSearchQuery(
                                    event.target.value
                                )
                            }
                            placeholder={`Search ${title.toLowerCase()}`}
                            className="w-full bg-transparent text-sm text-neutral-900 dark:text-neutral-50 outline-none placeholder:text-neutral-400"
                        />

                        {searchQuery && (
                            <button
                                onClick={() =>
                                    setSearchQuery("")
                                }
                                aria-label="Clear search"
                            >
                                <X
                                    size={16}
                                    className="text-neutral-400 dark:text-neutral-500"
                                />
                            </button>
                        )}
                    </div>
                </div>

                <div className="max-h-[55vh] overflow-y-auto px-4">
                    {filteredUsers.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                                No users found
                            </p>

                            <p className="mt-1 text-sm text-neutral-400 dark:text-neutral-500">
                                Try searching another name or
                                username.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredUsers.map((user) => (
                                <Link
                                    key={user.username}
                                    href={`/u/${encodeURIComponent(
                                        user.username
                                    )}`}
                                    onClick={onClose}
                                    className="flex items-center gap-3 rounded-2xl px-2 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                                >
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                                        {user.avatarImage ? (
                                            <Image
                                                src={
                                                    user.avatarImage
                                                }
                                                alt={user.name}
                                                width={44}
                                                height={44}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <User
                                                size={18}
                                                className="text-neutral-400 dark:text-neutral-500"
                                            />
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                                            {user.username}
                                        </p>

                                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                                            {user.name}
                                        </p>

                                        <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">
                                            {user.bio}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function ProfileView({
    username,
    userId = null,
    bio,
    avatarImage,
    isOwnProfile,
    posts = [],
  collections = [],
  sharedCollections = [],
}: {
    username: string;
    userId?: string | null;
    bio: string;
    avatarImage?: string | null;
    isOwnProfile: boolean;
    posts?: LocalPost[];
  collections?: Collection[];
  sharedCollections?: SharedCollection[];
    onPostDeleted?: (postId: string) => void;
}) {
    const router = useRouter();

    const [following, setFollowing] = useState(false);

    const [
        followActionInFlight,
        setFollowActionInFlight,
    ] = useState(false);

    const [activeTab, setActiveTab] = useState<
        "posts" | "collections"
    >("posts");

    const [openFollowList, setOpenFollowList] = useState<
        "following" | "followers" | null
    >(null);

    const [
        followingListUsers,
        setFollowingListUsers,
    ] = useState<FollowListUser[]>([]);

    const [
        followersListUsers,
        setFollowersListUsers,
    ] = useState<FollowListUser[]>([]);

    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] =
        useState(0);

    const [showProfileMenu, setShowProfileMenu] =
        useState(false);
    const [blockActionInFlight, setBlockActionInFlight] =
        useState(false);
    const [reportActionInFlight, setReportActionInFlight] =
        useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadRealFollowState(
            realUserId: string
        ) {
            try {
                const [
                    followerCountResult,
                    followingCountResult,
                    followersResult,
                    followingResult,
                ] = await Promise.all([
                    getFollowerCount(realUserId),
                    getFollowingCount(realUserId),
                    getFollowers(realUserId),
                    getFollowingList(realUserId),
                ]);

                if (cancelled) {
                    return;
                }

                setFollowerCount(followerCountResult);
                setFollowingCount(followingCountResult);
                setFollowersListUsers(followersResult);
                setFollowingListUsers(followingResult);
            } catch (error) {
                console.warn(
                    "Could not load follow counts:",
                    error
                );
            }

            if (!isOwnProfile) {
                try {
                    const followingByMe =
                        await isFollowing(realUserId);

                    if (!cancelled) {
                        setFollowing(followingByMe);
                    }
                } catch (error) {
                    console.warn(
                        "Could not load follow status:",
                        error
                    );
                }
            }
        }

        if (userId) {
            void loadRealFollowState(userId);
        }

        return () => {
            cancelled = true;
        };
    }, [isOwnProfile, userId]);

    async function handleToggleFollow() {
        if (followActionInFlight || !userId) {
            return;
        }

        const wasFollowing = following;

        setFollowing(!wasFollowing);

        setFollowerCount((count) =>
            wasFollowing
                ? Math.max(0, count - 1)
                : count + 1
        );

        setFollowActionInFlight(true);

        try {
            if (wasFollowing) {
                await unfollowUser(userId);
            } else {
                await followUser(userId);
            }
        } catch (error) {
            console.warn(
                "Could not update follow status:",
                error
            );

            setFollowing(wasFollowing);

            setFollowerCount((count) =>
                wasFollowing
                    ? count + 1
                    : Math.max(0, count - 1)
            );
        } finally {
            setFollowActionInFlight(false);
        }
    }

    async function handleBlock() {
        if (blockActionInFlight || !userId) {
            return;
        }

        setShowProfileMenu(false);

        const confirmed = window.confirm(
            `Block @${username}? They won't be able to see your posts or profile, follow you, or like/comment on your posts. This also unfollows each other.`
        );

        if (!confirmed) {
            return;
        }

        setBlockActionInFlight(true);

        try {
            await blockUser(userId);

            // The blocked user's profile is no longer reachable
            // (getProfileByUsername filters blocks both ways), so
            // this page's data is now stale — leave it entirely
            // rather than show a broken partial state.
            router.replace("/");
        } catch (error) {
            console.error("Could not block user:", error);

            alert("Couldn't block this account.");

            setBlockActionInFlight(false);
        }
    }

    async function handleReportUser() {
        if (reportActionInFlight || !userId) {
            return;
        }

        setShowProfileMenu(false);

        const confirmed = window.confirm(
            `Report @${username}? Our team will review it.`
        );

        if (!confirmed) {
            return;
        }

        const rawReason = window.prompt(
            "Optional: what's wrong with this profile? (leave blank to skip)"
        );
        const reason =
            rawReason && rawReason.trim() ? rawReason.trim() : null;

        setReportActionInFlight(true);

        try {
            await reportUser(userId, reason);
            alert("Thanks, this profile has been reported.");
        } catch (error) {
            console.error("Could not report user:", error);

            alert("Couldn't report this profile.");
        } finally {
            setReportActionInFlight(false);
        }
    }

    async function handleCreateCollection() {
        const name = window.prompt(
            "Name this collection:"
        );

        if (!name?.trim()) {
            return;
        }

        const isPublic = window.confirm(
            "Make this collection public?\n\nOK = Public\nCancel = Private"
        );

        try {
            const newCollection =
                await createCollection(
                    name.trim(),
                    isPublic
                );

            router.push(
                `/profile/collections/${newCollection.id}/add`
            );
        } catch (error) {
            console.warn(
                "Could not create collection:",
                error
            );

            alert("Couldn't create the collection.");
        }
    }

    function handleOpenCollection(
        collectionId: string
    ) {
        router.push(
            `/profile/collections/${collectionId}`
        );
    }

    return (
        <main className="min-h-screen bg-white dark:bg-neutral-950 px-5 pt-6 pb-[var(--bottom-nav-height)]">
            <div className="flex items-center justify-between px-1">
                {!isOwnProfile ? (
                    <button
                        onClick={() => router.back()}
                        aria-label="Back"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
                    >
                        <ChevronLeft
                            size={20}
                            className="text-neutral-700 dark:text-neutral-200"
                        />
                    </button>
                ) : (
                    <div className="h-9 w-9" />
                )}

                {isOwnProfile ? (
                    <Link
                        href="/profile/settings"
                        aria-label="Settings"
                    >
                        <Settings
                            size={22}
                            className="text-neutral-700 dark:text-neutral-200"
                        />
                    </Link>
                ) : (
                    <div className="relative">
                        <button
                            onClick={() =>
                                setShowProfileMenu(
                                    (current) => !current
                                )
                            }
                            aria-label="Profile options"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
                        >
                            <MoreHorizontal
                                size={19}
                                className="text-neutral-700 dark:text-neutral-200"
                            />
                        </button>

                        {showProfileMenu && (
                            <>
                                <button
                                    onClick={() =>
                                        setShowProfileMenu(
                                            false
                                        )
                                    }
                                    className="fixed inset-0 z-40 cursor-default"
                                    aria-label="Close profile options"
                                />

                                <div className="absolute right-0 top-10 z-50 w-44 overflow-hidden rounded-xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-lg">
                                    <button
                                        onClick={() =>
                                            void handleReportUser()
                                        }
                                        disabled={
                                            reportActionInFlight
                                        }
                                        className="flex w-full items-center gap-2.5 border-b border-neutral-100 dark:border-neutral-800 px-3.5 py-2.5 text-left disabled:opacity-60"
                                    >
                                        <Flag
                                            size={16}
                                            className="text-red-500"
                                        />
                                        <span className="text-sm text-red-500">
                                            Report user
                                        </span>
                                    </button>

                                    <button
                                        onClick={() =>
                                            void handleBlock()
                                        }
                                        disabled={
                                            blockActionInFlight
                                        }
                                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left disabled:opacity-60"
                                    >
                                        <Ban
                                            size={16}
                                            className="text-red-500"
                                        />
                                        <span className="text-sm text-red-500">
                                            Block user
                                        </span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    {avatarImage ? (
                        <Image
                            src={avatarImage}
                            alt="Profile"
                            width={80}
                            height={80}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <User
                            size={30}
                            className="text-neutral-400 dark:text-neutral-500"
                        />
                    )}
                </div>

                <h1 className="mt-3 text-base font-semibold text-neutral-900 dark:text-neutral-50">
                    {username}
                </h1>

                <p className="mt-1 text-sm text-neutral-400 dark:text-neutral-500">
                    {bio}
                </p>

                {isOwnProfile ? (
                    <Link href="/profile/edit">
                        <button className="mt-4 rounded-full bg-neutral-100 dark:bg-neutral-800 px-5 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">
                            Edit profile
                        </button>
                    </Link>
                ) : (
                    <button
                        onClick={() =>
                            void handleToggleFollow()
                        }
                        disabled={
                            followActionInFlight ||
                            !userId
                        }
                        className={`mt-4 rounded-full px-5 py-2 text-sm font-medium disabled:opacity-60 ${following
                                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
                                : "bg-neutral-900 text-white"
                            }`}
                    >
                        {following
                            ? "Following"
                            : "Follow"}
                    </button>
                )}

                <div className="mt-4 grid w-full grid-cols-2 overflow-hidden rounded-2xl bg-neutral-50 dark:bg-neutral-900">
                    <button
                        onClick={() =>
                            setOpenFollowList(
                                "following"
                            )
                        }
                        className="border-r border-neutral-100 dark:border-neutral-800 px-4 py-3 text-center"
                    >
                        <p className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                            {followingCount}
                        </p>

                        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                            Following
                        </p>
                    </button>

                    <button
                        onClick={() =>
                            setOpenFollowList(
                                "followers"
                            )
                        }
                        className="px-4 py-3 text-center"
                    >
                        <p className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                            {followerCount}
                        </p>

                        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                            Followers
                        </p>
                    </button>
                </div>
            </div>

            <div className="mt-4 border-t border-neutral-200 dark:border-neutral-700">
                <div className="grid grid-cols-2 border-b border-neutral-200 dark:border-neutral-700">
                    <button
                        onClick={() =>
                            setActiveTab("posts")
                        }
                        className={`flex flex-col items-center py-3 text-xs ${activeTab === "posts"
                                ? "border-b-2 border-neutral-950 dark:border-neutral-50 font-medium text-neutral-950 dark:text-neutral-50"
                                : "text-neutral-400 dark:text-neutral-500"
                            }`}
                    >
                        <Grid2X2 size={17} />

                        <span className="mt-1">
                            Posts
                        </span>
                    </button>

                    <button
                        onClick={() =>
                            setActiveTab(
                                "collections"
                            )
                        }
                        className={`flex flex-col items-center py-3 text-xs ${activeTab ===
                                "collections"
                                ? "border-b-2 border-neutral-950 dark:border-neutral-50 font-medium text-neutral-950 dark:text-neutral-50"
                                : "text-neutral-400 dark:text-neutral-500"
                            }`}
                    >
                        <Images size={17} />

                        <span className="mt-1">
                            Collections
                        </span>
                    </button>
                </div>

                {activeTab === "posts" ? (
                    posts.length === 0 ? (
                        <div className="flex h-40 items-center justify-center">
                            <p className="text-sm text-neutral-400 dark:text-neutral-500">
                                No posts yet
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-1 pt-3">
                            {posts.map((post) => (
                                <Link
                                    href={`/profile/post/${post.id}`}
                                    key={post.id}
                                    className="relative aspect-[4/5] overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-800"
                                >
                                    {post.imageUrl ? (
                                        <Image
                                            src={
                                                post.imageUrl
                                            }
                                            alt={
                                                post.caption ||
                                                "Profile post"
                                            }
                                            fill
                                            sizes="(max-width: 480px) 33vw, 160px"
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            <ImageIcon
                                                size={22}
                                                className="text-neutral-300 dark:text-neutral-600"
                                            />
                                        </div>
                                    )}

                                    {post.music && (
                                        <div className="absolute left-1 top-1 rounded-full bg-black/50 p-1">
                                            <Music
                                                size={12}
                                                className="text-white"
                                            />
                                        </div>
                                    )}
                                </Link>
                            ))}
                        </div>
                    )
                ) : (
                    <ProfileCollectionsPanel
          collections={collections}
          sharedCollections={sharedCollections}
          posts={posts}
          isOwnProfile={isOwnProfile}
          onOpenCollection={handleOpenCollection}
          onCreateCollection={() => void handleCreateCollection()}
        />
      )}
    </div>

    <FollowListSheet
                open={
                    openFollowList === "following"
                }
                title="Following"
                users={followingListUsers}
                onClose={() =>
                    setOpenFollowList(null)
                }
            />

            <FollowListSheet
                open={
                    openFollowList === "followers"
                }
                title="Followers"
                users={followersListUsers}
                onClose={() =>
                    setOpenFollowList(null)
                }
            />
        </main>
    );
}