"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Music, Search, Tag, User, X } from "lucide-react";
import { MOCK_POSTS } from "@/lib/mockData";
import { getAllUsers } from "@/lib/users";
import { FeedList } from "@/components/FeedList";
import { getPosts, type LocalPost } from "@/lib/localPosts";

type SearchSelection =
    | {
        type: "profile";
        value: string;
        label: string;
    }
    | {
        type: "brand";
        value: string;
        label: string;
    }
    | {
        type: "music";
        value: string;
        label: string;
    }
    | null;

export default function FeedPage() {
    const [supabasePosts, setSupabasePosts] = useState<LocalPost[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSearch, setSelectedSearch] =
        useState<SearchSelection>(null);

    // Change this to true if you want to test the red notification dot.
    const [hasNewNotification] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadPosts() {
            try {
                const loadedPosts = await getPosts();

                if (!cancelled) {
                    setSupabasePosts(loadedPosts);
                }
            } catch (error) {
                console.error("Could not load posts:", error);
            }
        }

        void loadPosts();

        return () => {
            cancelled = true;
        };
    }, []);

    const posts = useMemo<LocalPost[]>(
        () => [...supabasePosts, ...MOCK_POSTS],
        [supabasePosts]
    );

    const searchResults = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();

        if (!query) {
            return {
                profiles: [],
                brands: [],
                music: [],
            };
        }

        const matchingProfiles = getAllUsers()
            .filter(
                (user) =>
                    user.username.toLowerCase().includes(query) ||
                    user.name.toLowerCase().includes(query)
            )
            .map((user) => user.username);

        const brandMap = new Map<string, string>();
        const musicMap = new Map<string, string>();

        posts.forEach((post) => {
            post.tags.forEach((tag) => {
                if (tag.toLowerCase().includes(query)) {
                    brandMap.set(tag.toLowerCase(), tag);
                }
            });

            if (post.music) {
                const songLabel = `${post.music.title} - ${post.music.artist}`;

                if (
                    post.music.title.toLowerCase().includes(query) ||
                    post.music.artist.toLowerCase().includes(query)
                ) {
                    musicMap.set(songLabel.toLowerCase(), songLabel);
                }
            }
        });

        return {
            profiles: matchingProfiles,
            brands: Array.from(brandMap.values()),
            music: Array.from(musicMap.values()),
        };
    }, [posts, searchQuery]);

    const selectedPosts = useMemo(() => {
        if (!selectedSearch) {
            return posts;
        }

        if (selectedSearch.type === "profile") {
            return posts.filter(
                (post) => post.username === selectedSearch.value
            );
        }

        if (selectedSearch.type === "brand") {
            return posts.filter((post) =>
                post.tags.some(
                    (tag) =>
                        tag.toLowerCase() ===
                        selectedSearch.value.toLowerCase()
                )
            );
        }

        if (selectedSearch.type === "music") {
            return posts.filter((post) => {
                if (!post.music) {
                    return false;
                }

                const songLabel = `${post.music.title} - ${post.music.artist}`;

                return (
                    songLabel.toLowerCase() ===
                    selectedSearch.value.toLowerCase()
                );
            });
        }

        return posts;
    }, [posts, selectedSearch]);

    const hasSearchResults =
        searchResults.profiles.length > 0 ||
        searchResults.brands.length > 0 ||
        searchResults.music.length > 0;

    function clearSearch() {
        setSearchQuery("");
        setSelectedSearch(null);
    }

    return (
        <main className="min-h-screen bg-white pb-[var(--bottom-nav-height)]">
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
                <h1 className="text-lg font-semibold text-neutral-900">
                    Feed
                </h1>

                <Link
                    href="/notifications"
                    aria-label="Notifications"
                    className="relative flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100"
                >
                    <Bell size={19} className="text-neutral-700" />

                    {hasNewNotification && (
                        <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                    )}
                </Link>
            </div>

            <div className="border-b border-neutral-100 px-4 py-3">
                <div className="flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2.5">
                    <Search size={18} className="text-neutral-400" />

                    <input
                        value={searchQuery}
                        onChange={(event) => {
                            setSearchQuery(event.target.value);
                            setSelectedSearch(null);
                        }}
                        placeholder="Search profiles, brands, or music"
                        className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                    />

                    {(searchQuery || selectedSearch) && (
                        <button
                            onClick={clearSearch}
                            aria-label="Clear search"
                        >
                            <X size={17} className="text-neutral-400" />
                        </button>
                    )}
                </div>
            </div>

            {selectedSearch && (
                <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                    <div>
                        <p className="text-xs text-neutral-400">
                            Showing {selectedSearch.type}
                        </p>

                        <p className="text-sm font-medium text-neutral-900">
                            {selectedSearch.label}
                        </p>
                    </div>

                    <button
                        onClick={clearSearch}
                        className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-600"
                    >
                        Clear
                    </button>
                </div>
            )}

            {searchQuery.trim() && !selectedSearch ? (
                <div className="divide-y divide-neutral-100">
                    {hasSearchResults ? (
                        <>
                            {searchResults.profiles.length > 0 && (
                                <section className="px-4 py-3">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                                        Profiles
                                    </p>

                                    <div className="space-y-1">
                                        {searchResults.profiles.map(
                                            (username) => (
                                                <Link
                                                    key={username}
                                                    href={`/u/${username}`}
                                                    className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-neutral-50"
                                                >
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
                                                        <User
                                                            size={17}
                                                            className="text-neutral-500"
                                                        />
                                                    </div>

                                                    <div>
                                                        <p className="text-sm font-medium text-neutral-900">
                                                            {username}
                                                        </p>

                                                        <p className="text-xs text-neutral-400">
                                                            View profile
                                                        </p>
                                                    </div>
                                                </Link>
                                            )
                                        )}
                                    </div>
                                </section>
                            )}

                            {searchResults.brands.length > 0 && (
                                <section className="px-4 py-3">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                                        Brands
                                    </p>

                                    <div className="space-y-1">
                                        {searchResults.brands.map((brand) => (
                                            <button
                                                key={brand}
                                                onClick={() => {
                                                    setSelectedSearch({
                                                        type: "brand",
                                                        value: brand,
                                                        label: brand,
                                                    });
                                                }}
                                                className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-neutral-50"
                                            >
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
                                                    <Tag
                                                        size={17}
                                                        className="text-neutral-500"
                                                    />
                                                </div>

                                                <div>
                                                    <p className="text-sm font-medium text-neutral-900">
                                                        {brand}
                                                    </p>

                                                    <p className="text-xs text-neutral-400">
                                                        View matching posts
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {searchResults.music.length > 0 && (
                                <section className="px-4 py-3">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                                        Music
                                    </p>

                                    <div className="space-y-1">
                                        {searchResults.music.map((song) => (
                                            <button
                                                key={song}
                                                onClick={() => {
                                                    setSelectedSearch({
                                                        type: "music",
                                                        value: song,
                                                        label: song,
                                                    });
                                                }}
                                                className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-neutral-50"
                                            >
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
                                                    <Music
                                                        size={17}
                                                        className="text-neutral-500"
                                                    />
                                                </div>

                                                <div>
                                                    <p className="text-sm font-medium text-neutral-900">
                                                        {song}
                                                    </p>

                                                    <p className="text-xs text-neutral-400">
                                                        View posts using this
                                                        song
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </>
                    ) : (
                        <div className="px-5 py-12 text-center">
                            <p className="text-sm font-medium text-neutral-700">
                                No results found
                            </p>

                            <p className="mt-1 text-sm text-neutral-400">
                                Try searching for a profile, brand, song, or
                                artist.
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <FeedList
                    posts={selectedPosts}
                    searchQuery={selectedSearch?.label ?? ""}
                />
            )}
        </main>
    );
}