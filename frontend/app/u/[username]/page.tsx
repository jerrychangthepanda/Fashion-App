import { ProfileView } from "@/components/ProfileView";

export default function UserProfilePage({
    params,
}: {
    params: { username: string };
}) {
    return (
        <ProfileView
            username={params.username}
            bio="This user hasn't added a bio yet"
            avatarImage={null}
            isOwnProfile={false}
        />
    );
}