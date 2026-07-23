import { supabase } from "@/lib/supabase";
import { isSupabasePostId } from "@/lib/comments";
import {
  getPostsByIds,
  type LocalPost,
} from "@/lib/localPosts";

// Every post id the signed-in user has hidden from their feed, so a
// hide survives refreshes/sessions instead of living only in React
// state.
export async function getHiddenPostIds(): Promise<Set<string>> {
  const {
    data: { session },
    error: userError,
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  if (userError) {
    console.error("Failed to load the current user:", userError);
    return new Set();
  }

  if (!user) {
    return new Set();
  }

  const { data, error } = await supabase
    .from("hidden_posts")
    .select("post_id")
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to load hidden posts:", error);
    throw error;
  }

  const hiddenRows = (data ?? []) as { post_id: string }[];

  return new Set(hiddenRows.map((row) => row.post_id));
}

// Loads the actual posts in the order they were hidden, newest first.
// getPostsByIds preserves the order of the supplied ids.
export async function getHiddenPosts(): Promise<LocalPost[]> {
  const {
    data: { session },
    error: userError,
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  if (userError) {
    throw userError;
  }

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("hidden_posts")
    .select("post_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load hidden posts:", error);
    throw error;
  }

  const hiddenRows = (data ?? []) as { post_id: string }[];

  return getPostsByIds(
    hiddenRows.map((row) => row.post_id)
  );
}

export async function hidePost(postId: string): Promise<void> {
  if (!isSupabasePostId(postId)) {
    return;
  }

  const {
    data: { session },
    error: userError,
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const { error } = await supabase.from("hidden_posts").insert({
    user_id: user.id,
    post_id: postId,
  });

  if (error) {
    // Primary-key violation means this post is already hidden
    // (for example, a double-click race). Treat that as a
    // successful no-op.
    if (error.code === "23505") {
      return;
    }

    console.error("Failed to hide post:", error);
    throw error;
  }
}

export async function unhidePost(postId: string): Promise<void> {
  const {
    data: { session },
    error: userError,
  } = await supabase.auth.getSession();

  const user = session?.user ?? null;

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error("You must be signed in.");
  }

  const { error } = await supabase
    .from("hidden_posts")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to unhide post:", error);
    throw error;
  }
}
