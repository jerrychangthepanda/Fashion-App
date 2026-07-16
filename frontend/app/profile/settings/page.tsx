"use client";

import { useRouter } from "next/navigation";
import { User, Shield, Moon, Info, LogOut, Globe, HelpCircle } from "lucide-react";
import { BackHeader } from "@/components/BackHeader";
import { SettingsRow } from "@/components/SettingsRow";
import { useTheme } from "@/components/ThemeProvider";
import { logOut } from "@/lib/auth";

export default function SettingsPage() {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const darkMode = theme === "dark";

    async function handleLogOut() {
        const confirmed = window.confirm("Log out?");
        if (!confirmed) return;

        const { error } = await logOut();
        if (error) {
            alert(`Logout failed: ${error}`);
            return;
        }

        router.push("/login");
    }

    return (
        <main className="min-h-screen bg-white dark:bg-neutral-950 px-5 pt-6 pb-[var(--bottom-nav-height)]">
            <BackHeader title="Settings" />

            <div className="mt-8 space-y-6">
                <div className="overflow-hidden rounded-2xl bg-neutral-50 dark:bg-neutral-900">
                    <SettingsRow href="/profile/settings/account" icon={User} label="My Account" />
                    <div className="h-px bg-neutral-200 dark:bg-neutral-700" />
                    <SettingsRow href="/profile/settings/privacy" icon={Shield} label="Privacy" />
                    <div className="h-px bg-neutral-200 dark:bg-neutral-700" />
                    <SettingsRow href="/profile/settings/language" icon={Globe} label="Language" subtitle="English" />
                </div>

                <div className="rounded-2xl bg-neutral-50 dark:bg-neutral-900 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Moon size={18} className="text-neutral-500 dark:text-neutral-400" />
                            <div>
                                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">Dark mode</p>
                            </div>
                        </div>
                       <button
                            onClick={toggleTheme}
                            role="switch"
                            aria-checked={darkMode}
                            aria-label="Toggle dark mode"
                            className={`h-6 w-10 rounded-full transition-colors ${
                                darkMode ? "bg-neutral-900 dark:bg-neutral-50" : "bg-neutral-300 dark:bg-neutral-700"
                            }`}
                        >
                            <span
                                className={`block h-5 w-5 rounded-full bg-white dark:bg-neutral-950 transition-transform ${
                                    darkMode ? "translate-x-4" : "translate-x-0.5"
                                }`}
                            />
                        </button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl bg-neutral-50 dark:bg-neutral-900">
                    <SettingsRow href="/profile/settings/help" icon={HelpCircle} label="Help & FAQ" />
                    <div className="h-px bg-neutral-200 dark:bg-neutral-700" />
                    <SettingsRow href="/profile/settings/about" icon={Info} label="About" subtitle="Version 0.1.0" />
                </div>

                <button
                    onClick={handleLogOut}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-50 dark:bg-neutral-900 px-4 py-3 text-sm font-medium text-red-500"
                >
                    <LogOut size={18} />
                    Log out
                </button>
            </div>
        </main>
    );
}