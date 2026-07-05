"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, ChevronRight } from "lucide-react";
import { ProfileTabs } from "@/components/ProfileTabs";

export default function ProfilePage() {
    const [username, setUsername] = useState("Username");
    const [bio, setBio] = useState("Your bio will show up here");
    const [profileImage, setProfileImage] = useState<string | null>(null);

    useEffect(() => {
        const savedUsername = localStorage.getItem("username");
        const savedBio = localStorage.getItem("bio");
        const savedProfileImage = localStorage.getItem("profileImage");

        if (savedUsername) setUsername(savedUsername);
        if (savedBio) setBio(savedBio);
        if (savedProfileImage) setProfileImage(savedProfileImage);
    }, []);

    return (
        <main className="min-h-screen bg-white px-5 pt-10 pb-28">
            <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-neutral-100">
                    {profileImage ? (
                        <img
                            src={profileImage}
                            alt="Profile"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <User size={30} className="text-neutral-400" />
                    )}
                </div>

                <h1 className="mt-3 text-base font-semibold text-neutral-900">
                    {username}
                </h1>

                <p className="mt-1 text-sm text-neutral-400">{bio}</p>

                <Link href="/profile/edit">
                    <button className="mt-4 rounded-full bg-neutral-100 px-5 py-2 text-sm font-medium text-neutral-700">
                        Edit profile
                    </button>
                </Link>

                <button className="mt-4 flex w-full items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3">
                    <span className="text-sm font-medium text-neutral-700">0 friends</span>
                    <ChevronRight size={16} className="text-neutral-400" />
                </button>
            </div>

            <ProfileTabs />
        </main>
    );
}