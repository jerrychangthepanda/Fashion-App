"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [error, setError] = useState("");

    function handleContinue() {
        const trimmed = username.trim();

        if (!trimmed) {
            setError("Enter a username to continue.");
            return;
        }

        localStorage.setItem("username", trimmed);
        router.push("/");
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6">
            <div className="w-full max-w-[320px]">
                <h1 className="text-center text-2xl font-semibold text-neutral-900">
                    Welcome
                </h1>
                <p className="mt-2 text-center text-sm text-neutral-400">
                    Enter a username to log in or create your account.
                </p>

                <input
                    value={username}
                    onChange={(event) => {
                        setUsername(event.target.value);
                        setError("");
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") handleContinue();
                    }}
                    placeholder="Username"
                    className="mt-6 w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                />

                {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

                <button
                    onClick={handleContinue}
                    className="mt-4 w-full rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}