"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { BackHeader } from "@/components/BackHeader";
import { logOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type BusyAction =
    | "email"
    | "phone"
    | "deactivate"
    | "delete"
    | null;

const PHONE_PLACEHOLDER = "Not added";

function clearLocalAccountData() {
    localStorage.removeItem("username");
    localStorage.removeItem("bio");
    localStorage.removeItem("profileImage");
    localStorage.removeItem("userId");
}

export default function AccountSettingsPage() {
    const router = useRouter();

    const [userId, setUserId] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [loading, setLoading] = useState(true);
    const [busyAction, setBusyAction] =
        useState<BusyAction>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadAccount() {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                if (!cancelled) {
                    router.replace("/login");
                }

                return;
            }

            const { data: profile, error: profileError } =
                await supabase
                    .from("profiles")
                    .select("phone_number")
                    .eq("id", user.id)
                    .maybeSingle();

            if (profileError) {
                console.error(
                    "Failed to load account profile:",
                    profileError
                );
            }

            if (cancelled) return;

            setUserId(user.id);
            setEmail(user.email ?? "Not available");
            setPhone(profile?.phone_number ?? "");
            setLoading(false);
        }

        void loadAccount();

        return () => {
            cancelled = true;
        };
    }, [router]);

    async function handleChangeEmail() {
        const enteredEmail = window.prompt(
            "Enter your new email address:",
            email
        );

        if (enteredEmail === null) return;

        const newEmail = enteredEmail.trim().toLowerCase();

        if (!newEmail || !newEmail.includes("@")) {
            alert("Enter a valid email address.");
            return;
        }

        if (newEmail === email.toLowerCase()) return;

        setBusyAction("email");

        const { data, error } =
            await supabase.auth.updateUser({
                email: newEmail,
            });

        setBusyAction(null);

        if (error) {
            alert(`Email change failed: ${error.message}`);
            return;
        }

        /*
         * Supabase may keep the old address here until the
         * confirmation link has been clicked.
         */
        setEmail(data.user?.email ?? email);

        alert(
            "Check your email for a confirmation link. " +
            "Your account email will change after confirmation."
        );
    }

    async function handleChangePhone() {
        if (!userId) return;

        const enteredPhone = window.prompt(
            "Enter your phone number. Leave it empty to remove it:",
            phone
        );

        if (enteredPhone === null) return;

        const newPhone = enteredPhone.trim();

        setBusyAction("phone");

        const { error } = await supabase
            .from("profiles")
            .update({
                phone_number: newPhone || null,
            })
            .eq("id", userId);

        setBusyAction(null);

        if (error) {
            alert(`Phone number change failed: ${error.message}`);
            return;
        }

        setPhone(newPhone);
    }

    async function handleLogout() {
        const confirmed = window.confirm("Log out?");

        if (!confirmed) return;

        const { error } = await logOut();

        if (error) {
            alert(`Logout failed: ${error}`);
            return;
        }

        router.replace("/login");
        router.refresh();
    }

    async function handleDeactivate() {
        if (!userId) return;

        const confirmed = window.confirm(
            "Deactivate your account?\n\n" +
            "Your profile and posts will be hidden. " +
            "Logging in again will reactivate your account."
        );

        if (!confirmed) return;

        setBusyAction("deactivate");

        const { error } = await supabase
            .from("profiles")
            .update({
                deactivated_at: new Date().toISOString(),
            })
            .eq("id", userId);

        if (error) {
            setBusyAction(null);
            alert(`Deactivation failed: ${error.message}`);
            return;
        }

        const { error: logoutError } = await logOut();

        setBusyAction(null);

        if (logoutError) {
            alert(
                `The account was deactivated, but logout failed: ${logoutError}`
            );
        }

        router.replace("/login");
        router.refresh();
    }

    async function handleDelete() {
        const confirmation = window.prompt(
            "This permanently deletes your account, posts, " +
            "comments, likes, collections, and followers.\n\n" +
            'Type DELETE to continue:'
        );

        if (confirmation !== "DELETE") {
            return;
        }

        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
            alert(
                "Your session has expired. Log in again before deleting your account."
            );
            return;
        }

        setBusyAction("delete");

        try {
            const response = await fetch(
                "/api/account/delete",
                {
                    method: "POST",
                    headers: {
                        Authorization:
                            `Bearer ${session.access_token}`,
                    },
                }
            );

            const result = (await response
                .json()
                .catch(() => null)) as
                | { error?: string }
                | null;

            if (!response.ok) {
                throw new Error(
                    result?.error ??
                    "The account could not be deleted."
                );
            }

            clearLocalAccountData();

            /*
             * Supabase may already consider the deleted user
             * session invalid, so this is only local cleanup.
             */
            await supabase.auth.signOut({
                scope: "local",
            });

            router.replace("/login");
            router.refresh();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "The account could not be deleted.";

            alert(message);
        } finally {
            setBusyAction(null);
        }
    }

    const disabled = loading || busyAction !== null;

    return (
        <main className="min-h-screen bg-white px-5 pt-6 pb-[var(--bottom-nav-height)]">
            <BackHeader title="My Account" />

            <div className="mt-6 overflow-hidden rounded-2xl bg-neutral-50">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0 pr-4">
                        <p className="text-xs text-neutral-400">
                            Email
                        </p>

                        <p className="mt-0.5 truncate text-sm font-medium text-neutral-900">
                            {loading ? "Loading..." : email}
                        </p>
                    </div>

                    <button
                        onClick={handleChangeEmail}
                        disabled={disabled}
                        className="shrink-0 text-sm font-medium text-neutral-500 underline disabled:opacity-40"
                    >
                        {busyAction === "email"
                            ? "Saving..."
                            : "Change"}
                    </button>
                </div>

                <div className="h-px bg-neutral-200" />

                <div className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0 pr-4">
                        <p className="text-xs text-neutral-400">
                            Phone number
                        </p>

                        <p className="mt-0.5 truncate text-sm font-medium text-neutral-900">
                            {loading
                                ? "Loading..."
                                : phone || PHONE_PLACEHOLDER}
                        </p>
                    </div>

                    <button
                        onClick={handleChangePhone}
                        disabled={disabled}
                        className="shrink-0 text-sm font-medium text-neutral-500 underline disabled:opacity-40"
                    >
                        {busyAction === "phone"
                            ? "Saving..."
                            : "Change"}
                    </button>
                </div>
            </div>

            <div className="mt-8 space-y-3">
                <button
                    onClick={handleLogout}
                    disabled={disabled}
                    className="w-full rounded-2xl bg-neutral-50 px-4 py-3 text-center text-sm font-medium text-neutral-700 disabled:opacity-40"
                >
                    Log out
                </button>

                <button
                    onClick={handleDeactivate}
                    disabled={disabled}
                    className="w-full rounded-2xl bg-neutral-50 px-4 py-3 text-center text-sm font-medium text-neutral-700 disabled:opacity-40"
                >
                    {busyAction === "deactivate"
                        ? "Deactivating..."
                        : "Deactivate account"}
                </button>

                <button
                    onClick={handleDelete}
                    disabled={disabled}
                    className="w-full rounded-2xl bg-neutral-50 px-4 py-3 text-center text-sm font-medium text-red-500 disabled:opacity-40"
                >
                    {busyAction === "delete"
                        ? "Deleting..."
                        : "Delete account"}
                </button>
            </div>
        </main>
    );
}