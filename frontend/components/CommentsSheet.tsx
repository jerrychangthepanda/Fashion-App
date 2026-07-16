"use client";

import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
} from "react";
import Image from "next/image";
import {
    ChevronDown,
    Heart,
    Send,
    Trash2,
    User,
    X,
} from "lucide-react";
import {
    createComment,
    deleteComment,
    getComments,
    getCurrentUserId,
    updateComment,
    type PublicComment,
} from "@/lib/comments";
import {
    likeComment,
    unlikeComment,
} from "@/lib/commentLikes";

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
    const [replyingTo, setReplyingTo] =
        useState<PublicComment | null>(null);
    const [currentUserId, setCurrentUserId] =
        useState<string | null>(null);
    const [myAvatarUrl, setMyAvatarUrl] =
        useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [posting, setPosting] = useState(false);
    const [deletingId, setDeletingId] =
        useState<string | null>(null);
    const [editingId, setEditingId] =
        useState<string | null>(null);
    const [editingBody, setEditingBody] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);
    const [likeActionIds, setLikeActionIds] =
        useState<Set<string>>(new Set());
    const [errorMessage, setErrorMessage] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const savedProfileImage =
            localStorage.getItem("profileImage");

        if (savedProfileImage) {
            setMyAvatarUrl(savedProfileImage);
        }
    }, []);

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

    const topLevelComments = useMemo(
        () =>
            comments.filter(
                (comment) => comment.parentCommentId === null
            ),
        [comments]
    );

    function repliesFor(commentId: string): PublicComment[] {
        return comments
            .filter(
                (comment) =>
                    comment.parentCommentId === commentId
            )
            .sort(
                (a, b) =>
                    new Date(a.createdAt).getTime() -
                    new Date(b.createdAt).getTime()
            );
    }

    function startReply(comment: PublicComment) {
        setReplyingTo(comment);
        setErrorMessage("");

        window.setTimeout(() => {
            inputRef.current?.focus();
        }, 0);
    }

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
                trimmedDraft,
                replyingTo?.id ?? null
            );

            setComments((currentComments) =>
                replyingTo
                    ? [...currentComments, newComment]
                    : [newComment, ...currentComments]
            );
            setDraft("");
            setReplyingTo(null);
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
                    (comment) =>
                        comment.id !== commentId &&
                        comment.parentCommentId !== commentId
                )
            );

            if (
                replyingTo?.id === commentId ||
                replyingTo?.parentCommentId === commentId
            ) {
                setReplyingTo(null);
            }

            if (
                editingId === commentId ||
                comments.find(
                    (comment) => comment.id === editingId
                )?.parentCommentId === commentId
            ) {
                cancelEdit();
            }
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

    function startEdit(comment: PublicComment) {
        setEditingId(comment.id);
        setEditingBody(comment.body);
        setErrorMessage("");
    }

    function cancelEdit() {
        setEditingId(null);
        setEditingBody("");
    }

    async function handleSaveEdit(commentId: string) {
        if (savingEdit) {
            return;
        }

        const trimmed = editingBody.trim();

        if (!trimmed) {
            return;
        }

        const original = comments.find(
            (comment) => comment.id === commentId
        );

        if (original && trimmed === original.body) {
            cancelEdit();
            return;
        }

        try {
            setSavingEdit(true);
            setErrorMessage("");

            const result = await updateComment(
                commentId,
                trimmed
            );

            setComments((currentComments) =>
                currentComments.map((currentComment) =>
                    currentComment.id === commentId
                        ? {
                              ...currentComment,
                              body: result.body,
                              updatedAt: result.updatedAt,
                          }
                        : currentComment
                )
            );
            cancelEdit();
        } catch (error) {
            console.error(
                "Could not update comment:",
                error
            );
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not update the comment."
            );
        } finally {
            setSavingEdit(false);
        }
    }

    async function handleToggleLike(comment: PublicComment) {
        if (likeActionIds.has(comment.id)) {
            return;
        }

        const wasLiked = comment.likedByMe;

        setLikeActionIds((current) => {
            const next = new Set(current);
            next.add(comment.id);
            return next;
        });

        setComments((currentComments) =>
            currentComments.map((currentComment) =>
                currentComment.id === comment.id
                    ? {
                          ...currentComment,
                          likedByMe: !wasLiked,
                          likeCount: wasLiked
                              ? Math.max(
                                    0,
                                    currentComment.likeCount - 1
                                )
                              : currentComment.likeCount + 1,
                      }
                    : currentComment
            )
        );

        try {
            if (wasLiked) {
                await unlikeComment(comment.id);
            } else {
                await likeComment(comment.id);
            }
        } catch (error) {
            console.error(
                "Could not update comment like:",
                error
            );

            setComments((currentComments) =>
                currentComments.map((currentComment) =>
                    currentComment.id === comment.id
                        ? {
                              ...currentComment,
                              likedByMe: wasLiked,
                              likeCount: wasLiked
                                  ? currentComment.likeCount + 1
                                  : Math.max(
                                        0,
                                        currentComment.likeCount - 1
                                    ),
                          }
                        : currentComment
                )
            );

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not update the comment like."
            );
        } finally {
            setLikeActionIds((current) => {
                const next = new Set(current);
                next.delete(comment.id);
                return next;
            });
        }
    }

    function renderComment(
        comment: PublicComment,
        isReply: boolean
    ) {
        const isOwnComment =
            comment.userId === currentUserId;
        const likeInFlight = likeActionIds.has(comment.id);
        const isEditing = editingId === comment.id;

        return (
            <div
                key={comment.id}
                className={`flex items-start gap-3 py-3 ${
                    isReply
                        ? "ml-11 border-l border-neutral-100 dark:border-neutral-800 pl-3"
                        : "border-b border-neutral-100 dark:border-neutral-800"
                }`}
            >
                <div
                    className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800 ${
                        isReply ? "h-7 w-7" : "h-8 w-8"
                    }`}
                >
                    {comment.avatarUrl ? (
                        <Image
                            src={comment.avatarUrl}
                            alt=""
                            width={isReply ? 28 : 32}
                            height={isReply ? 28 : 32}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <User
                            size={isReply ? 14 : 16}
                            className="text-neutral-400 dark:text-neutral-500"
                        />
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                            {comment.username}
                        </p>
                        <span className="shrink-0 text-xs text-neutral-400 dark:text-neutral-500">
                            {comment.timeAgo}
                        </span>
                        {comment.updatedAt && (
                            <span className="shrink-0 text-xs text-neutral-400 dark:text-neutral-500">
                                (edited)
                            </span>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="mt-1">
                            <input
                                type="text"
                                value={editingBody}
                                onChange={(event) =>
                                    setEditingBody(
                                        event.target.value
                                    )
                                }
                                onKeyDown={(event) => {
                                    if (event.key === "Escape") {
                                        cancelEdit();
                                    }
                                }}
                                maxLength={500}
                                disabled={savingEdit}
                                autoFocus
                                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 px-2 py-1.5 text-sm text-neutral-900 dark:text-neutral-50 outline-none disabled:opacity-60"
                            />
                            <div className="mt-1 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() =>
                                        void handleSaveEdit(
                                            comment.id
                                        )
                                    }
                                    disabled={
                                        savingEdit ||
                                        editingBody.trim()
                                            .length === 0
                                    }
                                    className="text-xs font-medium text-neutral-900 dark:text-neutral-50 disabled:opacity-40"
                                >
                                    {savingEdit
                                        ? "Saving..."
                                        : "Save"}
                                </button>
                                <button
                                    type="button"
                                    onClick={cancelEdit}
                                    disabled={savingEdit}
                                    className="text-xs font-medium text-neutral-500 dark:text-neutral-400 disabled:opacity-40"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="mt-0.5 break-words text-sm text-neutral-600 dark:text-neutral-300">
                            {comment.body}
                        </p>
                    )}

                    {!isEditing && (
                        <div className="mt-1 flex items-center gap-3">
                            {!isReply && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        startReply(comment)
                                    }
                                    className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
                                >
                                    Reply
                                </button>
                            )}
                            {isOwnComment && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        startEdit(comment)
                                    }
                                    className="text-xs font-medium text-neutral-500 dark:text-neutral-400"
                                >
                                    Edit
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                    <button
                        type="button"
                        onClick={() =>
                            void handleToggleLike(comment)
                        }
                        disabled={likeInFlight}
                        aria-label={
                            comment.likedByMe
                                ? "Unlike comment"
                                : "Like comment"
                        }
                        className="flex min-h-8 min-w-8 items-center justify-center gap-1 text-neutral-400 dark:text-neutral-500 disabled:opacity-50"
                    >
                        <Heart
                            size={14}
                            className={
                                comment.likedByMe
                                    ? "fill-red-500 text-red-500"
                                    : "text-neutral-400 dark:text-neutral-500"
                            }
                        />
                        {comment.likeCount > 0 && (
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                {comment.likeCount}
                            </span>
                        )}
                    </button>

                    {isOwnComment && (
                        <button
                            type="button"
                            onClick={() =>
                                void handleDelete(comment.id)
                            }
                            disabled={
                                deletingId === comment.id ||
                                editingId === comment.id
                            }
                            aria-label="Delete comment"
                            className="flex h-8 w-8 items-center justify-center text-neutral-400 dark:text-neutral-500 disabled:opacity-40"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>
        );
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

            <div className="absolute inset-x-0 bottom-0 z-20 flex h-[70%] flex-col rounded-t-3xl bg-white dark:bg-neutral-950 shadow-2xl">
                <div className="flex justify-center pt-2">
                    <div className="h-1 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                </div>

                <div className="flex items-center px-4 py-3">
                    <div className="h-8 w-8" />
                    <h2 className="flex-1 text-center text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                        Comments
                        {displayedCount > 0
                            ? ` (${displayedCount})`
                            : ""}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close comments"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
                    >
                        <ChevronDown
                            size={17}
                            className="text-neutral-600 dark:text-neutral-300"
                        />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto border-t border-neutral-100 dark:border-neutral-800 px-4">
                    {loading ? (
                        <div className="flex h-full items-center justify-center">
                            <p className="text-sm text-neutral-400 dark:text-neutral-500">
                                Loading comments...
                            </p>
                        </div>
                    ) : topLevelComments.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                                No comments yet
                            </p>
                            <p className="mt-1 text-sm text-neutral-400 dark:text-neutral-500">
                                Be the first to leave a comment.
                            </p>
                        </div>
                    ) : (
                        topLevelComments.map((comment) => (
                            <div key={comment.id}>
                                {renderComment(comment, false)}
                                {repliesFor(comment.id).map(
                                    (reply) =>
                                        renderComment(reply, true)
                                )}
                            </div>
                        ))
                    )}
                </div>

                {errorMessage && (
                    <p className="border-t border-neutral-100 dark:border-neutral-800 px-4 py-2 text-center text-xs text-red-500">
                        {errorMessage}
                    </p>
                )}

                <div className="relative z-30 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                    {replyingTo && (
                        <div className="flex items-center justify-between px-16 pt-2 text-xs text-neutral-500 dark:text-neutral-400">
                            <span className="truncate">
                                Replying to @{replyingTo.username}
                            </span>
                            <button
                                type="button"
                                onClick={() => setReplyingTo(null)}
                                aria-label="Cancel reply"
                                className="ml-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
                            >
                                <X size={13} />
                            </button>
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        className="flex items-center gap-3 px-4 py-3"
                    >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                            {myAvatarUrl ? (
                                <Image
                                    src={myAvatarUrl}
                                    alt=""
                                    width={36}
                                    height={36}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <User
                                    size={16}
                                    className="text-neutral-400 dark:text-neutral-500"
                                />
                            )}
                        </div>

                        <input
                            ref={inputRef}
                            type="text"
                            value={draft}
                            onChange={(event) =>
                                setDraft(event.target.value)
                            }
                            maxLength={500}
                            disabled={posting}
                            autoFocus
                            placeholder={
                                replyingTo
                                    ? `Reply to @${replyingTo.username}...`
                                    : "Add a comment..."
                            }
                            className="min-w-0 flex-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-4 py-2.5 text-sm text-neutral-900 dark:text-neutral-50 outline-none placeholder:text-neutral-400 disabled:opacity-60"
                        />

                        <button
                            type="submit"
                            disabled={
                                posting || draft.trim().length === 0
                            }
                            aria-label={
                                replyingTo
                                    ? "Post reply"
                                    : "Post comment"
                            }
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 disabled:opacity-40"
                        >
                            <Send size={17} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
