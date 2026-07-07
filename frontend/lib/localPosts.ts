import type { Post } from "@/lib/mockData";

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

export function saveLocalPost(post: LocalPost) {
    if (typeof window === "undefined") return;

    const currentPosts = getLocalPosts();
    const updatedPosts = [post, ...currentPosts];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPosts));
}

export function deleteLocalPost(postId: string) {
    if (typeof window === "undefined") return;

    const currentPosts = getLocalPosts();
    const updatedPosts = currentPosts.filter((post) => post.id !== postId);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPosts));
}