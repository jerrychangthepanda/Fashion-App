"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { User as UserIcon } from "lucide-react";
import { BackHeader } from "@/components/BackHeader";
import {
    getBlockedUsers,
    unblockUser,
    type BlockedUser,
} from "@/lib/blocks";

export default function PrivacySettingsPage() {
    const [loading, setLoading] = useState(true);
    const [blockedUsers, setBlockedUsers] = useState<
        BlockedUser[]
    >([]);
    const [unblockingIds, setUnblockingIds] = useState<
        string[]
    >([]);

    useEffect(() => {
        let cancelled = false;

        getBlockedUsers()
            .then((users) => {
                if (!cancelled) {
                    setBlockedUsers(users);
                }
            })
            .catch((error) => {
                console.error(
                    "Could not load blocked accounts:",
                    error
                );
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    async function handleUnblock(user: BlockedUser) {
        if (unblockingIds.includes(user.id)) {
            return;
        }

        const confirmed = window.confirm(
            `Unblock @${user.username}? They'll be able to see your posts and profile again.`
        );

        if (!confirmed) {
            return;
        }

        setUnblockingIds((ids) => [...ids, user.id]);

        try {
            await unblockUser(user.id);

            setBlockedUsers((users) =>
                users.filter((u) => u.id !== user.id)
            );
        } catch (error) {
            console.error("Could not unblock user:", error);

            alert("Couldn't unblock this account.");
        } finally {
            setUnblockingIds((ids) =>
                ids.filter((id) => id !== user.id)
            );
        }
    }

    return (
        <main className="flex min-h-screen flex-col bg-white dark:bg-neutral-950 px-5 pt-6 pb-[var(--bottom-nav-height)]">
            <BackHeader title="Privacy" />

            <h2 className="mt-6 text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                Blocked accounts
            </h2>

            <p className="mt-1 text-sm text-neutral-400 dark:text-neutral-500">
                Blocked accounts can&apos;t see your posts or
                profile, follow you, or like/comment on your
                posts.
            </p>

            <div className="mt-4">
                {loading ? (
                    <p className="py-8 text-center text-sm text-neutral-400 dark:text-neutral-500">
                        Loading...
                    </p>
                ) : blockedUsers.length === 0 ? (
                    <p className="py-8 text-center text-sm text-neutral-400 dark:text-neutral-500">
                        You haven&apos;t blocked anyone.
                    </p>
                ) : (
                    <div className="space-y-1">
                        {blockedUsers.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center gap-3 rounded-2xl px-2 py-3"
                            >
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                                    {user.profilePictureUrl ? (
                                        <Image
                                            src={
                                                user.profilePictureUrl
                                            }
                                            alt={user.username}
                                            width={44}
                                            height={44}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <UserIcon
                                            size={18}
                                            className="text-neutral-400 dark:text-neutral-500"
                                        />
                                    )}
                                </div>

                                <p className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                                    {user.username}
                                </p>

                                <button
                                    onClick={() =>
                                        void handleUnblock(user)
                                    }
                                    disabled={unblockingIds.includes(
                                        user.id
                                    )}
                                    className="shrink-0 rounded-full bg-neutral-100 dark:bg-neutral-800 px-4 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-200 disabled:opacity-60"
                                >
                                    Unblock
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
