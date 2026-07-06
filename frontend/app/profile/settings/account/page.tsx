"use client";

import { BackHeader } from "@/components/BackHeader";

const FAKE_EMAIL = "scorpion@example.com";
const FAKE_PHONE = "+67 (676) 676-6767";

function notReady() {
    alert("This will be editable once real accounts are set up.");
}

export default function AccountSettingsPage() {
    function handleDeactivate() {
        const confirmed = window.confirm(
            "Deactivate your account? This will be a real, working action once accounts exist."
        );
        if (confirmed) notReady();
    }

    function handleDelete() {
        const confirmed = window.confirm(
            "Permanently delete your account? This will be a real, working action once accounts exist."
        );
        if (confirmed) notReady();
    }

    return (
        <main className="min-h-screen bg-white px-5 pt-6 pb-[var(--bottom-nav-height)]">
            <BackHeader title="My Account" />

            <div className="mt-6 overflow-hidden rounded-2xl bg-neutral-50">
                <div className="flex items-center justify-between px-4 py-3">
                    <div>
                        <p className="text-xs text-neutral-400">Email</p>
                        <p className="mt-0.5 text-sm font-medium text-neutral-900">{FAKE_EMAIL}</p>
                    </div>
                    <button onClick={notReady} className="text-sm font-medium text-neutral-500 underline">
                        Change
                    </button>
                </div>

                <div className="h-px bg-neutral-200" />

                <div className="flex items-center justify-between px-4 py-3">
                    <div>
                        <p className="text-xs text-neutral-400">Phone number</p>
                        <p className="mt-0.5 text-sm font-medium text-neutral-900">{FAKE_PHONE}</p>
                    </div>
                    <button onClick={notReady} className="text-sm font-medium text-neutral-500 underline">
                        Change
                    </button>
                </div>
            </div>

            <div className="mt-8 space-y-3">
                <button
                    onClick={handleDeactivate}
                    className="w-full rounded-2xl bg-neutral-50 px-4 py-3 text-center text-sm font-medium text-neutral-700"
                >
                    Deactivate account
                </button>

                <button
                    onClick={handleDelete}
                    className="w-full rounded-2xl bg-neutral-50 px-4 py-3 text-center text-sm font-medium text-red-500"
                >
                    Delete account
                </button>
            </div>
        </main>
    );
}