import { supabase } from "@/lib/supabase";

// Write-only moderation log: reports have no client-facing SELECT policy
// (see supabase/reports-table.sql), so this file only ever inserts. There
// is no admin-role system in this app yet — reviewing reports means
// querying the `reports` table directly via the Supabase SQL Editor.

export async function reportPost(
    postId: string,
    postOwnerId: string,
    reason: string | null
): Promise<void> {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
        throw userError;
    }

    if (!user) {
        throw new Error("You must be signed in to report a post.");
    }

    const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        target_type: "post",
        post_id: postId,
        reported_user_id: postOwnerId,
        reason,
    });

    if (error) {
        // Unique-violation means this post was already reported by this
        // user — treat that as a successful no-op rather than surfacing
        // an error, same as lib/blocks.ts's blockUser.
        if (error.code === "23505") {
            return;
        }

        console.error("Failed to report post:", error);
        throw error;
    }
}

export async function reportUser(
    targetUserId: string,
    reason: string | null
): Promise<void> {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
        throw userError;
    }

    if (!user) {
        throw new Error("You must be signed in to report a user.");
    }

    const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        target_type: "user",
        post_id: null,
        reported_user_id: targetUserId,
        reason,
    });

    if (error) {
        // Unique-violation means this user's profile was already
        // reported by this user — treat that as a successful no-op.
        if (error.code === "23505") {
            return;
        }

        console.error("Failed to report user:", error);
        throw error;
    }
}
