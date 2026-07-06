import { MOCK_POSTS } from "@/lib/mockData";
import { FeedList } from "@/components/FeedList";

export default function FeedPage() {
    return (
        <main className="min-h-screen bg-white pb-[var(--bottom-nav-height)]">
            <div className="border-b border-neutral-100 px-5 py-4">
                <h1 className="text-lg font-semibold text-neutral-900">Feed</h1>
            </div>

            <FeedList posts={MOCK_POSTS} />
        </main>
    );
}