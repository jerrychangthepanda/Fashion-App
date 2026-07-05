"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function BackHeader({ title }: { title: string }) {
    const router = useRouter();

    return (
        <div className="flex items-center">
            <button
                onClick={() => router.back()}
                aria-label="Back"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100"
            >
                <ChevronLeft size={20} className="text-neutral-700" />
            </button>
            <h1 className="flex-1 text-center text-base font-semibold text-neutral-900">
                {title}
            </h1>
            <div className="h-9 w-9" />
        </div>
    );
}