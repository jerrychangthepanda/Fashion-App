import { supabase } from "@/lib/supabase";

export async function likeComment(
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
        throw new Error(
            "You must be signed in to like a comment."
        );
    }

    const { error } = await supabase
        .from("comment_likes")
        .insert({
            comment_id: commentId,
            user_id: user.id,
        });

    if (error?.code === "23505") {
        return;
    }

    if (error) {
        console.error("Failed to like comment:", error);
        throw error;
    }
}

export async function unlikeComment(
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
        .from("comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", user.id);

    if (error) {
        console.error("Failed to unlike comment:", error);
        throw error;
    }
}
