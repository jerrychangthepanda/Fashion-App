import { supabase } from "@/lib/supabase";

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
    const allUsers = getAllUsers();

    return usernames
        .map((username) => allUsers.find((user) => user.username === username))
        .filter((user): user is MockUser => Boolean(user));
}

export function getCurrentUser(): MockUser {
    if (typeof window === "undefined") {
        return {
            username: "Username",
            name: "Username",
            bio: "Your bio will show up here",
            avatarImage: null,
        };
    }

    const username = localStorage.getItem("username") || "Username";
    const bio = localStorage.getItem("bio") || "Your bio will show up here";
    const avatarImage = localStorage.getItem("profileImage");

    return { username, name: username, bio, avatarImage };
}

export function getAllUsers(): MockUser[] {
    return [getCurrentUser(), ...MOCK_USERS];
}

export function hasCurrentUser(): boolean {
    if (typeof window === "undefined") return false;
    return Boolean(localStorage.getItem("username"));
}

export type Profile = {
    id: string;
    username: string;
    bio: string;
    profilePictureUrl: string | null;
};

export async function getMyProfile(): Promise<Profile | null> {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
        .from("profiles")
        .select("id, username, bio, profile_picture_url")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error("Failed to load your profile:", error);
        throw error;
    }

    return {
        id: data.id,
        username: data.username,
        bio: data.bio ?? "",
        profilePictureUrl: data.profile_picture_url,
    };
}

function extractStoragePath(publicUrl: string): string | null {
    const marker = "/object/public/profile_picture/";
    const index = publicUrl.indexOf(marker);
    if (index === -1) return null;
    return publicUrl.slice(index + marker.length).split("?")[0];
}

export async function updateMyProfile(updates: {
    username: string;
    bio: string;
    profilePictureFile?: File | null;
}): Promise<Profile> {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("You must be signed in.");
    }

    let profilePictureUrl: string | undefined;
    let oldProfilePicturePath: string | null = null;

    if (updates.profilePictureFile) {
        const { data: currentProfile } = await supabase
            .from("profiles")
            .select("profile_picture_url")
            .eq("id", user.id)
            .single();

        if (currentProfile?.profile_picture_url) {
            oldProfilePicturePath = extractStoragePath(currentProfile.profile_picture_url);
        }

        const extension = updates.profilePictureFile.type === "image/png" ? "png" : "jpg";
        // Unique filename every time, same pattern post-images already uses.
        // No fixed path to overwrite means no upsert/RLS conflict is possible.
        const profilePicturePath = `${user.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
            .from("profile_picture")
            .upload(profilePicturePath, updates.profilePictureFile, {
                contentType: updates.profilePictureFile.type || "image/jpeg",
                upsert: false,
            });

        if (uploadError) {
            console.error("Failed to upload profile picture:", uploadError);
            throw uploadError;
        }

        const {
            data: { publicUrl },
        } = supabase.storage.from("profile_picture").getPublicUrl(profilePicturePath);

        profilePictureUrl = publicUrl;
    }

    const { data, error } = await supabase
        .from("profiles")
        .update({
            username: updates.username.trim(),
            bio: updates.bio.trim(),
            ...(profilePictureUrl ? { profile_picture_url: profilePictureUrl } : {}),
        })
        .eq("id", user.id)
        .select("id, username, bio, profile_picture_url")
        .single();

    if (error) {
        if (error.code === "23505") {
            throw new Error("That username is already taken.");
        }
        console.error("Failed to update profile:", error);
        throw error;
    }

    // Best-effort cleanup of the old picture. If this fails, it's just an
    // orphaned file left in storage — not a reason to fail the save.
    if (oldProfilePicturePath) {
        const { error: cleanupError } = await supabase.rpc("delete_own_profile_picture", {
            object_path: oldProfilePicturePath,
        });

        if (cleanupError) {
            console.error("Failed to clean up old profile picture:", cleanupError);
        }
    }

    localStorage.setItem("username", data.username);
    localStorage.setItem("bio", data.bio ?? "");
    if (data.profile_picture_url) {
        localStorage.setItem("profileImage", data.profile_picture_url);
    }

    return {
        id: data.id,
        username: data.username,
        bio: data.bio ?? "",
        profilePictureUrl: data.profile_picture_url,
    };
}