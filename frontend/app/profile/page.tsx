"use client";

import { useEffect, useState } from "react";
import { ProfileView } from "@/components/ProfileView";

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
        <ProfileView
            username={username}
            bio={bio}
            avatarImage={profileImage}
            isOwnProfile={true}
        />
    );
}