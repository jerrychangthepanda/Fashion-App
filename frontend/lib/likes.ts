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
        data: { session },
        error: userError,
    } = await supabase.auth.getSession();

    const user = session?.user ?? null;

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

// Batched version of isLikedByCurrentUser for rendering a whole page
// of posts at once — one query for the page instead of one per post.
export async function getLikedPostIds(
    postIds: string[]
): Promise<Set<string>> {
    const supabasePostIds = postIds.filter(isSupabasePostId);

    if (supabasePostIds.length === 0) {
        return new Set();
    }

    const {
        data: { session },
        error: userError,
    } = await supabase.auth.getSession();

    const user = session?.user ?? null;

    if (userError) {
        console.error(
            "Failed to load the current user:",
            userError
        );
        return new Set();
    }

    if (!user) {
        return new Set();
    }

    const { data, error } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", supabasePostIds);

    if (error) {
        console.error("Failed to load liked posts:", error);
        throw error;
    }

    return new Set((data ?? []).map((row) => row.post_id as string));
}

export async function likePost(postId: string): Promise<void> {
    if (!isSupabasePostId(postId)) {
        throw new Error(
            "Likes are unavailable for this demo post."
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
        .from("likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

    if (error) {
        console.error("Failed to unlike post:", error);
        throw error;
    }
}
