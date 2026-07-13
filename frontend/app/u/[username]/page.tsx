"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileView } from "@/components/ProfileView";
import { getProfileByUsername, MOCK_USERS } from "@/lib/users";
import { getPostsByUser, type LocalPost } from "@/lib/localPosts";

type ProfileState =
    | { status: "loading" }
    | { status: "not-found" }
    | { status: "mock" }
    | {
        status: "real";
        userId: string;
        bio: string;
        avatarImage: string | null;
        posts: LocalPost[];
    };

export default function UserProfilePage({
    params,
}: {
    params: Promise<{ username: string }>;
}) {
    const router = useRouter();
    const resolvedParams = use(params);
    const decodedUsername = decodeURIComponent(resolvedParams.username);

    const [state, setState] = useState<ProfileState>({
        status: "loading",
    });

    useEffect(() => {
        let cancelled = false;

        const savedUsername = localStorage.getItem("username");

        if (savedUsername && savedUsername === decodedUsername) {
            router.replace("/profile");
            return;
        }

        async function loadProfile() {
            try {
                const profile = await getProfileByUsername(
                    decodedUsername
                );

                if (cancelled) {
                    return;
                }

                if (profile) {
                    const posts = await getPostsByUser(
                        profile.id
                    );

                    if (cancelled) {
                        return;
                    }

                    setState({
                        status: "real",
                        userId: profile.id,
                        bio: profile.bio,
                        avatarImage: profile.profilePictureUrl,
                        posts,
                    });

                    return;
                }

                const isMockUser = MOCK_USERS.some(
                    (user) => user.username === decodedUsername
                );

                setState({
                    status: isMockUser ? "mock" : "not-found",
                });
            } catch (error) {
                console.error(
                    "Could not load profile:",
                    error
                );

                if (!cancelled) {
                    setState({ status: "not-found" });
                }
            }
        }

        void loadProfile();

        return () => {
            cancelled = true;
        };
    }, [decodedUsername, router]);

    if (state.status === "loading") {
        return null;
    }

    if (state.status === "not-found") {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
                <p className="text-sm font-medium text-neutral-700">
                    User not found
                </p>
                <p className="mt-1 text-sm text-neutral-400">
                    This account doesn&apos;t exist.
                </p>
            </main>
        );
    }

    if (state.status === "real") {
        return (
            <ProfileView
                username={decodedUsername}
                userId={state.userId}
                bio={
                    state.bio ||
                    "This user hasn't added a bio yet"
                }
                avatarImage={state.avatarImage}
                isOwnProfile={false}
                posts={state.posts}
            />
        );
    }

    return (
        <ProfileView
            username={decodedUsername}
            bio="This user hasn't added a bio yet"
            avatarImage={null}
            isOwnProfile={false}
        />
    );
}
