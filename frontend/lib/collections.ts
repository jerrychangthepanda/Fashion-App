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

export type CollectionShareRole = "viewer" | "editor";
export type CollectionPermission =
  | "none"
  | "viewer"
  | "editor"
  | "owner";

export type SharedCollection = Collection & {
  accessRole: CollectionShareRole;
};

export type EditableCollection = Collection & {
  permission: "owner" | "editor";
};

export type CollectionCollaborator = {
  userId: string;
  username: string;
  profilePictureUrl: string | null;
  role: CollectionShareRole;
  createdAt: string;
};

export type CollectionShareProfile = {
  id: string;
  username: string;
  bio: string;
  profilePictureUrl: string | null;
};

type JoinedPost =
  | {
      image_url: string;
    }
  | {
      image_url: string;
    }[]
  | null;

type JoinedProfile =
  | {
      username: string;
      profile_picture_url: string | null;
    }
  | {
      username: string;
      profile_picture_url: string | null;
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

type CollaboratorRow = {
  user_id: string;
  role: CollectionShareRole;
  created_at: string;
  profiles: JoinedProfile;
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

function getJoinedProfile(joinedProfile: JoinedProfile): {
  username: string;
  profile_picture_url: string | null;
} | null {
  if (!joinedProfile) {
    return null;
  }

  if (Array.isArray(joinedProfile)) {
    return joinedProfile[0] ?? null;
  }

  return joinedProfile;
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

  // RLS returns public collections, collections owned by the
  // signed-in user, and private collections explicitly shared
  // with the signed-in user.
  return ((data ?? []) as CollectionRow[]).map(rowToCollection);
}

export async function getSharedCollections(): Promise<
  SharedCollection[]
> {
  const userId = await getCurrentUserId();

  const { data: accessRows, error: accessError } = await supabase
    .from("collection_collaborators")
    .select("collection_id, role, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (accessError) {
    console.warn("Failed to load shared collection access:", accessError);
    throw accessError;
  }

  const typedAccessRows = (accessRows ?? []) as {
    collection_id: string;
    role: CollectionShareRole;
    created_at: string;
  }[];

  if (typedAccessRows.length === 0) {
    return [];
  }

  const roleByCollectionId = new Map(
    typedAccessRows.map((row) => [row.collection_id, row.role])
  );
  const sharedAtByCollectionId = new Map(
    typedAccessRows.map((row) => [row.collection_id, row.created_at])
  );

  const { data, error } = await supabase
    .from("collections")
    .select(COLLECTION_SELECT)
    .in(
      "id",
      typedAccessRows.map((row) => row.collection_id)
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Failed to load shared collections:", error);
    throw error;
  }

  return ((data ?? []) as CollectionRow[])
    .map((row) => {
      const accessRole = roleByCollectionId.get(row.id);

      if (!accessRole) {
        return null;
      }

      return {
        ...rowToCollection(row),
        accessRole,
      };
    })
    .filter(
      (collection): collection is SharedCollection =>
        collection !== null
    )
    .sort((a, b) => {
      const aSharedAt = sharedAtByCollectionId.get(a.id) ?? "";
      const bSharedAt = sharedAtByCollectionId.get(b.id) ?? "";
      return bSharedAt.localeCompare(aSharedAt);
    });
}

export async function getEditableCollections(): Promise<
  EditableCollection[]
> {
  const [ownedCollections, sharedCollections] = await Promise.all([
    getCollections(),
    getSharedCollections(),
  ]);

  return [
    ...ownedCollections.map((collection) => ({
      ...collection,
      permission: "owner" as const,
    })),
    ...sharedCollections
      .filter((collection) => collection.accessRole === "editor")
      .map((collection) => ({
        ...collection,
        permission: "editor" as const,
      })),
  ];
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

export async function getCollectionPermission(
  collectionId: string
): Promise<CollectionPermission> {
  const collection = await getCollectionById(collectionId);

  if (!collection) {
    return "none";
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    return collection.isPublic ? "viewer" : "none";
  }

  if (user.id === collection.userId) {
    return "owner";
  }

  const { data, error } = await supabase
    .from("collection_collaborators")
    .select("role")
    .eq("collection_id", collectionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.warn("Failed to load collection permission:", error);
    throw error;
  }

  if (data?.role === "editor") {
    return "editor";
  }

  if (data?.role === "viewer") {
    return "viewer";
  }

  return collection.isPublic ? "viewer" : "none";
}

export async function getCollectionCollaborators(
  collectionId: string
): Promise<CollectionCollaborator[]> {
  const { data, error } = await supabase
    .from("collection_collaborators")
    .select(
      `
        user_id,
        role,
        created_at,
        profiles!collection_collaborators_user_id_fkey (
          username,
          profile_picture_url
        )
      `
    )
    .eq("collection_id", collectionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("Failed to load collection collaborators:", error);
    throw error;
  }

  return ((data ?? []) as CollaboratorRow[]).map((row) => {
    const profile = getJoinedProfile(row.profiles);

    return {
      userId: row.user_id,
      username: profile?.username ?? "user",
      profilePictureUrl: profile?.profile_picture_url ?? null,
      role: row.role,
      createdAt: row.created_at,
    };
  });
}

export async function searchProfilesForCollectionSharing(
  query: string
): Promise<CollectionShareProfile[]> {
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, bio, profile_picture_url")
    .is("deactivated_at", null)
    .ilike("username", `%${trimmed}%`)
    .order("username", { ascending: true })
    .limit(10);

  if (error) {
    console.warn("Failed to search profiles for sharing:", error);
    throw error;
  }

  const profileRows = (data ?? []) as {
    id: string;
    username: string;
    bio: string | null;
    profile_picture_url: string | null;
  }[];

  return profileRows.map((row) => ({
    id: row.id,
    username: row.username,
    bio: row.bio ?? "",
    profilePictureUrl: row.profile_picture_url ?? null,
  }));
}

export async function addCollectionCollaborator(
  collectionId: string,
  userId: string,
  role: CollectionShareRole
): Promise<void> {
  const currentUserId = await getCurrentUserId();

  if (currentUserId === userId) {
    throw new Error("The collection owner already has full access.");
  }

  const { error } = await supabase
    .from("collection_collaborators")
    .upsert(
      {
        collection_id: collectionId,
        user_id: userId,
        role,
        invited_by: currentUserId,
      },
      {
        onConflict: "collection_id,user_id",
      }
    );

  if (error) {
    console.warn("Failed to share collection:", error);
    throw error;
  }
}

export async function updateCollectionCollaboratorRole(
  collectionId: string,
  userId: string,
  role: CollectionShareRole
): Promise<void> {
  const { data, error } = await supabase
    .from("collection_collaborators")
    .update({ role })
    .eq("collection_id", collectionId)
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle();

  if (error) {
    console.warn("Failed to update collection permission:", error);
    throw error;
  }

  if (!data) {
    throw new Error("This collaborator could not be updated.");
  }
}

export async function removeCollectionCollaborator(
  collectionId: string,
  userId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("collection_collaborators")
    .delete()
    .eq("collection_id", collectionId)
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle();

  if (error) {
    console.warn("Failed to remove collection collaborator:", error);
    throw error;
  }

  if (!data) {
    throw new Error("This collection access could not be removed.");
  }
}

export async function leaveSharedCollection(
  collectionId: string
): Promise<void> {
  const userId = await getCurrentUserId();
  await removeCollectionCollaborator(collectionId, userId);
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
  const trimmedName = newName.trim();

  if (!trimmedName) {
    throw new Error("Collection name cannot be empty.");
  }

  // This RPC changes only the name. Its database-side permission
  // check allows the owner and editors, while preventing editors
  // from changing visibility, ownership, or other protected fields.
  const { error } = await supabase.rpc("rename_shared_collection", {
    target_collection_id: collectionId,
    new_name: trimmedName,
  });

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
    console.warn("Failed to update collection visibility:", error);
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
    console.warn("Failed to remove post from collection:", error);
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
      console.warn("Failed to remove collection posts:", removeError);
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
      console.warn("Failed to add collection posts:", addError);
      throw addError;
    }
  }
}
