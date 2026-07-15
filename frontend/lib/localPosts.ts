import type { Post } from "@/lib/mockData";
import { supabase } from "@/lib/supabase";

export type MusicTrack = {
    title: string;
    artist: string;
    previewUrl: string;
    artworkUrl?: string;
};

export type LocalPost = Post & {
    imageUrl?: string;
    music?: MusicTrack;
    userId: string;
    profilePictureUrl?: string | null;
};

export type CreatePostInput = {
    imageDataUrl: string;
    caption: string;
    tags: string[];
    music?: MusicTrack;
};

type PostRow = {
    id: string;
    user_id: string;
    caption: string;
    tags: string[] | null;
    image_url: string;
    music: MusicTrack | null;
    created_at: string;
    profiles: {
        username: string;
        profile_picture_url: string | null;
    } | null;
};

const POST_IMAGES_BUCKET = "post-images";

function getTimeAgo(createdAt: string): string {
    const createdTime = new Date(createdAt).getTime();

    const seconds = Math.max(
        0,
        Math.floor((Date.now() - createdTime) / 1000)
    );

    if (seconds < 60) {
        return "now";
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
        return `${days}d ago`;
    }

    const weeks = Math.floor(days / 7);

    if (weeks < 5) {
        return `${weeks}w ago`;
    }

    return new Date(createdAt).toLocaleDateString();
}

function rowToPost(row: PostRow): LocalPost {
    const {
        data: { publicUrl },
    } = supabase.storage
        .from(POST_IMAGES_BUCKET)
        .getPublicUrl(row.image_url);

    return {
        id: row.id,
        userId: row.user_id,
        username: row.profiles?.username ?? "user",
        profilePictureUrl:
            row.profiles?.profile_picture_url ?? null,
        timeAgo: getTimeAgo(row.created_at),
        caption: row.caption,
        tags: row.tags ?? [],
        likes: 0,
        comments: 0,
        imageUrl: publicUrl,
        music: row.music ?? undefined,
    };
}

async function dataUrlToBlob(
    dataUrl: string
): Promise<Blob> {
    const response = await fetch(dataUrl);

    if (!response.ok) {
        throw new Error(
            "Could not process the captured image."
        );
    }

    return response.blob();
}

export async function getPosts(): Promise<LocalPost[]> {
    const { data, error } = await supabase
        .from("posts")
        .select(
            "*, profiles(username, profile_picture_url)"
        )
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Failed to load posts:", error);
        throw error;
    }

    return ((data ?? []) as PostRow[]).map(rowToPost);
}

// A cursor into the feed's created_at/id ordering. created_at alone
// isn't guaranteed unique (two posts can share a timestamp), so we
// carry the id too and use it as a tiebreaker — this is standard
// "keyset" pagination and, unlike offset-based paging, it can't skip
// or repeat a post if new ones are created while the user scrolls.
export type PostsPageCursor = {
    createdAt: string;
    id: string;
};

export type PostsPage = {
    posts: LocalPost[];
    nextCursor: PostsPageCursor | null;
    hasMore: boolean;
};

export async function getPostsPage(
    cursor: PostsPageCursor | null = null,
    limit = 6
): Promise<PostsPage> {
    let query = supabase
        .from("posts")
        .select(
            "*, profiles(username, profile_picture_url)"
        )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        // Fetch one extra row so we can tell whether there's a next
        // page without a separate count query.
        .limit(limit + 1);

    if (cursor) {
        query = query.or(
            `created_at.lt."${cursor.createdAt}",and(created_at.eq."${cursor.createdAt}",id.lt."${cursor.id}")`
        );
    }

    const { data, error } = await query;

    if (error) {
        console.error("Failed to load posts page:", error);
        throw error;
    }

    const rows = (data ?? []) as PostRow[];
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const lastRow = pageRows[pageRows.length - 1];

    return {
        posts: pageRows.map(rowToPost),
        nextCursor:
            hasMore && lastRow
                ? {
                      createdAt: lastRow.created_at,
                      id: lastRow.id,
                  }
                : null,
        hasMore,
    };
}

export async function getPostsByIds(
    postIds: string[]
): Promise<LocalPost[]> {
    const uniqueIds = Array.from(new Set(postIds));

    if (uniqueIds.length === 0) {
        return [];
    }

    const { data, error } = await supabase
        .from("posts")
        .select(
            "*, profiles(username, profile_picture_url)"
        )
        .in("id", uniqueIds);

    if (error) {
        console.error(
            "Failed to load collection posts:",
            error
        );
        throw error;
    }

    const posts = ((data ?? []) as PostRow[]).map(
        rowToPost
    );
    const postMap = new Map(
        posts.map((post) => [post.id, post])
    );

    return postIds
        .map((id) => postMap.get(id))
        .filter(
            (post): post is LocalPost => Boolean(post)
        );
}

export async function getPostsByUser(
    userId: string
): Promise<LocalPost[]> {
    const { data, error } = await supabase
        .from("posts")
        .select(
            "*, profiles(username, profile_picture_url)"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(
            "Failed to load profile posts:",
            error
        );
        throw error;
    }

    return ((data ?? []) as PostRow[]).map(rowToPost);
}

export async function getCurrentUserPosts(): Promise<
    LocalPost[]
> {
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error) {
        console.error(
            "Failed to load the current user:",
            error
        );
        throw error;
    }

    if (!user) {
        return [];
    }

    return getPostsByUser(user.id);
}

export async function getPostById(
    postId: string
): Promise<LocalPost | null> {
    const { data, error } = await supabase
        .from("posts")
        .select(
            "*, profiles(username, profile_picture_url)"
        )
        .eq("id", postId)
        .maybeSingle();

    if (error) {
        console.error("Failed to load post:", error);
        throw error;
    }

    if (!data) {
        return null;
    }

    return rowToPost(data as PostRow);
}

export async function createPost(
    input: CreatePostInput
): Promise<LocalPost> {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
        throw userError;
    }

    if (!user) {
        throw new Error(
            "You must be signed in before creating a post."
        );
    }

    const imageBlob = await dataUrlToBlob(
        input.imageDataUrl
    );

    const extension =
        imageBlob.type === "image/png"
            ? "png"
            : imageBlob.type === "image/webp"
              ? "webp"
              : "jpg";

    const imagePath = `${
        user.id
    }/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
        .from(POST_IMAGES_BUCKET)
        .upload(imagePath, imageBlob, {
            contentType:
                imageBlob.type || "image/jpeg",
            upsert: false,
        });

    if (uploadError) {
        console.error(
            "Failed to upload image:",
            uploadError
        );
        throw uploadError;
    }

    const { data, error: insertError } = await supabase
        .from("posts")
        .insert({
            user_id: user.id,
            caption:
                input.caption.trim() || "new fit",
            tags: input.tags,
            image_url: imagePath,
            music: input.music ?? null,
        })
        .select(
            "*, profiles(username, profile_picture_url)"
        )
        .single();

    if (insertError) {
        await supabase.storage
            .from(POST_IMAGES_BUCKET)
            .remove([imagePath]);

        console.error(
            "Failed to create post:",
            insertError
        );
        throw insertError;
    }

    return rowToPost(data as PostRow);
}

export async function updatePost(
    postId: string,
    updates: {
        caption?: string;
        tags?: string[];
        music?: MusicTrack | null;
    }
): Promise<LocalPost> {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
        throw userError;
    }

    if (!user) {
        throw new Error("You must be signed in.");
    }

    const databaseUpdates: {
        caption?: string;
        tags?: string[];
        music?: MusicTrack | null;
    } = {};

    if (updates.caption !== undefined) {
        databaseUpdates.caption =
            updates.caption.trim() || "new fit";
    }

    if (updates.tags !== undefined) {
        databaseUpdates.tags = updates.tags;
    }

    if (updates.music !== undefined) {
        databaseUpdates.music = updates.music;
    }

    const { data, error } = await supabase
        .from("posts")
        .update(databaseUpdates)
        .eq("id", postId)
        .eq("user_id", user.id)
        .select(
            "*, profiles(username, profile_picture_url)"
        )
        .single();

    if (error) {
        console.error(
            "Failed to update post:",
            error
        );
        throw error;
    }

    return rowToPost(data as PostRow);
}

export async function deletePost(
    postId: string
): Promise<void> {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
        throw userError;
    }

    if (!user) {
        throw new Error("You must be signed in.");
    }

    const { data: existingPost, error: lookupError } =
        await supabase
            .from("posts")
            .select("user_id, image_url")
            .eq("id", postId)
            .single();

    if (lookupError) {
        throw lookupError;
    }

    if (existingPost.user_id !== user.id) {
        throw new Error(
            "You cannot delete another user's post."
        );
    }

    const { error: deleteError } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", user.id);

    if (deleteError) {
        console.error(
            "Failed to delete post:",
            deleteError
        );
        throw deleteError;
    }

    const { error: storageError } =
        await supabase.storage
            .from(POST_IMAGES_BUCKET)
            .remove([existingPost.image_url]);

    if (storageError) {
        console.error(
            "The post was deleted, but its image could not be removed:",
            storageError
        );
    }

    // collection_posts rows are removed automatically by the
    // ON DELETE CASCADE foreign key in Supabase.
}
