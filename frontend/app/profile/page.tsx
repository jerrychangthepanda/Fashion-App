"use client";

import { useEffect, useState } from "react";
import { ProfileView } from "@/components/ProfileView";
import {
    getCurrentUserPosts,
    type LocalPost,
} from "@/lib/localPosts";
import {
    getCollections,
    type Collection,
} from "@/lib/collections";

export default function ProfilePage() {
    const [username, setUsername] = useState("Username");
    const [bio, setBio] = useState("Your bio will show up here");
    const [profileImage, setProfileImage] =
        useState<string | null>(null);

    const [posts, setPosts] = useState<LocalPost[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);

    useEffect(() => {
        let cancelled = false;

        const savedUsername = localStorage.getItem("username");
        const savedBio = localStorage.getItem("bio");
        const savedProfileImage =
            localStorage.getItem("profileImage");

        setUsername(savedUsername || "Username");

        if (savedBio) {
            setBio(savedBio);
        }

        if (savedProfileImage) {
            setProfileImage(savedProfileImage);
        }

        setCollections(getCollections());

        async function loadProfilePosts() {
            try {
                const loadedPosts = await getCurrentUserPosts();

                if (!cancelled) {
                    setPosts(loadedPosts);
                }
            } catch (error) {
                console.error(
                    "Could not load profile posts:",
                    error
                );
            }
        }

        void loadProfilePosts();

        return () => {
            cancelled = true;
        };
    }, []);

    function handlePostDeleted(postId: string) {
        setPosts((currentPosts) =>
            currentPosts.filter((post) => post.id !== postId)
        );
    }

    return (
        <ProfileView
            username={username}
            bio={bio}
            avatarImage={profileImage}
            isOwnProfile={true}
            posts={posts}
            collections={collections}
            onPostDeleted={handlePostDeleted}
        />
    );
}