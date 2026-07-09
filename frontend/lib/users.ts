export type MockUser = {
    username: string;
    name: string;
    bio: string;
    avatarImage?: string | null;
};

// Single source of truth for every mock person the app currently knows about —
// post authors and follow-list-only people both live here. This is the shape
// we expect the future Supabase `profiles` table to take.
export const MOCK_USERS: MockUser[] = [
    { username: "matthew.l", name: "Matthew Lee", bio: "Coffee runs and clean fits" },
    { username: "juliaa.s", name: "Julia Smith", bio: "Denim, basics, and daily outfits" },
    { username: "dev.kim", name: "Dev Kim", bio: "Office fits and minimal style" },
    { username: "ana.torres", name: "Ana Torres", bio: "Weekend outfits and streetwear" },
    { username: "brandon.fit", name: "Brandon", bio: "Streetwear and sneakers" },
    { username: "stylebymaya", name: "Maya", bio: "Neutral outfits and styling ideas" },
    { username: "ethan.w", name: "Ethan Walker", bio: "Vintage jackets and denim" },
    { username: "sofia.closet", name: "Sofia", bio: "Closet inspo and everyday fits" },
];

function findUser(username: string): MockUser {
    const user = MOCK_USERS.find((u) => u.username === username);

    if (!user) {
        throw new Error(`Unknown mock user: "${username}". Add them to MOCK_USERS first.`);
    }

    return user;
}

// Relationships are just usernames resolved against MOCK_USERS — profile
// details (name/bio/avatar) only ever live in one place.
export const MOCK_FOLLOWING: MockUser[] = [
    "matthew.l",
    "juliaa.s",
    "dev.kim",
    "ana.torres",
].map(findUser);

export const MOCK_FOLLOWERS: MockUser[] = [
    "brandon.fit",
    "stylebymaya",
    "ethan.w",
    "sofia.closet",
    "matthew.l",
].map(findUser);

export function getUsersByUsernames(usernames: string[]): MockUser[] {
    return usernames
        .map((username) => MOCK_USERS.find((user) => user.username === username))
        .filter((user): user is MockUser => Boolean(user));
}