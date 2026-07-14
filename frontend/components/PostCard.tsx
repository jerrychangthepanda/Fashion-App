"use client";

import { useEffect, useRef, useState } from "react";
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
import { getCommentCount } from "@/lib/comments";
import {
    getLikeCount,
    isLikedByCurrentUser,
    likePost,
    unlikePost,
} from "@/lib/likes";
import { CommentsSheet } from "@/components/CommentsSheet";
import { PostOptionsMenu } from "@/components/PostOptionsMenu";

export function PostCard({
    post,
    onHide,
    onDelete,
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
    isAudioActive?: boolean;
    onRequestAudioActive?: () => void;
    onAudioStopped?: () => void;
}) {
    const [liked, setLiked] = useState(false);
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

    useEffect(() => {
        let cancelled = false;

        async function loadCommentCount() {
            try {
                const count = await getCommentCount(post.id);

                if (!cancelled) {
                    setCommentCount(count);
                }
            } catch (error) {
                console.error(
                    "Could not load comment count:",
                    error
                );
            }
        }

        void loadCommentCount();

        return () => {
            cancelled = true;
        };
    }, [post.id]);

    useEffect(() => {
        let cancelled = false;

        async function loadLikeState() {
            try {
                const [count, likedByMe] = await Promise.all([
                    getLikeCount(post.id),
                    isLikedByCurrentUser(post.id),
                ]);

                if (!cancelled) {
                    setLikeCount(count);
                    setLiked(likedByMe);
                }
            } catch (error) {
                console.error(
                    "Could not load like state:",
                    error
                );
            }
        }

        void loadLikeState();

        return () => {
            cancelled = true;
        };
    }, [post.id]);

    const isOwnPost = post.userId === currentUserId;
    const displayUsername = post.username;

    const profileHref = isOwnPost
        ? "/profile"
        : `/u/${encodeURIComponent(post.username)}`;

    async function toggleLike() {
        if (likeActionInFlight) {
            return;
        }

        const wasLiked = liked;

        setLiked(!wasLiked);
        setLikeCount((count) =>
            wasLiked ? Math.max(0, count - 1) : count + 1
        );

        setLikeActionInFlight(true);

        try {
            if (wasLiked) {
                await unlikePost(post.id);
            } else {
                await likePost(post.id);
            }
        } catch (error) {
            console.error("Could not update like:", error);

            setLiked(wasLiked);
            setLikeCount((count) =>
                wasLiked ? count + 1 : Math.max(0, count - 1)
            );
        } finally {
            setLikeActionInFlight(false);
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
            className="border-b border-neutral-100 pb-4"
        >
            <div className="relative flex items-center justify-between px-4 py-3">
                <Link
                    href={profileHref}
                    className="flex items-center gap-2"
                >
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-neutral-100">
                        {post.profilePictureUrl ? (
                            <img
                                src={post.profilePictureUrl}
                                alt="Profile"
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <User
                                size={16}
                                className="text-neutral-400"
                            />
                        )}
                    </div>

                    <div>
                        <p className="text-sm font-medium text-neutral-900">
                            {displayUsername}
                        </p>

                        <p className="text-xs text-neutral-400">
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
                        className="text-neutral-400"
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

            <div className="mx-4 flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-neutral-100">
                {post.imageUrl ? (
                    <img
                        src={post.imageUrl}
                        alt={
                            post.caption || "Fashion post"
                        }
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <ImageIcon
                        size={28}
                        className="text-neutral-300"
                    />
                )}
            </div>

            <div className="px-4 pt-3">
                {post.music && (
                    <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-neutral-100 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-3">
                            {post.music.artworkUrl ? (
                                <img
                                    src={
                                        post.music.artworkUrl
                                    }
                                    alt=""
                                    className="h-10 w-10 rounded-xl object-cover"
                                />
                            ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                                    <Music
                                        size={16}
                                        className="text-neutral-600"
                                    />
                                </div>
                            )}

                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-neutral-900">
                                    {post.music.title}
                                </p>

                                <p className="truncate text-xs text-neutral-500">
                                    {post.music.artist}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => void toggleMusic()}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white"
                            aria-label={
                                musicPlaying
                                    ? "Pause music"
                                    : "Play music"
                            }
                        >
                            {musicPlaying ? (
                                <Volume2
                                    size={17}
                                    className="text-neutral-700"
                                />
                            ) : (
                                <VolumeX
                                    size={17}
                                    className="text-neutral-700"
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

                <p className="text-sm text-neutral-900">
                    {post.caption}
                </p>

                {post.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                            <span
                                key={tag}
                                className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600"
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
                                    : "text-neutral-500"
                            }
                        />

                        <span className="text-sm text-neutral-500">
                            {likeCount}
                        </span>
                    </button>

                    <button
                        onClick={() => setShowComments(true)}
                        className="flex items-center gap-1.5"
                    >
                        <MessageCircle
                            size={18}
                            className="text-neutral-500"
                        />

                        <span className="text-sm text-neutral-500">
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