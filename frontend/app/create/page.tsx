"use client";

import { useRouter } from "next/navigation";
import { Camera, X } from "lucide-react";

export default function CreatePage() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950">
      <div className="flex items-center px-5 pt-5">
        <button
          onClick={() => router.back()}
          aria-label="Close"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
        >
          <X size={18} className="text-white" />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-3">
        <div className="flex aspect-[4/5] w-full items-center justify-center rounded-3xl border border-white/10 bg-neutral-900">
          <Camera size={32} className="text-white/25" />
        </div>
      </div>

      <div className="flex items-center justify-center pb-10">
        <button
          aria-label="Take picture"
          className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-[3px] border-white"
        >
          <span className="h-[54px] w-[54px] rounded-full bg-white" />
        </button>
      </div>
    </div>
  );
}