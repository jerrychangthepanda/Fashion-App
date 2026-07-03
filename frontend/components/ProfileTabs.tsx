"use client";

import { useState } from "react";
import { LayoutGrid, Copy } from "lucide-react";

type Tab = "posts" | "collections";

const TABS: { key: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { key: "posts", label: "Posts", icon: LayoutGrid },
  { key: "collections", label: "Collections", icon: Copy },
];

export function ProfileTabs() {
  const [active, setActive] = useState<Tab>("posts");

  return (
    <div className="mt-4">
      <div className="flex border-t border-neutral-200">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActive(tab.key)}
              className={`flex flex-1 flex-col items-center gap-1 border-b-2 py-3 text-xs font-medium ${
                isActive
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-400"
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex justify-center py-12 text-sm text-neutral-400">
        {active === "posts" ? "No posts yet" : "No collections yet"}
      </div>
    </div>
  );
}