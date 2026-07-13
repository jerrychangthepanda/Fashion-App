import { supabase } from "@/lib/supabase";
import { MOCK_FOLLOWING, type MockUser } from "@/lib/users";

// ---------------------------------------------------------------------
// Mock-account following. MOCK_USERS are placeholder demo people with
// no real Supabase account behind them, and they're slated to be
// removed entirely — intentionally left on localStorage only rather
// than wired to any backend. Do not extend this to real accounts.
// ---------------------------------------------------------------------

const FOLLOWING_STORAGE_KEY = "fashion-app:following-usernames";

const DEFAULT_FOLLOWING_USERNAMES = MOCK_FOLLOWING.map(
    (user) => user.username
);

export function getFollowingUsernamesMock(): string[] {
    try {
        const raw = localStorage.getItem(FOLLOWING_STORAGE_KEY);
        return raw ? JSON.parse(raw) : DEFAULT_FOLLOWING_USERNAMES;
    } catch {
        return DEFAULT_FOLLOWING_USERNAMES;
    }
}

export function isFollowingMock(username: string): boolean {
    return getFollowingUsernamesMock().includes(username);
}

function saveFollowingUsernamesMock(usernames: string[]): boolean {
    try {
        localStorage.setItem(
            FOLLOWING_STORAGE_KEY,
            JSON.stringify(usernames)
        );
        return true;
    } catch {
        return false;
    }
}

export function followUserMock(username: string): boolean {
    const current = getFollowingUsernamesMock();
    if (current.includes(username)) return true;
    return saveFollowingUsernamesMock([...current, username]);
}

export function unfollowUserMock(username: string): boolean {
    const current = getFollowingUsernamesMock();
    return saveFollowingUsernamesMock(
        current.filter((existing) => existing !== username)
    );
}

// ---------------------------------------------------------------------
// Real accounts (Supabase-backed). All functions below take the
// target's real profile id (uuid), never a username.
// ---------------------------------------------------------------------

export async function isFollowing(
    targetUserId: string
): Promise<boolean> {
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
        .from("follows")
        .select("follower_id")
        .eq("follower_id", user.id)
        .eq("followee_id", targetUserId)
        .maybeSingle();

    if (error) {
        console.error("Failed to check follow status:", error);
        throw error;
    }

    return data !== null;
}

export async function followUser(
    targetUserId: string
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
            "You must be signed in to follow someone."
        );
    }

    const { error } = await supabase.from("follows").insert({
        follower_id: user.id,
        followee_id: targetUserId,
    });

    if (error) {
        // Primary-key violation means this user is already
        // followed (e.g. a double-click race) — treat that as a
        // successful no-op rather than surfacing an error.
        if (error.code === "23505") {
            return;
        }

        console.error("Failed to follow user:", error);
        throw error;
    }
}

export async function unfollowUser(
    targetUserId: string
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
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("followee_id", targetUserId);

    if (error) {
        console.error("Failed to unfollow user:", error);
        throw error;
    }
}

export async function getFollowerCount(
    userId: string
): Promise<number> {
    const { count, error } = await supabase
        .from("follows")
        .select("follower_id", {
            count: "exact",
            head: true,
        })
        .eq("followee_id", userId);

    if (error) {
        console.error("Failed to load follower count:", error);
        throw error;
    }

    return count ?? 0;
}

export async function getFollowingCount(
    userId: string
): Promise<number> {
    const { count, error } = await supabase
        .from("follows")
        .select("followee_id", {
            count: "exact",
            head: true,
        })
        .eq("follower_id", userId);

    if (error) {
        console.error(
            "Failed to load following count:",
            error
        );
        throw error;
    }

    return count ?? 0;
}

type FollowProfileRow = {
    profiles: {
        username: string;
        bio: string | null;
        profile_picture_url: string | null;
    } | null;
};

function rowToMockUser(row: FollowProfileRow): MockUser | null {
    if (!row.profiles) {
        return null;
    }

    return {
        username: row.profiles.username,
        name: row.profiles.username,
        bio: row.profiles.bio ?? "",
        avatarImage: row.profiles.profile_picture_url,
    };
}

// People who follow userId. Disambiguated via the FK constraint name
// since `follows` has two foreign keys into `profiles` — confirmed
// via a direct REST call that this returns a single embedded object
// per row, not an array (same to-one shape as posts/comments joins).
export async function getFollowers(
    userId: string
): Promise<MockUser[]> {
    const { data, error } = await supabase
        .from("follows")
        .select(
            "profiles!follows_follower_id_fkey(username, bio, profile_picture_url)"
        )
        .eq("followee_id", userId);

    if (error) {
        console.error("Failed to load followers:", error);
        throw error;
    }

    return ((data ?? []) as unknown as FollowProfileRow[])
        .map(rowToMockUser)
        .filter((user): user is MockUser => user !== null);
}

// People userId follows.
export async function getFollowingList(
    userId: string
): Promise<MockUser[]> {
    const { data, error } = await supabase
        .from("follows")
        .select(
            "profiles!follows_followee_id_fkey(username, bio, profile_picture_url)"
        )
        .eq("follower_id", userId);

    if (error) {
        console.error("Failed to load following list:", error);
        throw error;
    }

    return ((data ?? []) as unknown as FollowProfileRow[])
        .map(rowToMockUser)
        .filter((user): user is MockUser => user !== null);
}
