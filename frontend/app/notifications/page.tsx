"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, ChevronLeft, Heart, MessageCircle, User } from "lucide-react";
import {
    getNotifications,
    markAllNotificationsRead,
    type AppNotification,
} from "@/lib/notifications";

function actionText(notification: AppNotification): string {
    if (notification.type === "like") {
        return "liked your post";
    }

    if (notification.type === "comment") {
        const body = notification.commentBody?.trim();

        return body
            ? `commented: "${
                  body.length > 60
                      ? `${body.slice(0, 60)}…`
                      : body
              }"`
            : "commented on your post";
    }

    return "started following you";
}

function NotificationIcon({
    type,
}: {
    type: AppNotification["type"];
}) {
    if (type === "like") {
        return (
            <Heart
                size={12}
                className="fill-red-500 text-red-500"
            />
        );
    }

    if (type === "comment") {
        return (
            <MessageCircle
                size={12}
                className="fill-neutral-900 text-neutral-900"
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

            // Mark everything read once it's actually been fetched —
            // the list above already captured each notification's
            // pre-read state, so this doesn't change what's rendered
            // this visit, only what shows up as "new" next time.
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
        <main className="min-h-screen bg-white pb-[var(--bottom-nav-height)]">
            <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4">
                <button
                    onClick={() => router.back()}
                    aria-label="Back"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100"
                >
                    <ChevronLeft size={20} className="text-neutral-700" />
                </button>

                <h1 className="text-lg font-semibold text-neutral-900">
                    Notifications
                </h1>
            </div>

            {loading ? (
                <div className="animate-pulse divide-y divide-neutral-100">
                    {[0, 1, 2, 3].map((index) => (
                        <div
                            key={index}
                            className="flex items-center gap-3 px-4 py-3"
                        >
                            <div className="h-11 w-11 shrink-0 rounded-full bg-neutral-100" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3 w-3/4 rounded-full bg-neutral-100" />
                                <div className="h-2.5 w-1/4 rounded-full bg-neutral-100" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : notifications.length === 0 ? (
                <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                        <Bell size={26} className="text-neutral-400" />
                    </div>

                    <h2 className="mt-4 text-base font-semibold text-neutral-900">
                        No notifications yet
                    </h2>

                    <p className="mt-2 max-w-xs text-sm text-neutral-400">
                        When someone likes, comments, or follows you, it will show up here.
                    </p>
                </div>
            ) : (
                <div className="divide-y divide-neutral-100">
                    {notifications.map((notification) => {
                        const href =
                            notification.type === "follow"
                                ? `/u/${notification.actorUsername}`
                                : notification.postId
                                  ? `/profile/post/${notification.postId}`
                                  : "/";

                        return (
                            <Link
                                key={notification.id}
                                href={href}
                                className={`flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 ${
                                    notification.read
                                        ? ""
                                        : "bg-blue-50/40"
                                }`}
                            >
                                <div className="relative h-11 w-11 shrink-0">
                                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-neutral-100">
                                        {notification.actorAvatarUrl ? (
                                            <img
                                                src={
                                                    notification.actorAvatarUrl
                                                }
                                                alt={
                                                    notification.actorUsername
                                                }
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <User
                                                size={19}
                                                className="text-neutral-500"
                                            />
                                        )}
                                    </div>

                                    <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-2 ring-white">
                                        <NotificationIcon
                                            type={notification.type}
                                        />
                                    </div>
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm text-neutral-900">
                                        <span className="font-medium">
                                            {
                                                notification.actorUsername
                                            }
                                        </span>{" "}
                                        <span className="text-neutral-600">
                                            {actionText(notification)}
                                        </span>
                                    </p>

                                    <p className="mt-0.5 text-xs text-neutral-400">
                                        {notification.timeAgo}
                                    </p>
                                </div>

                                {notification.postThumbnailUrl && (
                                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                                        <img
                                            src={
                                                notification.postThumbnailUrl
                                            }
                                            alt=""
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
