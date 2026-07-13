"use client";

import { useEffect, useMemo, useState } from "react";
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
    X,
} from "lucide-react";
import type { LocalPost } from "@/lib/localPosts";
import { getCollections, createCollection, type Collection } from "@/lib/collections";
import { CollectionTile } from "@/components/CollectionTile";
import { MOCK_FOLLOWING, MOCK_FOLLOWERS, getUsersByUsernames, type MockUser } from "@/lib/users";
import {
    followUser,
    followUserMock,
    getFollowerCount,
    getFollowers,
    getFollowingCount,
    getFollowingList,
    getFollowingUsernamesMock,
    isFollowing,
    isFollowingMock,
    unfollowUser,
    unfollowUserMock,
} from "@/lib/follows";

function FollowListSheet({
    open,
    title,
    users,
    onClose,
}: {
    open: boolean;
    title: string;
    users: MockUser[];
    onClose: () => void;
}) {
    const [searchQuery, setSearchQuery] = useState("");

    const filteredUsers = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();

        if (!query) return users;

        return users.filter((user) => {
            return (
                user.username.toLowerCase().includes(query) ||
                user.name.toLowerCase().includes(query) ||
                user.bio.toLowerCase().includes(query)
            );
        });
    }, [users, searchQuery]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/30">
            <button
                className="absolute inset-0 h-full w-full"
                aria-label="Close"
                onClick={onClose}
            />

            <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] rounded-t-3xl bg-white pb-6">
                <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
                    <h2 className="text-base font-semibold text-neutral-900">{title}</h2>

                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100"
                    >
                        <X size={17} className="text-neutral-600" />
                    </button>
                </div>

                <div className="px-4 py-3">
                    <div className="flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2.5">
                        <Search size={18} className="text-neutral-400" />

                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={`Search ${title.toLowerCase()}`}
                            className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                        />

                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} aria-label="Clear search">
                                <X size={16} className="text-neutral-400" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="max-h-[55vh] overflow-y-auto px-4">
                    {filteredUsers.length === 0 ? (
                        <div className="py-12 text-center">
                            <p className="text-sm font-medium text-neutral-700">
                                No users found
                            </p>
                            <p className="mt-1 text-sm text-neutral-400">
                                Try searching another name or username.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredUsers.map((user) => (
                                <Link
                                    key={user.username}
                                    href={`/u/${user.username}`}
                                    onClick={onClose}
                                    className="flex items-center gap-3 rounded-2xl px-2 py-3 hover:bg-neutral-50"
                                >
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100">
                                        {user.avatarImage ? (
                                            <img
                                                src={user.avatarImage}
                                                alt={user.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <User size={18} className="text-neutral-400" />
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-neutral-900">
                                            {user.username}
                                        </p>
                                        <p className="truncate text-xs text-neutral-500">
                                            {user.name}
                                        </p>
                                        <p className="truncate text-xs text-neutral-400">
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
}: {
    username: string;
    userId?: string | null;
    bio: string;
    avatarImage?: string | null;
    isOwnProfile: boolean;
    posts?: LocalPost[];
    collections?: Collection[];
    onPostDeleted?: (postId: string) => void;
}) {
    const router = useRouter();
    const [following, setFollowing] = useState(false);
    const [followActionInFlight, setFollowActionInFlight] =
        useState(false);
    const [activeTab, setActiveTab] = useState<"posts" | "collections">("posts");
    const [localCollections, setLocalCollections] = useState<Collection[]>(collections);
    const [openFollowList, setOpenFollowList] = useState<"following" | "followers" | null>(null);
    const [followingListUsers, setFollowingListUsers] = useState<MockUser[]>(MOCK_FOLLOWING);
    const [followersListUsers, setFollowersListUsers] = useState<MockUser[]>(MOCK_FOLLOWERS);
    const [followerCount, setFollowerCount] = useState(MOCK_FOLLOWERS.length);
    const [followingCount, setFollowingCount] = useState(MOCK_FOLLOWING.length);

    useEffect(() => {
        let cancelled = false;

        async function loadRealFollowState(realUserId: string) {
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
                console.error(
                    "Could not load follow counts:",
                    error
                );
            }

            if (!isOwnProfile) {
                try {
                    const followingByMe = await isFollowing(
                        realUserId
                    );

                    if (!cancelled) {
                        setFollowing(followingByMe);
                    }
                } catch (error) {
                    console.error(
                        "Could not load follow status:",
                        error
                    );
                }
            }
        }

        if (userId) {
            void loadRealFollowState(userId);
        } else {
            // Mock account fallback — unchanged behavior.
            setFollowingListUsers(
                getUsersByUsernames(getFollowingUsernamesMock())
            );
            setFollowersListUsers(MOCK_FOLLOWERS);
            setFollowerCount(MOCK_FOLLOWERS.length);
            setFollowingCount(MOCK_FOLLOWING.length);

            if (!isOwnProfile) {
                setFollowing(isFollowingMock(username));
            }
        }

        return () => {
            cancelled = true;
        };
    }, [isOwnProfile, userId, username]);

    async function handleToggleFollow() {
        if (followActionInFlight) {
            return;
        }

        if (!userId) {
            // Mock account — unchanged localStorage behavior.
            const nextFollowing = !following;
            setFollowing(nextFollowing);

            const success = nextFollowing
                ? followUserMock(username)
                : unfollowUserMock(username);

            if (!success) {
                alert("Couldn't update follow status - storage might be full.");
                setFollowing(!nextFollowing);
            }

            return;
        }

        const wasFollowing = following;

        setFollowing(!wasFollowing);
        setFollowerCount((count) =>
            wasFollowing ? Math.max(0, count - 1) : count + 1
        );

        setFollowActionInFlight(true);

        try {
            if (wasFollowing) {
                await unfollowUser(userId);
            } else {
                await followUser(userId);
            }
        } catch (error) {
            console.error(
                "Could not update follow status:",
                error
            );

            setFollowing(wasFollowing);
            setFollowerCount((count) =>
                wasFollowing ? count + 1 : Math.max(0, count - 1)
            );
        } finally {
            setFollowActionInFlight(false);
        }
    }

    function handleCreateCollection() {
        const name = window.prompt("Name this collection:");
        if (!name || !name.trim()) return;

        const newCollection = createCollection(name.trim());
        if (!newCollection) {
            alert("Couldn't create the collection - storage might be full.");
            return;
        }

        router.push(`/profile/collections/${newCollection.id}/add`);
    }

    function handleOpenCollection(collectionId: string) {
        router.push(`/profile/collections/${collectionId}`);
    }

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
                        onClick={() => void handleToggleFollow()}
                        disabled={followActionInFlight}
                        className={`mt-4 rounded-full px-5 py-2 text-sm font-medium disabled:opacity-60 ${following
                                ? "bg-neutral-100 text-neutral-700"
                                : "bg-neutral-900 text-white"
                            }`}
                    >
                        {following ? "Following" : "Follow"}
                    </button>
                )}

                <div className="mt-4 grid w-full grid-cols-2 overflow-hidden rounded-2xl bg-neutral-50">
                    <button
                        onClick={() => setOpenFollowList("following")}
                        className="border-r border-neutral-100 px-4 py-3 text-center"
                    >
                        <p className="text-base font-semibold text-neutral-900">
                            {followingCount}
                        </p>
                        <p className="text-xs font-medium text-neutral-500">
                            Following
                        </p>
                    </button>

                    <button
                        onClick={() => setOpenFollowList("followers")}
                        className="px-4 py-3 text-center"
                    >
                        <p className="text-base font-semibold text-neutral-900">
                            {followerCount}
                        </p>
                        <p className="text-xs font-medium text-neutral-500">
                            Followers
                        </p>
                    </button>
                </div>
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
                        onClick={() => {
                            setActiveTab("collections");
                            setLocalCollections(getCollections());
                        }}
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
                ) : isOwnProfile ? (
                    <div className="grid grid-cols-3 gap-4 pt-4">
                        {localCollections.map((collection) => (
                            <CollectionTile
                                key={collection.id}
                                collection={collection}
                                posts={posts}
                                onClick={() => handleOpenCollection(collection.id)}
                            />
                        ))}

                        <button
                            onClick={handleCreateCollection}
                            className="flex flex-col items-center gap-1.5"
                        >
                            <div className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-neutral-300">
                                <Plus size={22} className="text-neutral-400" />
                            </div>
                            <span className="text-xs font-medium text-neutral-500">
                                Create new
                            </span>
                        </button>
                    </div>
                ) : (
                    <div className="flex h-40 items-center justify-center">
                        <p className="text-sm text-neutral-400">
                            No collections yet
                        </p>
                    </div>
                )}
            </div>

            <FollowListSheet
                open={openFollowList === "following"}
                title="Following"
                users={followingListUsers}
                onClose={() => setOpenFollowList(null)}
            />

            <FollowListSheet
                open={openFollowList === "followers"}
                title="Followers"
                users={followersListUsers}
                onClose={() => setOpenFollowList(null)}
            />
        </main>
    );
}