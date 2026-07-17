import { supabase } from "@/lib/supabase";
import { isSupabasePostId } from "@/lib/comments";

// Every post id the signed-in user has hidden from their feed, so a
// hide survives refreshes/sessions instead of living only in React
// state.
export async function getHiddenPostIds(): Promise<Set<string>> {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

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
        .from("hidden_posts")
        .select("post_id")
        .eq("user_id", user.id);

    if (error) {
        console.error("Failed to load hidden posts:", error);
        throw error;
    }

    return new Set((data ?? []).map((row) => row.post_id as string));
}

export async function hidePost(postId: string): Promise<void> {
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

    const { error } = await supabase.from("hidden_posts").insert({
        user_id: user.id,
        post_id: postId,
    });

    if (error) {
        // Primary-key violation means this post is already hidden
        // (e.g. a double-click race) — treat that as a successful
        // no-op rather than surfacing an error.
        if (error.code === "23505") {
            return;
        }

        console.error("Failed to hide post:", error);
        throw error;
    }
}

export async function unhidePost(postId: string): Promise<void> {
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
        .from("hidden_posts")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

    if (error) {
        console.error("Failed to unhide post:", error);
        throw error;
    }
}
