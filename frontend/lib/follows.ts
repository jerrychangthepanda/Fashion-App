import { MOCK_FOLLOWING } from "@/lib/users";

const FOLLOWING_STORAGE_KEY = "fashion-app:following-usernames";

const DEFAULT_FOLLOWING_USERNAMES = MOCK_FOLLOWING.map((user) => user.username);

export function getFollowingUsernames(): string[] {
    try {
        const raw = localStorage.getItem(FOLLOWING_STORAGE_KEY);
        return raw ? JSON.parse(raw) : DEFAULT_FOLLOWING_USERNAMES;
    } catch {
        return DEFAULT_FOLLOWING_USERNAMES;
    }
}

export function isFollowing(username: string): boolean {
    return getFollowingUsernames().includes(username);
}

function saveFollowingUsernames(usernames: string[]): boolean {
    try {
        localStorage.setItem(FOLLOWING_STORAGE_KEY, JSON.stringify(usernames));
        return true;
    } catch {
        return false;
    }
}

export function followUser(username: string): boolean {
    const current = getFollowingUsernames();
    if (current.includes(username)) return true;
    return saveFollowingUsernames([...current, username]);
}

export function unfollowUser(username: string): boolean {
    const current = getFollowingUsernames();
    return saveFollowingUsernames(current.filter((existing) => existing !== username));
}