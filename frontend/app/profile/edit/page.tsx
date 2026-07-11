"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";
import { getMyProfile, updateMyProfile } from "@/lib/users";

export default function EditProfilePage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function loadProfile() {
            try {
                const profile = await getMyProfile();
                if (profile) {
                    setUsername(profile.username);
                    setBio(profile.bio);
                    setProfileImage(profile.profilePictureUrl);
                }
            } catch (error) {
                console.error(error);
                alert("Couldn't load your profile.");
            } finally {
                setLoading(false);
            }
        }

        loadProfile();
    }, []);

    function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setProfilePictureFile(file);

        const reader = new FileReader();
        reader.onloadend = () => {
            setProfileImage(reader.result as string);
        };
        reader.readAsDataURL(file);
    }

    async function handleSave() {
        if (saving) return;

        try {
            setSaving(true);
            await updateMyProfile({ username, bio, profilePictureFile });
            router.push("/profile");
        } catch (error) {
            console.error(error);
            const message =
                error instanceof Error ? error.message : "Couldn't save your profile.";
            alert(message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-white">
                <p className="text-sm text-neutral-400">Loading...</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-white px-5 pt-10 pb-[var(--bottom-nav-height)]">
            <h1 className="text-center text-xl font-semibold text-neutral-900">
                Edit Profile
            </h1>

            <div className="mt-8 flex flex-col items-center">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-neutral-100">
                    {profileImage ? (
                        <img
                            src={profileImage}
                            alt="Profile"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <User size={36} className="text-neutral-400" />
                    )}
                </div>

                <label className="mt-4 cursor-pointer rounded-full bg-neutral-100 px-5 py-2 text-sm font-medium text-neutral-700">
                    Change profile picture
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                    />
                </label>
            </div>

            <div className="mt-8 flex flex-col gap-4">
                <div>
                    <label className="text-sm font-medium text-neutral-700">Username</label>
                    <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        className="mt-2 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                    />
                </div>

                <div>
                    <label className="text-sm font-medium text-neutral-700">Bio</label>
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Write your bio"
                        className="mt-2 h-28 w-full resize-none rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                    />
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-4 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Save"}
                </button>

                <button
                    onClick={() => router.push("/profile")}
                    disabled={saving}
                    className="rounded-full bg-neutral-100 px-5 py-3 text-sm font-semibold text-neutral-700 disabled:opacity-50"
                >
                    Cancel
                </button>
            </div>
        </main>
    );
}