import { supabase } from "@/lib/supabase";

const POST_IMAGES_BUCKET = "post-images";

export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "reply"
  | "comment_like"
  | "collection_share";

export type CollectionNotificationRole = "viewer" | "editor";

export type AppNotification = {
  id: string;
  type: NotificationType;
  createdAt: string;
  timeAgo: string;
  read: boolean;
  actorUsername: string;
  actorAvatarUrl: string | null;
  postId: string | null;
  postThumbnailUrl: string | null;
  commentBody: string | null;
  collectionId: string | null;
  collectionName: string | null;
  collectionRole: CollectionNotificationRole | null;
};

type JoinedCollection =
  | {
      name: string;
    }
  | {
      name: string;
    }[]
  | null;

type NotificationRow = {
  id: string;
  type: NotificationType;
  created_at: string;
  read_at: string | null;
  post_id: string | null;
  comment_id: string | null;
  collection_id: string | null;
  collection_role: CollectionNotificationRole | null;
  actor: {
    username: string;
    profile_picture_url: string | null;
  } | null;
  post: {
    image_url: string;
  } | null;
  comment: {
    body: string;
  } | null;
  collection: JoinedCollection;
};

function getTimeAgo(createdAt: string): string {
  const createdTime = new Date(createdAt).getTime();
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - createdTime) / 1000)
  );

  if (seconds < 60) return "now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  return new Date(createdAt).toLocaleDateString();
}

function getJoinedCollectionName(
  collection: JoinedCollection
): string | null {
  if (!collection) {
    return null;
  }

  if (Array.isArray(collection)) {
    return collection[0]?.name ?? null;
  }

  return collection.name;
}

function rowToNotification(
  row: NotificationRow
): AppNotification {
  let postThumbnailUrl: string | null = null;

  if (row.post?.image_url) {
    const {
      data: { publicUrl },
    } = supabase.storage
      .from(POST_IMAGES_BUCKET)
      .getPublicUrl(row.post.image_url);

    postThumbnailUrl = publicUrl;
  }

  return {
    id: row.id,
    type: row.type,
    createdAt: row.created_at,
    timeAgo: getTimeAgo(row.created_at),
    read: row.read_at !== null,
    actorUsername: row.actor?.username ?? "user",
    actorAvatarUrl:
      row.actor?.profile_picture_url ?? null,
    postId: row.post_id,
    postThumbnailUrl,
    commentBody: row.comment?.body ?? null,
    collectionId: row.collection_id,
    collectionName: getJoinedCollectionName(row.collection),
    collectionRole: row.collection_role,
  };
}

export async function getNotifications(
  limit = 50
): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(
      `
        id,
        type,
        created_at,
        read_at,
        post_id,
        comment_id,
        collection_id,
        collection_role,
        actor:profiles!notifications_actor_id_fkey (
          username,
          profile_picture_url
        ),
        post:posts (
          image_url
        ),
        comment:comments (
          body
        ),
        collection:collections!notifications_collection_id_fkey (
          name
        )
      `
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to load notifications:", error);
    throw error;
  }

  return ((data ?? []) as unknown as NotificationRow[]).map(
    rowToNotification
  );
}

export async function getUnreadNotificationCount(): Promise<number> {
  const {
    data: { session },
    error: userError,
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  if (userError) {
    console.error(
      "Failed to load the current user:",
      userError
    );
    return 0;
  }

  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error(
      "Failed to load unread notification count:",
      error
    );
    return 0;
  }

  return count ?? 0;
}

export async function markAllNotificationsRead(): Promise<void> {
  const {
    data: { session },
    error: userError,
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  if (userError) {
    throw userError;
  }

  if (!user) {
    return;
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);

  if (error) {
    console.error(
      "Failed to mark notifications read:",
      error
    );
    throw error;
  }
}
