"use client";

import { Check } from "lucide-react";
import { BackHeader } from "@/components/BackHeader";
import {
    setLocalStorageValue,
    useLocalStorageValue,
} from "@/lib/useLocalStorageValue";

const LANGUAGES = [
    "English",
    "Spanish",
    "Mandarin",
    "Hindi",
    "French",
    "Portuguese",
    "Arabic",
    "Japanese",
    "German",
    "Korean",
];

export default function LanguageSettingsPage() {
    // Reads (and, via setLocalStorageValue below, writes) the saved
    // language as the external store it is, instead of seeding
    // useState from a mount effect — see lib/useLocalStorageValue.ts.
    // Unlike the read-only cases elsewhere, this page both reads AND
    // writes the same key from within the same mounted component
    // (clicking a language should update the checkmark immediately),
    // so the write goes through setLocalStorageValue rather than
    // localStorage.setItem directly.
    const selected = useLocalStorageValue("language") ?? "English";

    function selectLanguage(lang: string) {
        setLocalStorageValue("language", lang);
    }

    return (
        <main className="min-h-screen bg-white dark:bg-neutral-950 px-5 pt-6 pb-[var(--bottom-nav-height)]">
            <BackHeader title="Language" />

            <div className="mt-6 overflow-hidden rounded-2xl bg-neutral-50 dark:bg-neutral-900">
                {LANGUAGES.map((lang, i) => (
                    <div key={lang}>
                        <button
                            onClick={() => selectLanguage(lang)}
                            className="flex w-full items-center justify-between px-4 py-3 active:bg-neutral-100 dark:active:bg-neutral-800"
                        >
                            <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{lang}</span>
                            {selected === lang && (
                                <Check size={18} className="text-neutral-900 dark:text-neutral-50" />
                            )}
                        </button>
                        {i < LANGUAGES.length - 1 && (
                            <div className="h-px bg-neutral-200 dark:bg-neutral-700" />
                        )}
                    </div>
                ))}
            </div>
        </main>
    );
}