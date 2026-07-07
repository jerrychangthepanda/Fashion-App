"use client";

import { useEffect, useState } from "react";
import { ProfileView } from "@/components/ProfileView";
import { getLocalPosts, type LocalPost } from "@/lib/localPosts";

export default function ProfilePage() {
    const [username, setUsername] = useState("Username");
    const [bio, setBio] = useState("Your bio will show up here");
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [posts, setPosts] = useState<LocalPost[]>([]);

    useEffect(() => {
        const savedUsername = localStorage.getItem("username");
        const savedBio = localStorage.getItem("bio");
        const savedProfileImage = localStorage.getItem("profileImage");

        if (savedUsername) setUsername(savedUsername);
        if (savedBio) setBio(savedBio);
        if (savedProfileImage) setProfileImage(savedProfileImage);

        setPosts(getLocalPosts());
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
            onPostDeleted={handlePostDeleted}
        />
    );
}