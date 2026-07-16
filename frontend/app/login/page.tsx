"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
    const router = useRouter();
    const [mode, setMode] = useState<"signup" | "login">("signup");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit() {
        setError("");

        if (!email.trim() || !password.trim()) {
            setError("Enter an email and password.");
            return;
        }

        if (mode === "signup" && !username.trim()) {
            setError("Enter a username.");
            return;
        }

        setLoading(true);

        if (mode === "signup") {
            const { error: signUpError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: { data: { username: username.trim() } },
            });

            setLoading(false);
            if (signUpError) {
                setError(signUpError.message);
                return;
            }
        } else {
            const {
                data: signInData,
                error: signInError,
            } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (signInError) {
                setLoading(false);
                setError(signInError.message);
                return;
            }

            if (signInData.user) {
                const { error: reactivateError } =
                    await supabase
                        .from("profiles")
                        .update({
                            deactivated_at: null,
                        })
                        .eq("id", signInData.user.id);

                if (reactivateError) {
                    console.error(
                        "Failed to reactivate account:",
                        reactivateError
                    );

                    await supabase.auth.signOut();

                    setLoading(false);
                    setError(
                        "Your account could not be reactivated."
                    );
                    return;
                }
            }

            setLoading(false);
        }

        router.push("/");
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6">
            <div className="w-full max-w-[320px]">
                <h1 className="text-center text-2xl font-semibold text-neutral-900">
                    {mode === "signup" ? "Create account" : "Welcome back"}
                </h1>

                <div className="mt-6 space-y-3">
                    {mode === "signup" && (
                        <input
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            placeholder="Username"
                            className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                        />
                    )}

                    <input
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Email"
                        type="email"
                        className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                    />

                    <input
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Password"
                        type="password"
                        className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                    />
                </div>

                {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="mt-4 w-full rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                    {loading ? "..." : mode === "signup" ? "Sign up" : "Log in"}
                </button>

                <button
                    onClick={() => {
                        setMode(mode === "signup" ? "login" : "signup");
                        setError("");
                    }}
                    className="mt-4 w-full text-center text-sm text-neutral-500"
                >
                    {mode === "signup" ? "Already have an account? Log in" : "New here? Sign up"}
                </button>
            </div>
        </div>
    );
}