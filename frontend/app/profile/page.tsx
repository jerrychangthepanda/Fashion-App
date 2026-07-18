"use client";

import { useEffect, useState } from "react";
import { ProfileView } from "@/components/ProfileView";
import { supabase } from "@/lib/supabase";
import {
  getCurrentUserPosts,
  type LocalPost,
} from "@/lib/localPosts";
import {
  getCollections,
  getSharedCollections,
  type Collection,
  type SharedCollection,
} from "@/lib/collections";

function describeError(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (error as { message?: unknown }).message
    );
  }

  return String(error);
}

export default function ProfilePage() {
  const [username, setUsername] = useState("Username");
  const [bio, setBio] = useState(
    "Your bio will show up here"
  );
  const [profileImage, setProfileImage] = useState<
    string | null
  >(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<LocalPost[]>([]);
  const [collections, setCollections] = useState<
    Collection[]
  >([]);
  const [sharedCollections, setSharedCollections] = useState<
    SharedCollection[]
  >([]);

  useEffect(() => {
    let cancelled = false;

    const savedUsername = localStorage.getItem("username");
    const savedBio = localStorage.getItem("bio");
    const savedProfileImage =
      localStorage.getItem("profileImage");

    setUsername(savedUsername || "Username");

    if (savedBio) {
      setBio(savedBio);
    }

    if (savedProfileImage) {
      setProfileImage(savedProfileImage);
    }

    async function loadCurrentUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        if (!cancelled) {
          setUserId(user?.id ?? null);
        }
      } catch (error) {
        console.warn(
          "Could not load the current user:",
          describeError(error)
        );
      }
    }

    async function loadProfilePosts() {
      try {
        const loadedPosts = await getCurrentUserPosts();

        if (!cancelled) {
          setPosts(loadedPosts);
        }
      } catch (error) {
        console.warn(
          "Could not load profile posts:",
          describeError(error)
        );

        if (!cancelled) {
          setPosts([]);
        }
      }
    }

    async function loadProfileCollections() {
      try {
        const [owned, shared] = await Promise.all([
          getCollections(),
          getSharedCollections(),
        ]);

        if (!cancelled) {
          setCollections(owned);
          setSharedCollections(shared);
        }
      } catch (error) {
        console.warn(
          "Could not load profile collections:",
          describeError(error)
        );

        if (!cancelled) {
          setCollections([]);
          setSharedCollections([]);
        }
      }
    }

    // These intentionally run independently. A collection error
    // must not block profile posts or the rest of the profile.
    void loadCurrentUser();
    void loadProfilePosts();
    void loadProfileCollections();

    return () => {
      cancelled = true;
    };
  }, []);

  function handlePostDeleted(postId: string) {
    setPosts((currentPosts) =>
      currentPosts.filter((post) => post.id !== postId)
    );
  }

  return (
    <ProfileView
      username={username}
      userId={userId}
      bio={bio}
      avatarImage={profileImage}
      isOwnProfile={true}
      posts={posts}
      collections={collections}
      sharedCollections={sharedCollections}
      onPostDeleted={handlePostDeleted}
    />
  );
}
