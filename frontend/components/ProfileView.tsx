"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, ChevronRight, ChevronLeft, Settings } from "lucide-react";
import { ProfileTabs } from "@/components/ProfileTabs";

export function ProfileView({
    username,
    bio,
    avatarImage,
    isOwnProfile,
}: {
    username: string;
    bio: string;
    avatarImage?: string | null;
    isOwnProfile: boolean;
}) {
    const router = useRouter();
    const [following, setFollowing] = useState(false);

    return (
        <main className="min-h-screen bg-white px-5 pt-6 pb-[var(--bottom-nav-height)]">
            <div className="flex items-center justify-between px-1">
                {!isOwnProfile ? (
                    <button
                        onClick={() => router.back()}
                        aria-label="Back"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100"
                    >
                        <ChevronLeft size={20} className="text-neutral-700" />
                    </button>
                ) : (
                    <div className="h-9 w-9" />
                )}

                {isOwnProfile ? (
                    <Link href="/profile/settings" aria-label="Settings">
                        <Settings size={22} className="text-neutral-700" />
                    </Link>
                ) : (
                    <div className="h-9 w-9" />
                )}
            </div>

            <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-neutral-100">
                    {avatarImage ? (
                        <img src={avatarImage} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                        <User size={30} className="text-neutral-400" />
                    )}
                </div>

                <h1 className="mt-3 text-base font-semibold text-neutral-900">{username}</h1>
                <p className="mt-1 text-sm text-neutral-400">{bio}</p>

                {isOwnProfile ? (
                    <Link href="/profile/edit">
                        <button className="mt-4 rounded-full bg-neutral-100 px-5 py-2 text-sm font-medium text-neutral-700">
                            Edit profile
                        </button>
                    </Link>
                ) : (
                    <button
                        onClick={() => setFollowing(!following)}
                        className={`mt-4 rounded-full px-5 py-2 text-sm font-medium ${
                            following ? "bg-neutral-100 text-neutral-700" : "bg-neutral-900 text-white"
                        }`}
                    >
                        {following ? "Following" : "Follow"}
                    </button>
                )}

                <button className="mt-4 flex w-full items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3">
                    <span className="text-sm font-medium text-neutral-700">0 friends</span>
                    <ChevronRight size={16} className="text-neutral-400" />
                </button>
            </div>

            <ProfileTabs />
        </main>
    );
}