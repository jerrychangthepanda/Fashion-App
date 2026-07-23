import { supabase } from "@/lib/supabase";

// Full block: mutual unfollow, posts/profile hidden from each other's
// feed/search/direct link, likes/comments between the pair removed
// (and new ones prevented by RLS), notifications between the pair
// stop. Most of that is enforced server-side (RLS policies + the
// handle_new_block trigger) — this file is just the client API for
// creating/removing the block row and checking status.

export async function isBlockedByMe(
    targetUserId: string
): Promise<boolean> {
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
        .from("blocks")
        .select("blocker_id")
        .eq("blocker_id", user.id)
        .eq("blocked_id", targetUserId)
        .maybeSingle();

    if (error) {
        console.error("Failed to check block status:", error);
        throw error;
    }

    return data !== null;
}

export async function blockUser(
    targetUserId: string
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
        throw new Error("You must be signed in to block someone.");
    }

    const { error } = await supabase.from("blocks").insert({
        blocker_id: user.id,
        blocked_id: targetUserId,
    });

    if (error) {
        // Primary-key violation means this user is already blocked
        // (e.g. a double-click race) — treat that as a successful
        // no-op rather than surfacing an error.
        if (error.code === "23505") {
            return;
        }

        console.error("Failed to block user:", error);
        throw error;
    }
}

export async function unblockUser(
    targetUserId: string
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
        .from("blocks")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", targetUserId);

    if (error) {
        console.error("Failed to unblock user:", error);
        throw error;
    }
}

// Every user id involved in a block with the signed-in user, in
// either direction — used to filter profiles out of search results
// and direct-link lookups at the application layer, since (unlike
// posts/likes/comments/follows) the `profiles` table's own RLS is
// deliberately left block-unaware to avoid breaking unrelated joins
// elsewhere in the app (follows.ts, comments.ts, notifications.ts,
// collections).
export async function getBlockedUserIdsBothDirections(): Promise<
    Set<string>
> {
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
        .from("blocks")
        .select("blocker_id, blocked_id")
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

    if (error) {
        console.error(
            "Failed to load blocked user ids:",
            error
        );
        throw error;
    }

    const ids = new Set<string>();

    (data ?? []).forEach((row) => {
        if (row.blocker_id === user.id) {
            ids.add(row.blocked_id as string);
        } else {
            ids.add(row.blocker_id as string);
        }
    });

    return ids;
}

export type BlockedUser = {
    id: string;
    username: string;
    profilePictureUrl: string | null;
};

type BlockedUserRow = {
    blocked_id: string;
    profiles: {
        username: string;
        profile_picture_url: string | null;
    } | null;
};

// Accounts the signed-in user has blocked (one direction only — who
// blocked *them* is intentionally never exposed). Backing for the
// "Blocked accounts" list in Settings > Privacy, the only way to
// reverse a block since a blocked user's profile is no longer
// reachable by username/search once blocked.
export async function getBlockedUsers(): Promise<BlockedUser[]> {
    const {
        data: { session },
        error: userError,
    } = await supabase.auth.getSession();

    const user = session?.user ?? null;

    if (userError) {
        throw userError;
    }

    if (!user) {
        return [];
    }

    const { data, error } = await supabase
        .from("blocks")
        .select(
            "blocked_id, profiles!blocks_blocked_id_fkey(username, profile_picture_url)"
        )
        .eq("blocker_id", user.id);

    if (error) {
        console.error("Failed to load blocked users:", error);
        throw error;
    }

    return ((data ?? []) as unknown as BlockedUserRow[])
        .filter((row) => row.profiles !== null)
        .map((row) => ({
            id: row.blocked_id,
            username: row.profiles!.username,
            profilePictureUrl: row.profiles!.profile_picture_url,
        }));
}
