"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, User } from "lucide-react";

const TABS = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

    if (pathname.startsWith("/create") || pathname.startsWith("/login")) {
      return null;
    }
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-[480px] items-center justify-between px-10 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <TabLink tab={TABS[0]} active={pathname === TABS[0].href} />

        <Link href="/create" aria-label="Create" className="flex flex-col items-center gap-1">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white">
            <Plus size={20} strokeWidth={2.25} />
          </span>
          <span className="text-[11px] font-medium text-neutral-900">Create</span>
        </Link>

        <TabLink tab={TABS[1]} active={pathname === TABS[1].href} />
      </div>
    </nav>
  );
}

function TabLink({
  tab,
  active,
}: {
  tab: { href: string; label: string; icon: typeof Home };
  active: boolean;
}) {
  const Icon = tab.icon;
  return (
    <Link href={tab.href} className="flex flex-col items-center gap-1">
      <Icon
        size={22}
        strokeWidth={active ? 2 : 1.6}
        className={active ? "text-neutral-900" : "text-neutral-400"}
      />
      <span
        className={`text-[11px] ${active ? "font-semibold text-neutral-900" : "font-medium text-neutral-400"}`}
      >
        {tab.label}
      </span>
    </Link>
  );
}