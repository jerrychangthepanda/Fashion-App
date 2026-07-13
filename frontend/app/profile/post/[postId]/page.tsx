"use client";

import { useEffect, useRef, useState } from "react";
import {
    useParams,
    useRouter,
    useSearchParams,
} from "next/navigation";
import Link from "next/link";
import {
    Bookmark,
    ChevronLeft,
    FolderMinus,
    Heart,
    Image as ImageIcon,
    MessageCircle,
    MoreHorizontal,
    Music,
    Pencil,
    Trash2,
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
import { togglePostInCollection } from "@/lib/collections";
import { CommentsSheet } from "@/components/CommentsSheet";

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
                ] = await Promise.all([
                    getPostById(postId),
                    getCommentCount(postId),
                    getLikeCount(postId),
                    isLikedByCurrentUser(postId),
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
    }, [postId]);

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

    function handleRemoveFromCollection() {
        if (!fromCollection) {
            return;
        }

        const success = togglePostInCollection(
            fromCollection,
            postId
        );

        if (!success) {
            alert(
                "Couldn't remove the post from the collection."
            );

            return;
        }

        router.push(
            `/profile/collections/${fromCollection}`
        );

        router.refresh();
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

                    {showOptions && (
                        <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5">
                            <button
                                onClick={() =>
                                    router.push(
                                        `/profile/post/${post.id}/edit`
                                    )
                                }
                                className="flex w-full items-center gap-2 border-b border-neutral-100 px-3 py-3 text-left text-sm font-medium text-neutral-900"
                            >
                                <Pencil size={15} />
                                Edit post
                            </button>

                            <button
                                onClick={() =>
                                    router.push(
                                        `/profile/post/${post.id}/collections`
                                    )
                                }
                                className="flex w-full items-center gap-2 border-b border-neutral-100 px-3 py-3 text-left text-sm font-medium text-neutral-900"
                            >
                                <Bookmark size={15} />
                                Add to Collection
                            </button>

                            {fromCollection && (
                                <button
                                    onClick={
                                        handleRemoveFromCollection
                                    }
                                    className="flex w-full items-center gap-2 border-b border-neutral-100 px-3 py-3 text-left text-sm font-medium text-neutral-900"
                                >
                                    <FolderMinus size={15} />
                                    Remove from Collection
                                </button>
                            )}

                            <button
                                onClick={() =>
                                    void handleDeletePost()
                                }
                                disabled={deleting}
                                className="flex w-full items-center gap-2 px-3 py-3 text-left text-sm font-medium text-red-600 disabled:opacity-50"
                            >
                                <Trash2 size={15} />

                                {deleting
                                    ? "Deleting..."
                                    : "Delete post"}
                            </button>
                        </div>
                    )}
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
                                {post.username || "Username"}
                            </p>

                            <p className="text-xs text-neutral-400">
                                {post.timeAgo}
                            </p>
                        </div>
                    </Link>
                </div>

                <div className="mx-4 flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl bg-neutral-100">
                    {post.imageUrl ? (
                        <img
                            src={post.imageUrl}
                            alt={
                                post.caption ||
                                "Fashion post"
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
                                            post.music
                                                .artworkUrl
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