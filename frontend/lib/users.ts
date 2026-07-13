import { supabase } from "@/lib/supabase";

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

export async function getProfileByUsername(
    username: string
): Promise<Profile | null> {
    const { data, error } = await supabase
        .from("profiles")
        .select("id, username, bio, profile_picture_url")
        .eq("username", username)
        .maybeSingle();

    if (error) {
        console.error(
            "Failed to load profile by username:",
            error
        );
        throw error;
    }

    if (!data) {
        return null;
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