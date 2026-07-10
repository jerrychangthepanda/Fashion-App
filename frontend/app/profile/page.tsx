"use client";

import { useEffect, useState } from "react";
import { ProfileView } from "@/components/ProfileView";
import { getLocalPosts, type LocalPost } from "@/lib/localPosts";
import { getCollections, type Collection } from "@/lib/collections";

const LOCAL_POSTS_KEY = "fashion-app-local-posts";

export default function ProfilePage() {
    const [username, setUsername] = useState("Username");
    const [bio, setBio] = useState("Your bio will show up here");
    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [posts, setPosts] = useState<LocalPost[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);

    useEffect(() => {
        const savedUsername = localStorage.getItem("username") || "Username";
        const savedBio = localStorage.getItem("bio");
        const savedProfileImage = localStorage.getItem("profileImage");

        setUsername(savedUsername);

        if (savedBio) setBio(savedBio);
        if (savedProfileImage) setProfileImage(savedProfileImage);

        const currentPosts = getLocalPosts();

        const fixedPosts = currentPosts.map((post) =>
            post.username === "you" ? { ...post, username: savedUsername } : post
        );

        localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(fixedPosts));

        setPosts(fixedPosts);
        setCollections(getCollections());
    }, []);

    function handlePostDeleted(postId: string) {
        setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId));
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