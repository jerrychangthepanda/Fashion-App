import { supabase } from "@/lib/supabase";

export type PublicComment = {
    id: string;
    postId: string;
    userId: string;
    username: string;
    avatarUrl: string | null;
    body: string;
    parentCommentId: string | null;
    createdAt: string;
    updatedAt: string | null;
    timeAgo: string;
    likeCount: number;
    likedByMe: boolean;
};

type CommentRow = {
    id: string;
    post_id: string;
    user_id: string;
    body: string;
    parent_comment_id: string | null;
    created_at: string;
    updated_at: string | null;
    profiles: {
        username: string;
        profile_picture_url: string | null;
    } | null;
};

type CommentLikeRow = {
    comment_id: string;
    user_id: string;
};

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isSupabasePostId(postId: string): boolean {
    return UUID_PATTERN.test(postId);
}

function isUuid(value: string): boolean {
    return UUID_PATTERN.test(value);
}

function getTimeAgo(createdAt: string): string {
    const createdTime = new Date(createdAt).getTime();

    if (Number.isNaN(createdTime)) {
        return "";
    }

    const seconds = Math.max(
        0,
        Math.floor((Date.now() - createdTime) / 1000)
    );

    if (seconds < 60) return "now";

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;

    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w`;

    return new Date(createdAt).toLocaleDateString();
}

function rowToComment(
    row: CommentRow,
    likeCount = 0,
    likedByMe = false
): PublicComment {
    return {
        id: row.id,
        postId: row.post_id,
        userId: row.user_id,
        username: row.profiles?.username ?? "user",
        avatarUrl: row.profiles?.profile_picture_url ?? null,
        body: row.body,
        parentCommentId: row.parent_comment_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        timeAgo: getTimeAgo(row.created_at),
        likeCount,
        likedByMe,
    };
}

export async function getCurrentUserId(): Promise<string | null> {
    const {
        data: { session },
        error,
    } = await supabase.auth.getSession();

    if (error) {
        console.error("Failed to load current user:", error);
        return null;
    }

    return session?.user?.id ?? null;
}

export async function getCommentCount(postId: string): Promise<number> {
    if (!isSupabasePostId(postId)) {
        return 0;
    }

    const { count, error } = await supabase
        .from("comments")
        .select("id", {
            count: "exact",
            head: true,
        })
        .eq("post_id", postId);

    if (error) {
        console.error("Failed to load comment count:", error);
        throw error;
    }

    return count ?? 0;
}

export async function getComments(
    postId: string
): Promise<PublicComment[]> {
    if (!isSupabasePostId(postId)) {
        return [];
    }

    const [commentsResult, userResult] = await Promise.all([
        supabase
            .from("comments")
            .select(
                `
                id,
                post_id,
                user_id,
                body,
                parent_comment_id,
                created_at,
                updated_at,
                profiles (
                    username,
                    profile_picture_url
                )
                `
            )
            .eq("post_id", postId)
            .order("created_at", { ascending: false }),
        supabase.auth.getSession(),
    ]);

    if (commentsResult.error) {
        console.error(
            "Failed to load comments:",
            commentsResult.error
        );
        throw commentsResult.error;
    }

    const rows = (commentsResult.data ?? []) as unknown as CommentRow[];
    const commentIds = rows.map((row) => row.id);
    const currentUserId = userResult.data.session?.user?.id ?? null;

    if (commentIds.length === 0) {
        return [];
    }

    const { data: likeData, error: likeError } = await supabase
        .from("comment_likes")
        .select("comment_id, user_id")
        .in("comment_id", commentIds);

    if (likeError) {
        console.error("Failed to load comment likes:", likeError);
        throw likeError;
    }

    const likeRows = (likeData ?? []) as CommentLikeRow[];
    const likeCounts = new Map<string, number>();
    const likedByMe = new Set<string>();

    for (const like of likeRows) {
        likeCounts.set(
            like.comment_id,
            (likeCounts.get(like.comment_id) ?? 0) + 1
        );

        if (currentUserId && like.user_id === currentUserId) {
            likedByMe.add(like.comment_id);
        }
    }

    return rows.map((row) =>
        rowToComment(
            row,
            likeCounts.get(row.id) ?? 0,
            likedByMe.has(row.id)
        )
    );
}

export async function createComment(
    postId: string,
    body: string,
    parentCommentId: string | null = null
): Promise<PublicComment> {
    if (!isSupabasePostId(postId)) {
        throw new Error(
            "Comments are unavailable for this demo post."
        );
    }

    if (parentCommentId && !isUuid(parentCommentId)) {
        throw new Error("That reply target is invalid.");
    }

    const trimmedBody = body.trim();

    if (!trimmedBody) {
        throw new Error("Enter a comment first.");
    }

    if (trimmedBody.length > 500) {
        throw new Error(
            "Comments cannot be longer than 500 characters."
        );
    }

    const {
        data: { session },
        error: userError,
    } = await supabase.auth.getSession();

    const user = session?.user ?? null;

    if (userError) {
        throw userError;
    }

    if (!user) {
        throw new Error(
            "You must be signed in to leave a comment."
        );
    }

    const savedUsername =
        typeof window !== "undefined"
            ? localStorage.getItem("username")?.trim()
            : "";

    const username =
        savedUsername ||
        user.user_metadata?.username ||
        user.user_metadata?.display_name ||
        user.email?.split("@")[0] ||
        "user";

    const { data, error } = await supabase
        .from("comments")
        .insert({
            post_id: postId,
            user_id: user.id,
            username,
            body: trimmedBody,
            parent_comment_id: parentCommentId,
        })
        .select(
            `
            id,
            post_id,
            user_id,
            body,
            parent_comment_id,
            created_at,
            updated_at,
            profiles (
                username,
                profile_picture_url
            )
            `
        )
        .single();

    if (error) {
        console.error("Failed to create comment:", error);
        throw error;
    }

    return rowToComment(data as unknown as CommentRow);
}

export async function updateComment(
    commentId: string,
    body: string
): Promise<{ body: string; updatedAt: string }> {
    const trimmedBody = body.trim();

    if (!trimmedBody) {
        throw new Error("Enter a comment first.");
    }

    if (trimmedBody.length > 500) {
        throw new Error(
            "Comments cannot be longer than 500 characters."
        );
    }

    const {
        data: { session },
        error: userError,
    } = await supabase.auth.getSession();

    const user = session?.user ?? null;

    if (userError) {
        throw userError;
    }

    if (!user) {
        throw new Error("You must be signed in.");
    }

    const updatedAt = new Date().toISOString();

    const { data, error } = await supabase
        .from("comments")
        .update({
            body: trimmedBody,
            updated_at: updatedAt,
        })
        .eq("id", commentId)
        .eq("user_id", user.id)
        .select("body, updated_at")
        .single();

    if (error) {
        console.error("Failed to update comment:", error);
        throw error;
    }

    return {
        body: data.body,
        updatedAt: data.updated_at,
    };
}

export async function deleteComment(
    commentId: string
): Promise<void> {
    const {
        data: { session },
        error: userError,
    } = await supabase.auth.getSession();

    const user = session?.user ?? null;

    if (userError) {
        throw userError;
    }

    if (!user) {
        throw new Error("You must be signed in.");
    }

    const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user.id);

    if (error) {
        console.error("Failed to delete comment:", error);
        throw error;
    }
}
