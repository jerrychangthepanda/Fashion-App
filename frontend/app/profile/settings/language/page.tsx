"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { BackHeader } from "@/components/BackHeader";

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
    const [selected, setSelected] = useState("English");

    useEffect(() => {
        const saved = localStorage.getItem("language");
        if (saved) setSelected(saved);
    }, []);

    function selectLanguage(lang: string) {
        setSelected(lang);
        localStorage.setItem("language", lang);
    }

    return (
        <main className="min-h-screen bg-white px-5 pt-6 pb-[var(--bottom-nav-height)]">
            <BackHeader title="Language" />

            <div className="mt-6 overflow-hidden rounded-2xl bg-neutral-50">
                {LANGUAGES.map((lang, i) => (
                    <div key={lang}>
                        <button
                            onClick={() => selectLanguage(lang)}
                            className="flex w-full items-center justify-between px-4 py-3 active:bg-neutral-100"
                        >
                            <span className="text-sm font-medium text-neutral-900">{lang}</span>
                            {selected === lang && (
                                <Check size={18} className="text-neutral-900" />
                            )}
                        </button>
                        {i < LANGUAGES.length - 1 && (
                            <div className="h-px bg-neutral-200" />
                        )}
                    </div>
                ))}
            </div>
        </main>
    );
}