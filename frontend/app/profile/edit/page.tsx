"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";

export default function EditProfilePage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [profileImage, setProfileImage] = useState<string | null>(null);

    useEffect(() => {
        const savedUsername = localStorage.getItem("username");
        const savedBio = localStorage.getItem("bio");
        const savedProfileImage = localStorage.getItem("profileImage");

        if (savedUsername) setUsername(savedUsername);
        if (savedBio) setBio(savedBio);
        if (savedProfileImage) setProfileImage(savedProfileImage);
    }, []);

    function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onloadend = () => {
            setProfileImage(reader.result as string);
        };

        reader.readAsDataURL(file);
    }

    function handleSave() {
        try {
            localStorage.setItem("username", username);
            localStorage.setItem("bio", bio);
            if (profileImage) {
                localStorage.setItem("profileImage", profileImage);
            }
            router.push("/profile");
        } catch (error) {
            console.error(error);
            alert("Couldn't save — the photo might be too large.");
        }
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
                    <label className="text-sm font-medium text-neutral-700">
                        Username
                    </label>
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
                    className="mt-4 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white"
                >
                    Save
                </button>

                <button
                    onClick={() => router.push("/profile")}
                    className="rounded-full bg-neutral-100 px-5 py-3 text-sm font-semibold text-neutral-700"
                >
                    Cancel
                </button>
            </div>
        </main>
    );
}