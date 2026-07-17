"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
    Heart,
    Image as ImageIcon,
    MessageCircle,
    MoreHorizontal,
    Music,
    User,
    Volume2,
    VolumeX,
} from "lucide-react";
import type { LocalPost } from "@/lib/localPosts";
import { likePost, unlikePost } from "@/lib/likes";
import { CommentsSheet } from "@/components/CommentsSheet";
import { PostOptionsMenu } from "@/components/PostOptionsMenu";

export function PostCard({
    post,
    onHide,
    onDelete,
    // Whether the signed-in user has already liked this post — passed
    // down from a single batched query the parent runs for the whole
    // page, instead of each card fetching its own like state.
    initialLiked = false,
    // These three coordinate "only one post plays audio at a time"
    // across the whole feed. The parent (FeedList) tracks a single
    // active post id: isAudioActive tells this card whether IT is the
    // one allowed to be playing right now, onRequestAudioActive is how
    // this card asks to become that one (pausing whichever card was
    // previously active), and onAudioStopped tells the parent this
    // card is no longer playing so the "active" slot can be freed.
    // Defaults keep PostCard usable on its own outside a feed list.
    isAudioActive = true,
    onRequestAudioActive = () => {},
    onAudioStopped = () => {},
}: {
    post: LocalPost;
    onHide: () => void;
    onDelete?: () => void;
    initialLiked?: boolean;
    isAudioActive?: boolean;
    onRequestAudioActive?: () => void;
    onAudioStopped?: () => void;
}) {
    const [liked, setLiked] = useState(initialLiked);
    // Tracks the initialLiked prop we last synced from, so a change to
    // it (the parent's batched like-state fetch resolving after this
    // card already mounted) can be applied during render rather than
    // via a setState-in-effect, per React's "adjusting state when a
    // prop changes" guidance.
    const [syncedInitialLiked, setSyncedInitialLiked] =
        useState(initialLiked);

    if (initialLiked !== syncedInitialLiked) {
        setSyncedInitialLiked(initialLiked);
        setLiked(initialLiked);
    }

    const [likeCount, setLikeCount] = useState(post.likes);
    const [likeActionInFlight, setLikeActionInFlight] =
        useState(false);
    const [commentCount, setCommentCount] =
        useState(post.comments);

    const [showComments, setShowComments] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [musicPlaying, setMusicPlaying] = useState(false);

    const [currentUserId, setCurrentUserId] =
        useState<string | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    // Ref to the whole card so an IntersectionObserver can tell when
    // it has scrolled fully out of view.
    const cardRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        setCurrentUserId(localStorage.getItem("userId"));
    }, []);

    const isOwnPost = post.userId === currentUserId;
    const displayUsername = post.username;

    const profileHref = isOwnPost
        ? "/profile"
        : `/u/${encodeURIComponent(post.username)}`;

    // forceLike is used by double-tap: it should only ever land on
    // "liked", never toggle an already-liked post back off (matches
    // the standard double-tap-to-like convention).
    async function toggleLike(forceLike = false) {
        if (likeActionInFlight) {
            return;
        }

        const wasLiked = liked;
        const willLike = forceLike ? true : !wasLiked;

        if (willLike === wasLiked) {
            return;
        }

        setLiked(willLike);
        setLikeCount((count) =>
            willLike ? count + 1 : Math.max(0, count - 1)
        );

        setLikeActionInFlight(true);

        try {
            if (willLike) {
                await likePost(post.id);
            } else {
                await unlikePost(post.id);
            }
        } catch (error) {
            console.error("Could not update like:", error);

            setLiked(wasLiked);
            setLikeCount((count) =>
                willLike ? Math.max(0, count - 1) : count + 1
            );
        } finally {
            setLikeActionInFlight(false);
        }
    }

    // Double-tap-to-like detection: compares the gap between
    // successive taps against a manual timestamp rather than relying
    // on the browser's synthesized "dblclick" event, since that event
    // is historically unreliable for touch double-taps on mobile
    // (some browsers never fire it). This works identically for mouse
    // double-clicks and touch double-taps.
    const lastTapRef = useRef(0);
    const DOUBLE_TAP_WINDOW_MS = 300;

    const [heartPopId, setHeartPopId] = useState<number | null>(
        null
    );

    function handleImageTap() {
        const now = Date.now();

        if (now - lastTapRef.current < DOUBLE_TAP_WINDOW_MS) {
            lastTapRef.current = 0;

            // Always show the pop animation as feedback, even if the
            // post was already liked — only the network call/state
            // change is skipped in that case.
            setHeartPopId(now);
            void toggleLike(true);
        } else {
            lastTapRef.current = now;
        }
    }

    // Pauses this card's audio, rewinds it to the start, and flips
    // the icon back to muted. Used whenever playback should fully
    // reset: the user toggles it off, another card takes over as the
    // single "active" one, or this card scrolls out of view.
    function resetMusic() {
        const audio = audioRef.current;

        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }

        setMusicPlaying(false);
    }

    async function toggleMusic() {
        const audio = audioRef.current;

        if (!audio) {
            return;
        }

        try {
            if (musicPlaying) {
                resetMusic();
                onAudioStopped();
            } else {
                // Claim the single "active" slot first so any other
                // card that's currently playing gets told to stop.
                onRequestAudioActive();
                await audio.play();
                setMusicPlaying(true);
            }
        } catch (error) {
            console.error("Could not play audio:", error);
        }
    }

    // If some other post becomes the active one, this card loses
    // isAudioActive — if it was playing, stop it.
    useEffect(() => {
        if (!isAudioActive && musicPlaying) {
            resetMusic();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAudioActive]);

    // Always call the latest resetMusic/onAudioStopped from the
    // IntersectionObserver below without having to recreate the
    // observer on every render.
    const stopIfPlayingRef = useRef(() => {});

    useEffect(() => {
        stopIfPlayingRef.current = () => {
            if (musicPlaying) {
                resetMusic();
                onAudioStopped();
            }
        };
    });

    // Scrolling the post fully out of view resets its audio, same as
    // if the user had muted it manually.
    useEffect(() => {
        const node = cardRef.current;

        if (!node || !post.music) {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) {
                    stopIfPlayingRef.current();
                }
            },
            { threshold: 0 }
        );

        observer.observe(node);

        return () => observer.disconnect();
    }, [post.music]);

    return (
        <article
            ref={cardRef}
            className="border-b border-neutral-100 dark:border-neutral-800 pb-4"
        >
            <div className="relative flex items-center justify-between px-4 py-3">
                <Link
                    href={profileHref}
                    className="flex items-center gap-2"
                >
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                        {post.profilePictureUrl ? (
                            <Image
                                src={post.profilePictureUrl}
                                alt="Profile"
                                width={32}
                                height={32}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <User
                                size={16}
                                className="text-neutral-400 dark:text-neutral-500"
                            />
                        )}
                    </div>

                    <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                            {displayUsername}
                        </p>

                        <p className="text-xs text-neutral-400 dark:text-neutral-500">
                            {post.timeAgo}
                        </p>
                    </div>
                </Link>

                <button
                    onClick={() => setShowOptions(true)}
                    aria-label="Post options"
                >
                    <MoreHorizontal
                        size={18}
                        className="text-neutral-400 dark:text-neutral-500"
                    />
                </button>

                <PostOptionsMenu
                    open={showOptions}
                    onClose={() => setShowOptions(false)}
                    post={post}
                    isOwnPost={isOwnPost}
                    onHide={onHide}
                    onDelete={onDelete}
                />
            </div>

            <div
                onClick={handleImageTap}
                className="relative mx-4 flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800 select-none"
            >
                {post.imageUrl ? (
                    <Image
                        src={post.imageUrl}
                        alt={
                            post.caption || "Fashion post"
                        }
                        fill
                        sizes="(max-width: 480px) 100vw, 480px"
                        className="object-cover"
                    />
                ) : (
                    <ImageIcon
                        size={28}
                        className="text-neutral-300 dark:text-neutral-600"
                    />
                )}

                {heartPopId !== null && (
                    <div
                        key={heartPopId}
                        onAnimationEnd={() =>
                            setHeartPopId(null)
                        }
                        className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    >
                        <Heart
                            size={92}
                            className="animate-heart-pop fill-white text-white drop-shadow-lg"
                        />
                    </div>
                )}
            </div>

            <div className="px-4 pt-3">
                {post.music && (
                    <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-3">
                            {post.music.artworkUrl ? (
                                <Image
                                    src={
                                        post.music.artworkUrl
                                    }
                                    alt=""
                                    width={40}
                                    height={40}
                                    className="h-10 w-10 rounded-xl object-cover"
                                />
                            ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-neutral-950">
                                    <Music
                                        size={16}
                                        className="text-neutral-600 dark:text-neutral-300"
                                    />
                                </div>
                            )}

                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                                    {post.music.title}
                                </p>

                                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                                    {post.music.artist}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => void toggleMusic()}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white dark:bg-neutral-950"
                            aria-label={
                                musicPlaying
                                    ? "Pause music"
                                    : "Play music"
                            }
                        >
                            {musicPlaying ? (
                                <Volume2
                                    size={17}
                                    className="text-neutral-700 dark:text-neutral-200"
                                />
                            ) : (
                                <VolumeX
                                    size={17}
                                    className="text-neutral-700 dark:text-neutral-200"
                                />
                            )}
                        </button>

                        <audio
                            ref={audioRef}
                            src={post.music.previewUrl}
                            onPause={() =>
                                setMusicPlaying(false)
                            }
                            onEnded={() => {
                                resetMusic();
                                onAudioStopped();
                            }}
                        />
                    </div>
                )}

                <p className="text-sm text-neutral-900 dark:text-neutral-50">
                    {post.caption}
                </p>

                {post.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-300"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mt-3 flex items-center gap-4">
                    <button
                        onClick={() => void toggleLike()}
                        disabled={likeActionInFlight}
                        className="flex items-center gap-1.5 disabled:opacity-60"
                    >
                        <Heart
                            size={18}
                            className={
                                liked
                                    ? "fill-red-500 text-red-500"
                                    : "text-neutral-500 dark:text-neutral-400"
                            }
                        />

                        <span className="text-sm text-neutral-500 dark:text-neutral-400">
                            {likeCount}
                        </span>
                    </button>

                    <button
                        onClick={() => setShowComments(true)}
                        className="flex items-center gap-1.5"
                    >
                        <MessageCircle
                            size={18}
                            className="text-neutral-500 dark:text-neutral-400"
                        />

                        <span className="text-sm text-neutral-500 dark:text-neutral-400">
                            {commentCount}
                        </span>
                    </button>
                </div>
            </div>

            <CommentsSheet
                open={showComments}
                onClose={() => setShowComments(false)}
                postId={post.id}
                commentCount={commentCount}
                onCommentCountChange={setCommentCount}
            />
        </article>
    );
}