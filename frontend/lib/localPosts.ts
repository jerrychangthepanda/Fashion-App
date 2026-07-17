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
    likes_count: number | null;
    comments_count: number | null;
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
        // Denormalized on posts and kept in sync by DB triggers on
        // likes/comments insert+delete — no per-post count query
        // needed to render the feed.
        likes: row.likes_count ?? 0,
        comments: row.comments_count ?? 0,
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
            "*, profiles!posts_user_id_fkey!inner(username, profile_picture_url, deactivated_at)"
    )
        .is("profiles.deactivated_at", null)
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
            "*, profiles!posts_user_id_fkey!inner(username, profile_picture_url, deactivated_at)"
    )
        .is("profiles.deactivated_at", null)
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
            "*, profiles!posts_user_id_fkey!inner(username, profile_picture_url, deactivated_at)")
        .is("profiles.deactivated_at", null)
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
            "*, profiles!posts_user_id_fkey!inner(username, profile_picture_url, deactivated_at)")
        .is("profiles.deactivated_at", null)
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

// Distinct tag suggestions matching a search query, computed
// server-side (via the search_post_tags RPC, which unnests posts.tags
// and filters with ILIKE) instead of downloading every post to filter
// client-side.
export async function searchBrandSuggestions(
    query: string
): Promise<string[]> {
    const trimmed = query.trim();

    if (!trimmed) {
        return [];
    }

    const { data, error } = await supabase.rpc("search_post_tags", {
        search_query: trimmed,
    });

    if (error) {
        console.error("Failed to search brands:", error);
        throw error;
    }

    return ((data ?? []) as { tag: string }[]).map((row) => row.tag);
}

// Distinct (title, artist) song suggestions matching a search query,
// computed server-side via the search_post_music RPC.
export async function searchMusicSuggestions(
    query: string
): Promise<{ title: string; artist: string }[]> {
    const trimmed = query.trim();

    if (!trimmed) {
        return [];
    }

    const { data, error } = await supabase.rpc("search_post_music", {
        search_query: trimmed,
    });

    if (error) {
        console.error("Failed to search music:", error);
        throw error;
    }

    return (data ?? []) as { title: string; artist: string }[];
}

// All posts tagged with an exact brand/tag value — used once the user
// picks a brand suggestion, to show every matching post.
export async function getPostsByTag(
    tag: string
): Promise<LocalPost[]> {
    const { data, error } = await supabase
        .from("posts")
        .select(
            "*, profiles!posts_user_id_fkey!inner(username, profile_picture_url, deactivated_at)"
        )
        .is("profiles.deactivated_at", null)
        .contains("tags", [tag])
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        console.error("Failed to load posts by tag:", error);
        throw error;
    }

    return ((data ?? []) as PostRow[]).map(rowToPost);
}

// All posts using an exact (title, artist) song — used once the user
// picks a music suggestion.
export async function getPostsByMusic(
    title: string,
    artist: string
): Promise<LocalPost[]> {
    const { data, error } = await supabase
        .from("posts")
        .select(
            "*, profiles!posts_user_id_fkey!inner(username, profile_picture_url, deactivated_at)"
        )
        .is("profiles.deactivated_at", null)
        .eq("music->>title", title)
        .eq("music->>artist", artist)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        console.error("Failed to load posts by music:", error);
        throw error;
    }

    return ((data ?? []) as PostRow[]).map(rowToPost);
}

// All posts by a given username — mirrors getPostsByUser but takes
// the profile's handle instead of its id, for the "profile" search
// filter.
export async function getPostsByUsername(
    username: string
): Promise<LocalPost[]> {
    const { data, error } = await supabase
        .from("posts")
        .select(
            "*, profiles!posts_user_id_fkey!inner(username, profile_picture_url, deactivated_at)"
        )
        .is("profiles.deactivated_at", null)
        .eq("profiles.username", username)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        console.error("Failed to load posts by username:", error);
        throw error;
    }

    return ((data ?? []) as PostRow[]).map(rowToPost);
}

export async function getPostById(
    postId: string
): Promise<LocalPost | null> {
    const { data, error } = await supabase
        .from("posts")
        .select(
            "*, profiles!posts_user_id_fkey!inner(username, profile_picture_url, deactivated_at)")
        .is("profiles.deactivated_at", null)
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
            "*, profiles!posts_user_id_fkey!inner(username, profile_picture_url, deactivated_at)")
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
            "*, profiles!posts_user_id_fkey!inner(username, profile_picture_url, deactivated_at)")
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
