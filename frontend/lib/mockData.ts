export type Post = {
    id: string;
    username: string;
    timeAgo: string;
    caption: string;
    tags: string[];
    likes: number;
    comments: number;
};

export const MOCK_POSTS: Post[] = [
    {
        id: "1",
        username: "matthew.l",
        timeAgo: "2h ago",
        caption: "coffee run this morning",
        tags: ["Ralph Lauren", "COS", "Clarks"],
        likes: 142,
        comments: 23,
    },
    {
        id: "2",
        username: "juliaa.s",
        timeAgo: "5h ago",
        caption: "new denim day",
        tags: ["Levi's", "Zara"],
        likes: 87,
        comments: 9,
    },
    {
        id: "3",
        username: "dev.kim",
        timeAgo: "1d ago",
        caption: "office fit",
        tags: ["Uniqlo"],
        likes: 54,
        comments: 4,
    },
    {
        id: "4",
        username: "ana.torres",
        timeAgo: "1d ago",
        caption: "weekend errands",
        tags: ["Everlane", "Nike", "Madewell"],
        likes: 201,
        comments: 31,
    },
];