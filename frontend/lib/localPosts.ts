import type { Post } from "@/lib/mockData";
import { removePostFromAllCollections } from "@/lib/collections";

export type MusicTrack = {
    title: string;
    artist: string;
    previewUrl: string;
    artworkUrl?: string;
};

export type LocalPost = Post & {
    imageUrl?: string;
    music?: MusicTrack;
};

const STORAGE_KEY = "fashion-app-local-posts";

export function getLocalPosts(): LocalPost[] {
    if (typeof window === "undefined") return [];

    const rawPosts = localStorage.getItem(STORAGE_KEY);
    if (!rawPosts) return [];

    try {
        return JSON.parse(rawPosts) as LocalPost[];
    } catch {
        return [];
    }
}

export function saveLocalPost(post: LocalPost): boolean {
    if (typeof window === "undefined") return false;

    const currentPosts = getLocalPosts();
    const updatedPosts = [post, ...currentPosts];

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPosts));
        return true;
    } catch (error) {
        console.error("Failed to save post:", error);
        return false;
    }
}

export function deleteLocalPost(postId: string): boolean {
    if (typeof window === "undefined") return false;

    const currentPosts = getLocalPosts();
    const updatedPosts = currentPosts.filter((post) => post.id !== postId);

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPosts));
        removePostFromAllCollections(postId);
        return true;
    } catch (error) {
        console.error("Failed to delete post:", error);
        return false;
    }
}

export function updateLocalPost(postId: string, updates: Partial<LocalPost>): boolean {
    if (typeof window === "undefined") return false;

    const currentPosts = getLocalPosts();
    const updatedPosts = currentPosts.map((post) =>
        post.id === postId ? { ...post, ...updates } : post
    );

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPosts));
        return true;
    } catch (error) {
        console.error("Failed to update post:", error);
        return false;
    }
}