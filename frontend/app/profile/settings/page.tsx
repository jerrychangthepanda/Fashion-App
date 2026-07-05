"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User, Shield, Moon, Info, LogOut, Globe, HelpCircle } from "lucide-react";
import { BackHeader } from "@/components/BackHeader";
import { SettingsRow } from "@/components/SettingsRow";

export default function SettingsPage() {
    const router = useRouter();
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("darkMode");
        if (saved === "true") setDarkMode(true);
    }, []);

    function toggleDarkMode() {
        const next = !darkMode;
        setDarkMode(next);
        localStorage.setItem("darkMode", String(next));
    }

    // ...rest of the component stays the same

    function handleLogOut() {
        const confirmed = window.confirm(
            "This clears your locally saved profile (username, bio, photo). Continue?"
        );
        if (!confirmed) return;

        localStorage.removeItem("username");
        localStorage.removeItem("bio");
        localStorage.removeItem("profileImage");
        router.push("/profile");
    }

    return (
        <main className="min-h-screen bg-white px-5 pt-6 pb-28">
            <BackHeader title="Settings" />

            <div className="mt-8 space-y-6">
                <div className="overflow-hidden rounded-2xl bg-neutral-50">
                    <SettingsRow href="/profile/settings/account" icon={User} label="My Account" />
                    <div className="h-px bg-neutral-200" />
                    <SettingsRow href="/profile/settings/privacy" icon={Shield} label="Privacy" />
                    <div className="h-px bg-neutral-200" />
                    <SettingsRow href="/profile/settings/language" icon={Globe} label="Language" subtitle="English" />
                </div>

                <div className="rounded-2xl bg-neutral-50 px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Moon size={18} className="text-neutral-500" />
                            <div>
                                <p className="text-sm font-medium text-neutral-900">Dark mode</p>
                                <p className="text-xs text-neutral-400">Full support coming soon</p>
                            </div>
                        </div>
                       <button
                            onClick={toggleDarkMode}
                            aria-label="Toggle dark mode"
                            className={`h-6 w-10 rounded-full transition-colors ${
                                darkMode ? "bg-neutral-900" : "bg-neutral-300"
                            }`}
                        >
                            <span
                                className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                                    darkMode ? "translate-x-4" : "translate-x-0.5"
                                }`}
                            />
                        </button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl bg-neutral-50">
                    <SettingsRow href="/profile/settings/help" icon={HelpCircle} label="Help & FAQ" />
                    <div className="h-px bg-neutral-200" />
                    <SettingsRow href="/profile/settings/about" icon={Info} label="About" subtitle="Version 0.1.0" />
                </div>

                <button
                    onClick={handleLogOut}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-50 px-4 py-3 text-sm font-medium text-red-500"
                >
                    <LogOut size={18} />
                    Log out
                </button>
            </div>
        </main>
    );
}