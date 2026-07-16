// Placeholder shown in place of a PostCard while it's loading, so the
// feed has something to paint immediately instead of a blank screen —
// same idea as Instagram/TikTok's shimmering placeholder tiles.
export function PostCardSkeleton() {
    return (
        <article className="animate-pulse border-b border-neutral-100 dark:border-neutral-800 pb-4">
            <div className="flex items-center gap-2 px-4 py-3">
                <div className="h-8 w-8 rounded-full bg-neutral-100 dark:bg-neutral-800" />

                <div className="space-y-1.5">
                    <div className="h-3 w-24 rounded-full bg-neutral-100 dark:bg-neutral-800" />
                    <div className="h-2.5 w-14 rounded-full bg-neutral-100 dark:bg-neutral-800" />
                </div>
            </div>

            <div className="mx-4 aspect-[4/5] rounded-2xl bg-neutral-100 dark:bg-neutral-800" />

            <div className="space-y-2 px-4 pt-3">
                <div className="h-3.5 w-3/4 rounded-full bg-neutral-100 dark:bg-neutral-800" />
                <div className="h-3.5 w-1/2 rounded-full bg-neutral-100 dark:bg-neutral-800" />

                <div className="flex gap-4 pt-2">
                    <div className="h-4 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800" />
                    <div className="h-4 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800" />
                </div>
            </div>
        </article>
    );
}
