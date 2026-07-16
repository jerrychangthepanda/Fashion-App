"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
    Bell,
    ChevronLeft,
    Heart,
    MessageCircle,
    User,
} from "lucide-react";
import {
    getNotifications,
    markAllNotificationsRead,
    type AppNotification,
} from "@/lib/notifications";

function shortenedCommentBody(
    notification: AppNotification
): string | null {
    const body = notification.commentBody?.trim();

    if (!body) {
        return null;
    }

    return body.length > 60
        ? `${body.slice(0, 60)}…`
        : body;
}

function actionText(notification: AppNotification): string {
    const body = shortenedCommentBody(notification);

    if (notification.type === "like") {
        return "liked your post";
    }

    if (notification.type === "comment") {
        return body
            ? `commented: "${body}"`
            : "commented on your post";
    }

    if (notification.type === "reply") {
        return body
            ? `replied: "${body}"`
            : "replied to your comment";
    }

    if (notification.type === "comment_like") {
        return body
            ? `liked your comment: "${body}"`
            : "liked your comment";
    }

    return "started following you";
}

function NotificationIcon({
    type,
}: {
    type: AppNotification["type"];
}) {
    if (type === "like" || type === "comment_like") {
        return (
            <Heart
                size={12}
                className="fill-red-500 text-red-500"
            />
        );
    }

    if (type === "comment" || type === "reply") {
        return (
            <MessageCircle
                size={12}
                className="fill-neutral-900 dark:fill-neutral-50 text-neutral-900 dark:text-neutral-50"
            />
        );
    }

    return (
        <User
            size={12}
            className="fill-blue-500 text-blue-500"
        />
    );
}

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<
        AppNotification[]
    >([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const results = await getNotifications();

                if (!cancelled) {
                    setNotifications(results);
                }
            } catch (error) {
                console.error(
                    "Could not load notifications:",
                    error
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }

            try {
                await markAllNotificationsRead();
            } catch (error) {
                console.error(
                    "Could not mark notifications read:",
                    error
                );
            }
        }

        void load();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <main className="min-h-screen bg-white dark:bg-neutral-950 pb-[var(--bottom-nav-height)]">
            <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 px-5 py-4">
                <button
                    onClick={() => router.back()}
                    aria-label="Back"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
                >
                    <ChevronLeft
                        size={20}
                        className="text-neutral-700 dark:text-neutral-200"
                    />
                </button>
                <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                    Notifications
                </h1>
            </div>

            {loading ? (
                <div className="animate-pulse divide-y divide-neutral-100 dark:divide-neutral-800">
                    {[0, 1, 2, 3].map((index) => (
                        <div
                            key={index}
                            className="flex items-center gap-3 px-4 py-3"
                        >
                            <div className="h-11 w-11 shrink-0 rounded-full bg-neutral-100 dark:bg-neutral-800" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3 w-3/4 rounded-full bg-neutral-100 dark:bg-neutral-800" />
                                <div className="h-2.5 w-1/4 rounded-full bg-neutral-100 dark:bg-neutral-800" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : notifications.length === 0 ? (
                <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <Bell
                            size={26}
                            className="text-neutral-400 dark:text-neutral-500"
                        />
                    </div>
                    <h2 className="mt-4 text-base font-semibold text-neutral-900 dark:text-neutral-50">
                        No notifications yet
                    </h2>
                    <p className="mt-2 max-w-xs text-sm text-neutral-400 dark:text-neutral-500">
                        When someone likes, comments, replies, or
                        follows you, it will show up here.
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {notifications.map((notification) => {
                        const href =
                            notification.type === "follow"
                                ? `/u/${encodeURIComponent(
                                      notification.actorUsername
                                  )}`
                                : notification.postId
                                  ? `/profile/post/${notification.postId}`
                                  : "/";

                        return (
                            <Link
                                key={notification.id}
                                href={href}
                                className={`flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900 ${
                                    notification.read
                                        ? ""
                                        : "bg-blue-50/40 dark:bg-blue-500/10"
                                }`}
                            >
                                <div className="relative h-11 w-11 shrink-0">
                                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                                        {notification.actorAvatarUrl ? (
                                            <Image
                                                src={
                                                    notification.actorAvatarUrl
                                                }
                                                alt={
                                                    notification.actorUsername
                                                }
                                                width={44}
                                                height={44}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <User
                                                size={19}
                                                className="text-neutral-500 dark:text-neutral-400"
                                            />
                                        )}
                                    </div>

                                    <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-neutral-950 ring-2 ring-white dark:ring-neutral-950">
                                        <NotificationIcon
                                            type={notification.type}
                                        />
                                    </div>
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm text-neutral-900 dark:text-neutral-50">
                                        <span className="font-medium">
                                            {
                                                notification.actorUsername
                                            }
                                        </span>{" "}
                                        <span className="text-neutral-600 dark:text-neutral-300">
                                            {actionText(notification)}
                                        </span>
                                    </p>
                                    <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                                        {notification.timeAgo}
                                    </p>
                                </div>

                                {notification.postThumbnailUrl && (
                                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                                        <Image
                                            src={
                                                notification.postThumbnailUrl
                                            }
                                            alt=""
                                            width={44}
                                            height={44}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            )}
        </main>
    );
}
