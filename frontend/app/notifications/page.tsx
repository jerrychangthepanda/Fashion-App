"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  ChevronLeft,
  FolderSymlink,
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

  if (notification.type === "collection_share") {
    const collectionName =
      notification.collectionName ?? "a collection";
    const roleText =
      notification.collectionRole === "editor"
        ? "editing access"
        : "viewing access";

    return `shared “${collectionName}” with you with ${roleText}`;
  }

  return "started following you";
}

function notificationHref(
  notification: AppNotification
): string {
  if (
    notification.type === "collection_share" &&
    notification.collectionId
  ) {
    return `/profile/collections/${notification.collectionId}`;
  }

  if (notification.type === "follow") {
    return `/u/${encodeURIComponent(
      notification.actorUsername
    )}`;
  }

  if (notification.postId) {
    return `/profile/post/${notification.postId}`;
  }

  return "/";
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
        className="fill-neutral-900 text-neutral-900 dark:fill-neutral-50 dark:text-neutral-50"
      />
    );
  }

  if (type === "collection_share") {
    return (
      <FolderSymlink
        size={12}
        className="text-violet-500"
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
    <main className="min-h-screen bg-white pb-[var(--bottom-nav-height)] dark:bg-neutral-950">
      <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
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
              <div className="h-11 w-11 rounded-full bg-neutral-100 dark:bg-neutral-800" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-4/5 rounded bg-neutral-100 dark:bg-neutral-800" />
                <div className="h-3 w-20 rounded bg-neutral-100 dark:bg-neutral-800" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex min-h-[55vh] flex-col items-center justify-center px-6 text-center">
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
            Likes, comments, replies, follows, and collections
            shared with you will show up here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {notifications.map((notification) => (
            <Link
              key={notification.id}
              href={notificationHref(notification)}
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
                      src={notification.actorAvatarUrl}
                      alt={notification.actorUsername}
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

                <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-2 ring-white dark:bg-neutral-950 dark:ring-neutral-950">
                  <NotificationIcon type={notification.type} />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm text-neutral-900 dark:text-neutral-50">
                  <span className="font-medium">
                    {notification.actorUsername}
                  </span>{" "}
                  <span className="text-neutral-600 dark:text-neutral-300">
                    {actionText(notification)}
                  </span>
                </p>

                <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                  {notification.timeAgo}
                </p>
              </div>

              {notification.postThumbnailUrl && (
                <Image
                  src={notification.postThumbnailUrl}
                  alt="Post"
                  width={48}
                  height={58}
                  className="h-14 w-12 shrink-0 rounded-md object-cover"
                />
              )}

              {notification.type === "collection_share" && (
                <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                  {notification.collectionRole === "editor"
                    ? "Can edit"
                    : "Can view"}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
