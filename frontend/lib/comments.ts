import { supabase } from "@/lib/supabase";

export type PublicComment = {
    id: string;
    postId: string;
    userId: string;
    username: string;
    body: string;
    createdAt: string;
    timeAgo: string;
};

type CommentRow = {
    id: string;
    post_id: string;
    user_id: string;
    username: string;
    body: string;
    created_at: string;
};

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isSupabasePostId(postId: string): boolean {
    return UUID_PATTERN.test(postId);
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

function rowToComment(row: CommentRow): PublicComment {
    return {
        id: row.id,
        postId: row.post_id,
        userId: row.user_id,
        username: row.username,
        body: row.body,
        createdAt: row.created_at,
        timeAgo: getTimeAgo(row.created_at),
    };
}

export async function getCurrentUserId(): Promise<string | null> {
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error) {
        console.error("Failed to load current user:", error);
        return null;
    }

    return user?.id ?? null;
}

export async function getCommentCount(
    postId: string
): Promise<number> {
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

    const { data, error } = await supabase
        .from("comments")
        .select(
            `
            id,
            post_id,
            user_id,
            username,
            body,
            created_at
            `
        )
        .eq("post_id", postId)
        .order("created_at", {
            ascending: false,
        });

    if (error) {
        console.error("Failed to load comments:", error);
        throw error;
    }

    return ((data ?? []) as CommentRow[]).map(rowToComment);
}

export async function createComment(
    postId: string,
    body: string
): Promise<PublicComment> {
    if (!isSupabasePostId(postId)) {
        throw new Error(
            "Comments are unavailable for this demo post."
        );
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
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

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
        })
        .select(
            `
            id,
            post_id,
            user_id,
            username,
            body,
            created_at
            `
        )
        .single();

    if (error) {
        console.error("Failed to create comment:", error);
        throw error;
    }

    return rowToComment(data as CommentRow);
}

export async function deleteComment(
    commentId: string
): Promise<void> {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

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