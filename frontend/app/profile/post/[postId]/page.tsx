"use client";

import { useEffect, useRef, useState } from "react";
import {
    useParams,
    useRouter,
    useSearchParams,
} from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
    ChevronLeft,
    Heart,
    Image as ImageIcon,
    MessageCircle,
    MoreHorizontal,
    Music,
    User,
    Volume2,
    VolumeX,
} from "lucide-react";
import {
    deletePost,
    getPostById,
    type LocalPost,
} from "@/lib/localPosts";
import { getCommentCount } from "@/lib/comments";
import {
    getLikeCount,
    isLikedByCurrentUser,
    likePost,
    unlikePost,
} from "@/lib/likes";
import {
    getCollectionById,
    removePostFromCollection,
} from "@/lib/collections";
import { supabase } from "@/lib/supabase";
import { CommentsSheet } from "@/components/CommentsSheet";
import { PostOptionsMenu } from "@/components/PostOptionsMenu";

export default function ProfilePostPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();

    const fromCollection =
        searchParams.get("fromCollection");

    const postId = params.postId as string;

    const [post, setPost] = useState<LocalPost | null>(null);
    const [postMissing, setPostMissing] = useState(false);

    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [likeActionInFlight, setLikeActionInFlight] =
        useState(false);
    const [commentCount, setCommentCount] = useState(0);

    const [showComments, setShowComments] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [musicPlaying, setMusicPlaying] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [removingFromCollection, setRemovingFromCollection] =
        useState(false);

    // Real ownership, checked fresh against Supabase auth rather than
    // localStorage (which can go stale after switching accounts).
    const [currentUserId, setCurrentUserId] = useState<
        string | null
    >(null);

    // Whether the SIGNED-IN user owns the collection this post is
    // being viewed from — independent of post ownership, since you
    // can save someone else's post into your own collection. Only
    // when this is true should "Remove from Collection" be offered.
    const [isOwnCollection, setIsOwnCollection] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadPost() {
            try {
                setPostMissing(false);

                const [
                    foundPost,
                    loadedCommentCount,
                    loadedLikeCount,
                    likedByMe,
                    userResult,
                    collectionResult,
                ] = await Promise.all([
                    getPostById(postId),
                    getCommentCount(postId),
                    getLikeCount(postId),
                    isLikedByCurrentUser(postId),
                    supabase.auth.getUser(),
                    fromCollection
                        ? getCollectionById(fromCollection)
                        : Promise.resolve(null),
                ]);

                if (cancelled) {
                    return;
                }

                if (!foundPost) {
                    setPostMissing(true);
                    return;
                }

                setPost(foundPost);
                setLikeCount(loadedLikeCount);
                setLiked(likedByMe);
                setCommentCount(loadedCommentCount);

                if (userResult.error) {
                    console.warn(
                        "Could not check the current user:",
                        userResult.error
                    );
                }

                const signedInUserId =
                    userResult.data.user?.id ?? null;

                setCurrentUserId(signedInUserId);

                setIsOwnCollection(
                    Boolean(
                        collectionResult &&
                            signedInUserId &&
                            collectionResult.userId ===
                                signedInUserId
                    )
                );
            } catch (error) {
                console.error("Could not load post:", error);

                if (!cancelled) {
                    setPostMissing(true);
                }
            }
        }

        void loadPost();

        return () => {
            cancelled = true;
        };
    }, [postId, fromCollection]);

    async function toggleLike() {
        if (!post || likeActionInFlight) {
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

    async function toggleMusic() {
        const audio = audioRef.current;

        if (!audio) {
            return;
        }

        try {
            if (musicPlaying) {
                audio.pause();
                setMusicPlaying(false);
            } else {
                await audio.play();
                setMusicPlaying(true);
            }
        } catch (error) {
            console.error("Could not play audio:", error);
        }
    }

    async function handleDeletePost() {
        if (!post || deleting) {
            return;
        }

        try {
            setDeleting(true);

            await deletePost(post.id);

            router.push("/profile");
            router.refresh();
        } catch (error) {
            console.error("Could not delete post:", error);

            alert(
                error instanceof Error
                    ? error.message
                    : "Could not delete the post."
            );
        } finally {
            setDeleting(false);
        }
    }

    function handleHide() {
        router.back();
    }

    async function handleRemoveFromCollection() {
        if (!fromCollection || removingFromCollection) {
            return;
        }

        setRemovingFromCollection(true);

        try {
            await removePostFromCollection(
                fromCollection,
                postId
            );

            router.push(
                `/profile/collections/${fromCollection}`
            );

            router.refresh();
        } catch (error) {
            console.error(
                "Couldn't remove the post from the collection:",
                error
            );

            alert(
                "Couldn't remove the post from the collection."
            );
        } finally {
            setRemovingFromCollection(false);
        }
    }

    if (postMissing) {
        return (
            <main className="min-h-screen bg-white pb-[var(--bottom-nav-height)]">
                <div className="flex items-center border-b border-neutral-100 px-4 py-3">
                    <button
                        onClick={() =>
                            router.push("/profile")
                        }
                        aria-label="Back"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100"
                    >
                        <ChevronLeft
                            size={20}
                            className="text-neutral-700"
                        />
                    </button>

                    <h1 className="ml-3 text-base font-semibold text-neutral-900">
                        Post
                    </h1>
                </div>

                <div className="flex h-60 items-center justify-center">
                    <p className="text-sm text-neutral-400">
                        Post not found
                    </p>
                </div>
            </main>
        );
    }

    if (!post) {
        return (
            <main className="min-h-screen bg-white pb-[var(--bottom-nav-height)]">
                <div className="flex h-60 items-center justify-center">
                    <p className="text-sm text-neutral-400">
                        Loading...
                    </p>
                </div>
            </main>
        );
    }

    const isOwnPost = Boolean(
        currentUserId && post.userId === currentUserId
    );

    return (
        <main className="min-h-screen bg-white pb-[var(--bottom-nav-height)]">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() =>
                            router.push("/profile")
                        }
                        aria-label="Back"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100"
                    >
                        <ChevronLeft
                            size={20}
                            className="text-neutral-700"
                        />
                    </button>

                    <h1 className="text-base font-semibold text-neutral-900">
                        Post
                    </h1>
                </div>

                <div className="relative">
                    <button
                        onClick={() =>
                            setShowOptions(
                                (current) => !current
                            )
                        }
                        aria-label="Post options"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100"
                    >
                        <MoreHorizontal
                            size={19}
                            className="text-neutral-700"
                        />
                    </button>

                    <PostOptionsMenu
                        open={showOptions}
                        onClose={() => setShowOptions(false)}
                        post={post}
                        isOwnPost={isOwnPost}
                        onHide={handleHide}
                        onDelete={() => void handleDeletePost()}
                        collectionId={
                            isOwnCollection ? fromCollection : null
                        }
                        onRemoveFromCollection={() =>
                            void handleRemoveFromCollection()
                        }
                    />
                </div>
            </div>

            <article className="border-b border-neutral-100 pb-4">
                <div className="relative flex items-center justify-between px-4 py-3">
                    <Link
                        href="/profile"
                        className="flex items-center gap-2"
                    >
                        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-neutral-100">
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
                                    className="text-neutral-400"
                                />
                            )}
                        </div>

                        <div>
                            <p className="text-sm font-medium text-neutral-900">
                                {post.username || "Username"}
                            </p>

                            <p className="text-xs text-neutral-400">
                                {post.timeAgo}
                            </p>
                        </div>
                    </Link>
                </div>

                <div className="relative mx-4 flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-neutral-100">
                    {post.imageUrl ? (
                        <Image
                            src={post.imageUrl}
                            alt={
                                post.caption ||
                                "Fashion post"
                            }
                            fill
                            sizes="(max-width: 480px) 100vw, 480px"
                            className="object-cover"
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
                                    <Image
                                        src={
                                            post.music
                                                .artworkUrl
                                        }
                                        alt=""
                                        width={40}
                                        height={40}
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
                                onClick={() =>
                                    void toggleMusic()
                                }
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
                                onEnded={() =>
                                    setMusicPlaying(false)
                                }
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
                            onClick={() =>
                                setShowComments(true)
                            }
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
            </article>

            <CommentsSheet
                open={showComments}
                onClose={() => setShowComments(false)}
                postId={post.id}
                commentCount={commentCount}
                onCommentCountChange={setCommentCount}
            />
        </main>
    );
}