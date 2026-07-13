// Shared post shape. Real posts (from Supabase, see lib/localPosts.ts)
// extend this as LocalPost — kept here since that's the only remaining
// consumer of this file.
export type Post = {
    id: string;
    username: string;
    timeAgo: string;
    caption: string;
    tags: string[];
    likes: number;
    comments: number;
    userId: string;
};