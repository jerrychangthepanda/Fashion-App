import { supabase } from "@/lib/supabase";

export type Collection = {
    id: string;
    userId: string;
    name: string;
    isPublic: boolean;
    postIds: string[];
    previewImageUrls: string[];
    createdAt: string;
};

type JoinedPost =
    | {
          image_url: string;
      }
    | {
          image_url: string;
      }[]
    | null;

type CollectionPostRow = {
    post_id: string;
    added_at: string;
    posts: JoinedPost;
};

type CollectionRow = {
    id: string;
    user_id: string;
    name: string;
    is_public: boolean;
    created_at: string;
    collection_posts?: CollectionPostRow[] | null;
};

const POST_IMAGES_BUCKET = "post-images";

const COLLECTION_SELECT = `
    id,
    user_id,
    name,
    is_public,
    created_at,
    collection_posts (
        post_id,
        added_at,
        posts (
            image_url
        )
    )
`;

function getJoinedImagePath(joinedPost: JoinedPost): string | null {
    if (!joinedPost) {
        return null;
    }

    if (Array.isArray(joinedPost)) {
        return joinedPost[0]?.image_url ?? null;
    }

    return joinedPost.image_url;
}

function getPublicImageUrl(imagePath: string): string {
    const {
        data: { publicUrl },
    } = supabase.storage
        .from(POST_IMAGES_BUCKET)
        .getPublicUrl(imagePath);

    return publicUrl;
}

function rowToCollection(row: CollectionRow): Collection {
    const collectionPosts = [...(row.collection_posts ?? [])].sort(
        (a, b) =>
            new Date(b.added_at).getTime() -
            new Date(a.added_at).getTime()
    );

    const previewImageUrls = collectionPosts
        .map((item) => getJoinedImagePath(item.posts))
        .filter((path): path is string => Boolean(path))
        .map(getPublicImageUrl)
        .slice(0, 4);

    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        isPublic: row.is_public,
        postIds: collectionPosts.map((item) => item.post_id),
        previewImageUrls,
        createdAt: row.created_at,
    };
}

async function getCurrentUserId(): Promise<string> {
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error) {
        throw error;
    }

    if (!user) {
        throw new Error("You must be signed in.");
    }

    return user.id;
}

export async function getCollections(): Promise<Collection[]> {
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
        .from("collections")
        .select(COLLECTION_SELECT)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        throw error;
    }

    return ((data ?? []) as CollectionRow[]).map(rowToCollection);
}

export async function getCollectionsByUser(
    userId: string
): Promise<Collection[]> {
    const { data, error } = await supabase
        .from("collections")
        .select(COLLECTION_SELECT)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) {
        console.warn("Failed to load profile collections:", error);
        throw error;
    }

    // RLS returns public collections to other users and also returns
    // private collections when the signed-in user owns them.
    return ((data ?? []) as CollectionRow[]).map(rowToCollection);
}

export async function getCollectionById(
    collectionId: string
): Promise<Collection | null> {
    const { data, error } = await supabase
        .from("collections")
        .select(COLLECTION_SELECT)
        .eq("id", collectionId)
        .maybeSingle();

    if (error) {
        console.warn("Failed to load collection:", error);
        throw error;
    }

    return data ? rowToCollection(data as CollectionRow) : null;
}

export async function createCollection(
    name: string,
    isPublic = false
): Promise<Collection> {
    const userId = await getCurrentUserId();
    const trimmedName = name.trim();

    if (!trimmedName) {
        throw new Error("Collection name cannot be empty.");
    }

    const { data, error } = await supabase
        .from("collections")
        .insert({
            user_id: userId,
            name: trimmedName,
            is_public: isPublic,
        })
        .select("id, user_id, name, is_public, created_at")
        .single();

    if (error) {
        console.warn("Failed to create collection:", error);
        throw error;
    }

    const row = data as Omit<CollectionRow, "collection_posts">;

    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        isPublic: row.is_public,
        postIds: [],
        previewImageUrls: [],
        createdAt: row.created_at,
    };
}

export async function deleteCollection(
    collectionId: string
): Promise<void> {
    const userId = await getCurrentUserId();

    const { error } = await supabase
        .from("collections")
        .delete()
        .eq("id", collectionId)
        .eq("user_id", userId);

    if (error) {
        console.warn("Failed to delete collection:", error);
        throw error;
    }
}

export async function renameCollection(
    collectionId: string,
    newName: string
): Promise<void> {
    const userId = await getCurrentUserId();
    const trimmedName = newName.trim();

    if (!trimmedName) {
        throw new Error("Collection name cannot be empty.");
    }

    const { error } = await supabase
        .from("collections")
        .update({ name: trimmedName })
        .eq("id", collectionId)
        .eq("user_id", userId);

    if (error) {
        console.warn("Failed to rename collection:", error);
        throw error;
    }
}

export async function setCollectionVisibility(
    collectionId: string,
    isPublic: boolean
): Promise<void> {
    const userId = await getCurrentUserId();

    const { error } = await supabase
        .from("collections")
        .update({ is_public: isPublic })
        .eq("id", collectionId)
        .eq("user_id", userId);

    if (error) {
        console.warn(
            "Failed to update collection visibility:",
            error
        );
        throw error;
    }
}

export async function addPostToCollection(
    collectionId: string,
    postId: string
): Promise<void> {
    const { error } = await supabase
        .from("collection_posts")
        .upsert(
            {
                collection_id: collectionId,
                post_id: postId,
            },
            {
                onConflict: "collection_id,post_id",
                ignoreDuplicates: true,
            }
        );

    if (error) {
        console.warn("Failed to add post to collection:", error);
        throw error;
    }
}

export async function removePostFromCollection(
    collectionId: string,
    postId: string
): Promise<void> {
    const { error } = await supabase
        .from("collection_posts")
        .delete()
        .eq("collection_id", collectionId)
        .eq("post_id", postId);

    if (error) {
        console.warn(
            "Failed to remove post from collection:",
            error
        );
        throw error;
    }
}

export async function togglePostInCollection(
    collectionId: string,
    postId: string
): Promise<boolean> {
    const { data, error } = await supabase
        .from("collection_posts")
        .select("post_id")
        .eq("collection_id", collectionId)
        .eq("post_id", postId)
        .maybeSingle();

    if (error) {
        console.warn("Failed to check collection:", error);
        throw error;
    }

    if (data) {
        await removePostFromCollection(collectionId, postId);
        return false;
    }

    await addPostToCollection(collectionId, postId);
    return true;
}

export async function setCollectionPostIds(
    collectionId: string,
    postIds: string[]
): Promise<void> {
    const collection = await getCollectionById(collectionId);

    if (!collection) {
        throw new Error("Collection not found.");
    }

    const desiredIds = Array.from(new Set(postIds));
    const currentIds = new Set(collection.postIds);
    const desiredIdSet = new Set(desiredIds);

    const idsToAdd = desiredIds.filter((id) => !currentIds.has(id));
    const idsToRemove = collection.postIds.filter(
        (id) => !desiredIdSet.has(id)
    );

    if (idsToRemove.length > 0) {
        const { error: removeError } = await supabase
            .from("collection_posts")
            .delete()
            .eq("collection_id", collectionId)
            .in("post_id", idsToRemove);

        if (removeError) {
            console.warn(
                "Failed to remove collection posts:",
                removeError
            );
            throw removeError;
        }
    }

    if (idsToAdd.length > 0) {
        const { error: addError } = await supabase
            .from("collection_posts")
            .upsert(
                idsToAdd.map((postId) => ({
                    collection_id: collectionId,
                    post_id: postId,
                })),
                {
                    onConflict: "collection_id,post_id",
                    ignoreDuplicates: true,
                }
            );

        if (addError) {
            console.warn(
                "Failed to add collection posts:",
                addError
            );
            throw addError;
        }
    }
}
