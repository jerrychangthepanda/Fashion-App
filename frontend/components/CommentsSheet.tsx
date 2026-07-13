"use client";

import {
    useEffect,
    useState,
    type FormEvent,
} from "react";
import {
    ChevronDown,
    Send,
    Trash2,
    User,
} from "lucide-react";
import {
    createComment,
    deleteComment,
    getComments,
    getCurrentUserId,
    type PublicComment,
} from "@/lib/comments";

export function CommentsSheet({
    open,
    onClose,
    postId,
    commentCount,
    onCommentCountChange,
}: {
    open: boolean;
    onClose: () => void;
    postId: string;
    commentCount: number;
    onCommentCountChange?: (count: number) => void;
}) {
    const [comments, setComments] = useState<PublicComment[]>([]);
    const [draft, setDraft] = useState("");
    const [currentUserId, setCurrentUserId] =
        useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [posting, setPosting] = useState(false);
    const [deletingId, setDeletingId] =
        useState<string | null>(null);

    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        if (!open) {
            return;
        }

        let cancelled = false;

        async function loadComments() {
            try {
                setLoading(true);
                setHasLoaded(false);
                setErrorMessage("");

                const [loadedComments, userId] =
                    await Promise.all([
                        getComments(postId),
                        getCurrentUserId(),
                    ]);

                if (cancelled) {
                    return;
                }

                setComments(loadedComments);
                setCurrentUserId(userId);
                setHasLoaded(true);
            } catch (error) {
                console.error(
                    "Could not load comments:",
                    error
                );

                if (!cancelled) {
                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : "Could not load comments."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadComments();

        return () => {
            cancelled = true;
        };
    }, [open, postId]);

    /*
     * Update PostCard's displayed count after the comments
     * state has finished updating. This avoids updating the
     * parent while CommentsSheet is rendering.
     */
    useEffect(() => {
        if (!open || !hasLoaded) {
            return;
        }

        onCommentCountChange?.(comments.length);
    }, [
        comments.length,
        hasLoaded,
        open,
        onCommentCountChange,
    ]);

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        const trimmedDraft = draft.trim();

        if (!trimmedDraft || posting) {
            return;
        }

        try {
            setPosting(true);
            setErrorMessage("");

            const newComment = await createComment(
                postId,
                trimmedDraft
            );

            setComments((currentComments) => [
                newComment,
                ...currentComments,
            ]);

            setDraft("");
        } catch (error) {
            console.error(
                "Could not create comment:",
                error
            );

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not post your comment."
            );
        } finally {
            setPosting(false);
        }
    }

    async function handleDelete(commentId: string) {
        if (deletingId) {
            return;
        }

        try {
            setDeletingId(commentId);
            setErrorMessage("");

            await deleteComment(commentId);

            setComments((currentComments) =>
                currentComments.filter(
                    (comment) => comment.id !== commentId
                )
            );
        } catch (error) {
            console.error(
                "Could not delete comment:",
                error
            );

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not delete the comment."
            );
        } finally {
            setDeletingId(null);
        }
    }

    if (!open) {
        return null;
    }

    const displayedCount = hasLoaded
        ? comments.length
        : commentCount;

    return (
        <div className="fixed inset-0 z-[100]">
            <div
                onClick={onClose}
                className="absolute inset-0 z-0 bg-black/40"
            />

            <div className="absolute inset-x-0 bottom-0 z-20 flex h-[70%] flex-col rounded-t-3xl bg-white shadow-2xl">
                <div className="flex justify-center pt-2">
                    <div className="h-1 w-10 rounded-full bg-neutral-200" />
                </div>

                <div className="flex items-center px-4 py-3">
                    <div className="h-8 w-8" />

                    <h2 className="flex-1 text-center text-sm font-semibold text-neutral-900">
                        Comments
                        {displayedCount > 0
                            ? ` (${displayedCount})`
                            : ""}
                    </h2>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close comments"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100"
                    >
                        <ChevronDown
                            size={17}
                            className="text-neutral-600"
                        />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto border-t border-neutral-100 px-4">
                    {loading ? (
                        <div className="flex h-full items-center justify-center">
                            <p className="text-sm text-neutral-400">
                                Loading comments...
                            </p>
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                            <p className="text-sm font-medium text-neutral-700">
                                No comments yet
                            </p>

                            <p className="mt-1 text-sm text-neutral-400">
                                Be the first to leave a comment.
                            </p>
                        </div>
                    ) : (
                        comments.map((comment) => {
                            const isOwnComment =
                                comment.userId ===
                                currentUserId;

                            return (
                                <div
                                    key={comment.id}
                                    className="flex items-start gap-3 border-b border-neutral-100 py-3"
                                >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100">
                                        {comment.avatarUrl ? (
                                            <img
                                                src={comment.avatarUrl}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <User
                                                size={16}
                                                className="text-neutral-400"
                                            />
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate text-sm font-medium text-neutral-900">
                                                {comment.username}
                                            </p>

                                            <span className="shrink-0 text-xs text-neutral-400">
                                                {comment.timeAgo}
                                            </span>
                                        </div>

                                        <p className="mt-0.5 break-words text-sm text-neutral-600">
                                            {comment.body}
                                        </p>
                                    </div>

                                    {isOwnComment && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                void handleDelete(
                                                    comment.id
                                                )
                                            }
                                            disabled={
                                                deletingId ===
                                                comment.id
                                            }
                                            aria-label="Delete comment"
                                            className="flex h-8 w-8 shrink-0 items-center justify-center text-neutral-400 disabled:opacity-40"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {errorMessage && (
                    <p className="border-t border-neutral-100 px-4 py-2 text-center text-xs text-red-500">
                        {errorMessage}
                    </p>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="relative z-30 flex items-center gap-3 border-t border-neutral-100 bg-white px-4 py-3"
                >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                        <User
                            size={16}
                            className="text-neutral-400"
                        />
                    </div>

                    <input
                        type="text"
                        value={draft}
                        onChange={(event) =>
                            setDraft(event.target.value)
                        }
                        maxLength={500}
                        disabled={posting}
                        autoFocus
                        placeholder="Add a comment..."
                        className="min-w-0 flex-1 rounded-full bg-neutral-100 px-4 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 disabled:opacity-60"
                    />

                    <button
                        type="submit"
                        disabled={!draft.trim() || posting}
                        aria-label="Post comment"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 disabled:bg-neutral-200"
                    >
                        <Send
                            size={15}
                            className="text-white"
                        />
                    </button>
                </form>
            </div>
        </div>
    );
}