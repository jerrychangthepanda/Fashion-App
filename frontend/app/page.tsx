"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, Music, Search, Tag, User, X } from "lucide-react";
import { FeedList } from "@/components/FeedList";
import {
    getPosts,
    getPostsPage,
    type LocalPost,
    type PostsPageCursor,
} from "@/lib/localPosts";
import { searchProfiles } from "@/lib/users";
import { getUnreadNotificationCount } from "@/lib/notifications";

// How many posts load at a time, both on first paint and each time
// the user scrolls near the bottom — keeps the initial feed light
// instead of fetching every post that's ever been created.
const FEED_PAGE_SIZE = 6;

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
    // The main, paginated browse feed — starts with one page and
    // grows as the user scrolls, rather than loading every post.
    const [posts, setPosts] = useState<LocalPost[]>([]);
    const [hasMore, setHasMore] = useState(true);
    const [loadingInitialPosts, setLoadingInitialPosts] =
        useState(true);
    const [loadingMorePosts, setLoadingMorePosts] = useState(false);

    // React state updates aren't applied synchronously, so if
    // loadMorePosts got invoked twice back-to-back (e.g. a burst of
    // intersection callbacks) both calls could read the OLD
    // "loadingMorePosts"/"cursor" before the first call's state
    // change lands, and both would fetch the same page twice. These
    // refs are updated immediately, in the same tick, so the guard
    // and the cursor are always accurate no matter how the callback
    // is triggered.
    const loadMoreLockRef = useRef(false);
    const cursorRef = useRef<PostsPageCursor | null>(null);
    const hasMoreRef = useRef(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSearch, setSelectedSearch] =
        useState<SearchSelection>(null);

    const [hasNewNotification, setHasNewNotification] =
        useState(false);

    useEffect(() => {
        let cancelled = false;

        getUnreadNotificationCount()
            .then((count) => {
                if (!cancelled) {
                    setHasNewNotification(count > 0);
                }
            })
            .catch((error) => {
                console.error(
                    "Could not load notification count:",
                    error
                );
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadFirstPage() {
            try {
                const page = await getPostsPage(
                    null,
                    FEED_PAGE_SIZE
                );

                if (!cancelled) {
                    setPosts(page.posts);
                    setHasMore(page.hasMore);
                    cursorRef.current = page.nextCursor;
                    hasMoreRef.current = page.hasMore;
                }
            } catch (error) {
                console.error("Could not load posts:", error);
            } finally {
                if (!cancelled) {
                    setLoadingInitialPosts(false);
                }
            }
        }

        void loadFirstPage();

        return () => {
            cancelled = true;
        };
    }, []);

    const loadMorePosts = useCallback(async () => {
        if (loadMoreLockRef.current || !hasMoreRef.current) {
            return;
        }

        loadMoreLockRef.current = true;
        setLoadingMorePosts(true);

        try {
            const page = await getPostsPage(
                cursorRef.current,
                FEED_PAGE_SIZE
            );

            setPosts((current) => [...current, ...page.posts]);
            setHasMore(page.hasMore);
            cursorRef.current = page.nextCursor;
            hasMoreRef.current = page.hasMore;
        } catch (error) {
            console.error("Could not load more posts:", error);
        } finally {
            loadMoreLockRef.current = false;
            setLoadingMorePosts(false);
        }
    }, []);

    // Search needs to look across every post (for brand/music
    // suggestions and for showing all matches once a filter is
    // picked), which is a different job from the paginated browse
    // feed above. Rather than loading everything up front, fetch
    // this full corpus lazily — only once the user actually starts
    // searching — and cache it for the rest of the session.
    const [searchCorpus, setSearchCorpus] = useState<
        LocalPost[] | null
    >(null);

    useEffect(() => {
        if (!searchQuery.trim() || searchCorpus !== null) {
            return;
        }

        let cancelled = false;

        getPosts()
            .then((allPosts) => {
                if (!cancelled) {
                    setSearchCorpus(allPosts);
                }
            })
            .catch((error) => {
                console.error(
                    "Could not load posts to search:",
                    error
                );
            });

        return () => {
            cancelled = true;
        };
    }, [searchQuery, searchCorpus]);

    const postsForSearch = useMemo(
        () => searchCorpus ?? [],
        [searchCorpus]
    );

    const [profileMatches, setProfileMatches] = useState<
        { username: string; profilePictureUrl: string | null }[]
    >([]);

    useEffect(() => {
        let cancelled = false;
        const trimmedQuery = searchQuery.trim();

        if (!trimmedQuery) {
            setProfileMatches([]);
            return;
        }

        const timeoutId = setTimeout(async () => {
            try {
                const results = await searchProfiles(trimmedQuery);

                if (!cancelled) {
                    setProfileMatches(
                        results.map((profile) => ({
                            username: profile.username,
                            profilePictureUrl:
                                profile.profilePictureUrl,
                        }))
                    );
                }
            } catch (error) {
                console.error("Could not search profiles:", error);

                if (!cancelled) {
                    setProfileMatches([]);
                }
            }
        }, 250);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, [searchQuery]);

    const searchResults = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();

        if (!query) {
            return {
                brands: [],
                music: [],
            };
        }

        const brandMap = new Map<string, string>();
        const musicMap = new Map<string, string>();

        postsForSearch.forEach((post) => {
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
            brands: Array.from(brandMap.values()),
            music: Array.from(musicMap.values()),
        };
    }, [postsForSearch, searchQuery]);

    // A selected filter (profile/brand/music) matches against the
    // full search corpus, not just the posts paginated into view so
    // far — otherwise picking a filter could hide matches that
    // simply hadn't been scrolled to yet.
    const selectedPosts = useMemo(() => {
        if (!selectedSearch) {
            return posts;
        }

        if (selectedSearch.type === "profile") {
            return postsForSearch.filter(
                (post) => post.username === selectedSearch.value
            );
        }

        if (selectedSearch.type === "brand") {
            return postsForSearch.filter((post) =>
                post.tags.some(
                    (tag) =>
                        tag.toLowerCase() ===
                        selectedSearch.value.toLowerCase()
                )
            );
        }

        if (selectedSearch.type === "music") {
            return postsForSearch.filter((post) => {
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
    }, [posts, postsForSearch, selectedSearch]);

    const hasSearchResults =
        profileMatches.length > 0 ||
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
                            {profileMatches.length > 0 && (
                                <section className="px-4 py-3">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                                        Profiles
                                    </p>

                                    <div className="space-y-1">
                                        {profileMatches.map(
                                            (profile) => (
                                                <Link
                                                    key={profile.username}
                                                    href={`/u/${profile.username}`}
                                                    className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-neutral-50"
                                                >
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100">
                                                        {profile.profilePictureUrl ? (
                                                            <Image
                                                                src={
                                                                    profile.profilePictureUrl
                                                                }
                                                                alt={
                                                                    profile.username
                                                                }
                                                                width={36}
                                                                height={36}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <User
                                                                size={17}
                                                                className="text-neutral-500"
                                                            />
                                                        )}
                                                    </div>

                                                    <div>
                                                        <p className="text-sm font-medium text-neutral-900">
                                                            {profile.username}
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
            ) : selectedSearch ? (
                // A filter is picked: selectedPosts is already the
                // full, finite set of matches from the search corpus,
                // so there's nothing more to page in.
                <FeedList
                    posts={selectedPosts}
                    searchQuery={selectedSearch.label}
                />
            ) : (
                <FeedList
                    posts={posts}
                    loadingInitial={loadingInitialPosts}
                    hasMore={hasMore}
                    loadingMore={loadingMorePosts}
                    onLoadMore={() => void loadMorePosts()}
                />
            )}
        </main>
    );
}