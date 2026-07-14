"use client";

import { useEffect, useState } from "react";
import {
    useParams,
    useRouter,
} from "next/navigation";
import { ProfileView } from "@/components/ProfileView";
import {
    getProfileByUsername,
    type Profile,
} from "@/lib/users";
import {
    getPostsByUser,
    type LocalPost,
} from "@/lib/localPosts";
import {
    getCollectionsByUser,
    type Collection,
} from "@/lib/collections";
import { supabase } from "@/lib/supabase";

type ProfileState =
    | {
        status: "loading";
    }
    | {
        status: "not-found";
    }
    | {
        status: "error";
        message: string;
    }
    | {
        status: "real";
        profile: Profile;
        posts: LocalPost[];
        collections: Collection[];
    };

function getErrorMessage(error: unknown): string {
    if (
        error &&
        typeof error === "object" &&
        "message" in error
    ) {
        return String(
            (error as { message?: unknown }).message
        );
    }

    return String(error);
}

export default function UserProfilePage() {
    const router = useRouter();
    const params = useParams();

    const usernameParam = Array.isArray(params.username)
        ? params.username[0]
        : params.username;

    const decodedUsername = decodeURIComponent(
        String(usernameParam ?? "")
    );

    const [state, setState] = useState<ProfileState>({
        status: "loading",
    });

    useEffect(() => {
        let cancelled = false;

        async function loadProfile() {
            if (!decodedUsername) {
                setState({
                    status: "not-found",
                });
                return;
            }

            try {
                const profile =
                    await getProfileByUsername(
                        decodedUsername
                    );

                if (cancelled) {
                    return;
                }

                if (!profile) {
                    setState({
                        status: "not-found",
                    });
                    return;
                }

                const {
                    data: { user },
                    error: userError,
                } = await supabase.auth.getUser();

                if (userError) {
                    console.warn(
                        "Could not check current user:",
                        getErrorMessage(userError)
                    );
                }

                if (cancelled) {
                    return;
                }

                // Use the real Supabase account ID instead of
                // localStorage, which can be stale after switching
                // accounts.
                if (user?.id === profile.id) {
                    router.replace("/profile");
                    return;
                }

                // Load posts and collections independently so a
                // collections error does not hide the user's posts.
                const [postsResult, collectionsResult] =
                    await Promise.allSettled([
                        getPostsByUser(profile.id),
                        getCollectionsByUser(profile.id),
                    ]);

                if (cancelled) {
                    return;
                }

                let posts: LocalPost[] = [];
                let collections: Collection[] = [];

                if (
                    postsResult.status === "fulfilled"
                ) {
                    posts = postsResult.value;
                } else {
                    console.warn(
                        "Could not load profile posts:",
                        getErrorMessage(
                            postsResult.reason
                        )
                    );
                }

                if (
                    collectionsResult.status ===
                    "fulfilled"
                ) {
                    collections =
                        collectionsResult.value;
                } else {
                    console.warn(
                        "Could not load public collections:",
                        getErrorMessage(
                            collectionsResult.reason
                        )
                    );
                }

                setState({
                    status: "real",
                    profile,
                    posts,
                    collections,
                });
            } catch (error) {
                console.warn(
                    "Could not load profile:",
                    getErrorMessage(error)
                );

                if (!cancelled) {
                    setState({
                        status: "error",
                        message:
                            "We couldn't load this profile.",
                    });
                }
            }
        }

        void loadProfile();

        return () => {
            cancelled = true;
        };
    }, [decodedUsername, router]);

    if (state.status === "loading") {
        return (
            <main className="flex min-h-screen items-center justify-center bg-white px-6">
                <p className="text-sm text-neutral-400">
                    Loading profile...
                </p>
            </main>
        );
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

    if (state.status === "error") {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
                <p className="text-sm font-medium text-neutral-700">
                    Profile unavailable
                </p>

                <p className="mt-1 text-sm text-neutral-400">
                    {state.message}
                </p>

                <button
                    onClick={() => router.back()}
                    className="mt-4 rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white"
                >
                    Go back
                </button>
            </main>
        );
    }

    return (
        <ProfileView
            username={state.profile.username}
            userId={state.profile.id}
            bio={
                state.profile.bio ||
                "This user hasn't added a bio yet"
            }
            avatarImage={
                state.profile.profilePictureUrl
            }
            isOwnProfile={false}
            posts={state.posts}
            collections={state.collections}
        />
    );
}