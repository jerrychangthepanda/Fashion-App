import { ProfileView } from "@/components/ProfileView";

export default async function UserProfilePage({
    params,
}: {
    params: Promise<{ username: string }>;
}) {
    const { username } = await params;

    return (
        <ProfileView
            username={username}
            bio="This user hasn't added a bio yet"
            avatarImage={null}
            isOwnProfile={false}
        />
    );
}