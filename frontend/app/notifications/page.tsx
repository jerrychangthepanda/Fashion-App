"use client";

import { Bell, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotificationsPage() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-white pb-[var(--bottom-nav-height)]">
            <div className="flex items-center gap-3 border-b border-neutral-100 px-5 py-4">
                <button
                    onClick={() => router.back()}
                    aria-label="Back"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100"
                >
                    <ChevronLeft size={20} className="text-neutral-700" />
                </button>

                <h1 className="text-lg font-semibold text-neutral-900">
                    Notifications
                </h1>
            </div>

            <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                    <Bell size={26} className="text-neutral-400" />
                </div>

                <h2 className="mt-4 text-base font-semibold text-neutral-900">
                    No notifications yet
                </h2>

                <p className="mt-2 max-w-xs text-sm text-neutral-400">
                    When someone likes, comments, follows you, or interacts with your posts, it will show up here.
                </p>
            </div>
        </main>
    );
}