"use client";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, Music, Search, Tag, User, X } from "lucide-react";
import { FeedList } from "@/components/FeedList";
import {
    getPostsByMusic,
    getPostsByTag,
    getPostsByUsername,
    getPostsPage,
    searchBrandSuggestions,
    searchMusicSuggestions,
    type LocalPost,
    type PostsPageCursor,
} from "@/lib/localPosts";
import { searchProfiles } from "@/lib/users";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

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
        title: string;
        artist: string;
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

    // Catches likes/comments/follows/collection shares that land while
    // this tab is already open — without this, the dot only reflects
    // whatever was unread at the moment the feed mounted. RLS on
    // notifications (recipient_id = auth.uid()) means Realtime only
    // ever delivers this viewer's own rows, so no filter bypass risk.
    useEffect(() => {
        let cancelled = false;
        let channel: ReturnType<typeof supabase.channel> | null = null;

        async function subscribeToNotifications() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (cancelled || !user) {
                return;
            }

            channel = supabase
                .channel(`notifications-bell:${user.id}`)
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "notifications",
                        filter: `recipient_id=eq.${user.id}`,
                    },
                    () => {
                        setHasNewNotification(true);
                    }
                )
                .subscribe();
        }

        void subscribeToNotifications();

        return () => {
            cancelled = true;

            if (channel) {
                void supabase.removeChannel(channel);
            }
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

    const [profileMatches, setProfileMatches] = useState<
        { username: string; profilePictureUrl: string | null }[]
    >([]);
    const [brandMatches, setBrandMatches] = useState<string[]>([]);
    const [musicMatches, setMusicMatches] = useState<
        { title: string; artist: string }[]
    >([]);

    // Profiles, brands, and music are all searched server-side, in
    // one debounced round trip per keystroke pause — nothing close to
    // the old approach of downloading every post in the database on
    // the first character typed.
    useEffect(() => {
        const trimmedQuery = searchQuery.trim();

        // Nothing to fetch for an empty query — the render below
        // already treats an empty query as "no results" (see
        // visibleProfileMatches etc.), so the stale match state left
        // behind here is simply never shown.
        if (!trimmedQuery) {
            return;
        }

        let cancelled = false;

        const timeoutId = setTimeout(async () => {
            try {
                const [profiles, brands, music] = await Promise.all([
                    searchProfiles(trimmedQuery),
                    searchBrandSuggestions(trimmedQuery),
                    searchMusicSuggestions(trimmedQuery),
                ]);

                if (!cancelled) {
                    setProfileMatches(
                        profiles.map((profile) => ({
                            username: profile.username,
                            profilePictureUrl:
                                profile.profilePictureUrl,
                        }))
                    );
                    setBrandMatches(brands);
                    setMusicMatches(music);
                }
            } catch (error) {
                console.error("Could not search:", error);

                if (!cancelled) {
                    setProfileMatches([]);
                    setBrandMatches([]);
                    setMusicMatches([]);
                }
            }
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, [searchQuery]);

    // Once a filter (profile/brand/music) is picked, fetch its
    // matching posts directly from the server instead of filtering an
    // in-memory copy of every post.
    const [filteredPosts, setFilteredPosts] = useState<LocalPost[]>(
        []
    );
    const [loadingFilteredPosts, setLoadingFilteredPosts] =
        useState(false);

    // Flips the loading flag on the moment selectedSearch changes —
    // adjusted directly during render (each setSelectedSearch call
    // produces a fresh object, so reference inequality reliably
    // detects a change) rather than via setState-in-effect, so the
    // skeleton shows immediately instead of one render late.
    const [syncedSelectedSearch, setSyncedSelectedSearch] =
        useState<SearchSelection>(null);

    if (selectedSearch !== syncedSelectedSearch) {
        setSyncedSelectedSearch(selectedSearch);

        if (selectedSearch) {
            setLoadingFilteredPosts(true);
        }
    }

    useEffect(() => {
        // Nothing to fetch when no filter is picked — filteredPosts
        // is only ever rendered inside the `selectedSearch ? ... :`
        // branch below, so leaving stale data here is harmless.
        if (!selectedSearch) {
            return;
        }

        let cancelled = false;

        const fetchMatches =
            selectedSearch.type === "brand"
                ? getPostsByTag(selectedSearch.value)
                : selectedSearch.type === "music"
                  ? getPostsByMusic(
                        selectedSearch.title,
                        selectedSearch.artist
                    )
                  : getPostsByUsername(selectedSearch.value);

        fetchMatches
            .then((matches) => {
                if (!cancelled) {
                    setFilteredPosts(matches);
                }
            })
            .catch((error) => {
                console.error(
                    "Could not load matching posts:",
                    error
                );

                if (!cancelled) {
                    setFilteredPosts([]);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingFilteredPosts(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [selectedSearch]);

    // An empty query means "no results" regardless of whatever the
    // last debounced fetch left in state — this is derived at render
    // time rather than cleared via effect+setState.
    const trimmedSearchQuery = searchQuery.trim();
    const visibleProfileMatches = trimmedSearchQuery
        ? profileMatches
        : [];
    const visibleBrandMatches = trimmedSearchQuery ? brandMatches : [];
    const visibleMusicMatches = trimmedSearchQuery ? musicMatches : [];

    const hasSearchResults =
        visibleProfileMatches.length > 0 ||
        visibleBrandMatches.length > 0 ||
        visibleMusicMatches.length > 0;

    function clearSearch() {
        setSearchQuery("");
        setSelectedSearch(null);
    }

    return (
        <main className="min-h-screen bg-white dark:bg-neutral-950 pb-[var(--bottom-nav-height)]">
            <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-5 py-4">
                <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                    Feed
                </h1>

                <Link
                    href="/notifications"
                    aria-label="Notifications"
                    className="relative flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
                >
                    <Bell size={19} className="text-neutral-700 dark:text-neutral-200" />

                    {hasNewNotification && (
                        <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-neutral-800" />
                    )}
                </Link>
            </div>

            <div className="border-b border-neutral-100 dark:border-neutral-800 px-4 py-3">
                <div className="flex items-center gap-2 rounded-full bg-neutral-100 dark:bg-neutral-800 px-4 py-2.5">
                    <Search size={18} className="text-neutral-400 dark:text-neutral-500" />

                    <input
                        value={searchQuery}
                        onChange={(event) => {
                            setSearchQuery(event.target.value);
                            setSelectedSearch(null);
                        }}
                        placeholder="Search profiles, brands, or music"
                        className="w-full bg-transparent text-sm text-neutral-900 dark:text-neutral-50 outline-none placeholder:text-neutral-400"
                    />

                    {(searchQuery || selectedSearch) && (
                        <button
                            onClick={clearSearch}
                            aria-label="Clear search"
                        >
                            <X size={17} className="text-neutral-400 dark:text-neutral-500" />
                        </button>
                    )}
                </div>
            </div>

            {selectedSearch && (
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 px-4 py-3">
                    <div>
                        <p className="text-xs text-neutral-400 dark:text-neutral-500">
                            Showing {selectedSearch.type}
                        </p>

                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                            {selectedSearch.label}
                        </p>
                    </div>

                    <button
                        onClick={clearSearch}
                        className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-300"
                    >
                        Clear
                    </button>
                </div>
            )}

            {searchQuery.trim() && !selectedSearch ? (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {hasSearchResults ? (
                        <>
                            {visibleProfileMatches.length > 0 && (
                                <section className="px-4 py-3">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                                        Profiles
                                    </p>

                                    <div className="space-y-1">
                                        {visibleProfileMatches.map(
                                            (profile) => (
                                                <Link
                                                    key={profile.username}
                                                    href={`/u/${profile.username}`}
                                                    className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                                                >
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
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
                                                                className="text-neutral-500 dark:text-neutral-400"
                                                            />
                                                        )}
                                                    </div>

                                                    <div>
                                                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                                                            {profile.username}
                                                        </p>

                                                        <p className="text-xs text-neutral-400 dark:text-neutral-500">
                                                            View profile
                                                        </p>
                                                    </div>
                                                </Link>
                                            )
                                        )}
                                    </div>
                                </section>
                            )}

                            {visibleBrandMatches.length > 0 && (
                                <section className="px-4 py-3">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                                        Brands
                                    </p>

                                    <div className="space-y-1">
                                        {visibleBrandMatches.map((brand) => (
                                            <button
                                                key={brand}
                                                onClick={() => {
                                                    setSelectedSearch({
                                                        type: "brand",
                                                        value: brand,
                                                        label: brand,
                                                    });
                                                }}
                                                className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900"
                                            >
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                                                    <Tag
                                                        size={17}
                                                        className="text-neutral-500 dark:text-neutral-400"
                                                    />
                                                </div>

                                                <div>
                                                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                                                        {brand}
                                                    </p>

                                                    <p className="text-xs text-neutral-400 dark:text-neutral-500">
                                                        View matching posts
                                                    </p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {visibleMusicMatches.length > 0 && (
                                <section className="px-4 py-3">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
                                        Music
                                    </p>

                                    <div className="space-y-1">
                                        {visibleMusicMatches.map((song) => {
                                            const label = `${song.title} - ${song.artist}`;

                                            return (
                                                <button
                                                    key={label}
                                                    onClick={() => {
                                                        setSelectedSearch({
                                                            type: "music",
                                                            title: song.title,
                                                            artist: song.artist,
                                                            label,
                                                        });
                                                    }}
                                                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-900"
                                                >
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                                                        <Music
                                                            size={17}
                                                            className="text-neutral-500 dark:text-neutral-400"
                                                        />
                                                    </div>

                                                    <div>
                                                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                                                            {label}
                                                        </p>

                                                        <p className="text-xs text-neutral-400 dark:text-neutral-500">
                                                            View posts using this
                                                            song
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}
                        </>
                    ) : (
                        <div className="px-5 py-12 text-center">
                            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                                No results found
                            </p>

                            <p className="mt-1 text-sm text-neutral-400 dark:text-neutral-500">
                                Try searching for a profile, brand, song, or
                                artist.
                            </p>
                        </div>
                    )}
                </div>
            ) : selectedSearch ? (
                // A filter is picked: filteredPosts is fetched fresh
                // from the server for that exact brand/song/profile,
                // so there's nothing more to page in.
                <FeedList
                    posts={filteredPosts}
                    searchQuery={selectedSearch.label}
                    loadingInitial={loadingFilteredPosts}
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