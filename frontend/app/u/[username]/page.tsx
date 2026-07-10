"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileView } from "@/components/ProfileView";

export default function UserProfilePage({
    params,
}: {
    params: Promise<{ username: string }>;
}) {
    const router = useRouter();
    const resolvedParams = use(params);
    const decodedUsername = decodeURIComponent(resolvedParams.username);

    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const savedUsername = localStorage.getItem("username");

        if (savedUsername && savedUsername === decodedUsername) {
            router.replace("/profile");
            return;
        }

        setIsChecking(false);
    }, [decodedUsername, router]);

    if (isChecking) {
        return null;
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