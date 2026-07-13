import { supabase } from "@/lib/supabase";
import { isSupabasePostId } from "@/lib/comments";

export async function getLikeCount(postId: string): Promise<number> {
    if (!isSupabasePostId(postId)) {
        return 0;
    }

    const { count, error } = await supabase
        .from("likes")
        .select("id", {
            count: "exact",
            head: true,
        })
        .eq("post_id", postId);

    if (error) {
        console.error("Failed to load like count:", error);
        throw error;
    }

    return count ?? 0;
}

export async function isLikedByCurrentUser(
    postId: string
): Promise<boolean> {
    if (!isSupabasePostId(postId)) {
        return false;
    }

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
        console.error(
            "Failed to load the current user:",
            userError
        );
        return false;
    }

    if (!user) {
        return false;
    }

    const { data, error } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Failed to check like status:", error);
        throw error;
    }

    return data !== null;
}

export async function likePost(postId: string): Promise<void> {
    if (!isSupabasePostId(postId)) {
        throw new Error(
            "Likes are unavailable for this demo post."
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
            "You must be signed in to like a post."
        );
    }

    const { error } = await supabase.from("likes").insert({
        post_id: postId,
        user_id: user.id,
    });

    if (error) {
        // Unique violation means this user already liked the
        // post (e.g. a double-click race) — treat that as a
        // successful no-op rather than surfacing an error.
        if (error.code === "23505") {
            return;
        }

        console.error("Failed to like post:", error);
        throw error;
    }
}

export async function unlikePost(postId: string): Promise<void> {
    if (!isSupabasePostId(postId)) {
        return;
    }

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
        .from("likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

    if (error) {
        console.error("Failed to unlike post:", error);
        throw error;
    }
}
