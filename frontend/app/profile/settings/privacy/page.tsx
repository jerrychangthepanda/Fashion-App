import { BackHeader } from "@/components/BackHeader";

export default function PrivacySettingsPage() {
    return (
        <main className="flex min-h-screen flex-col bg-white dark:bg-neutral-950 px-5 pt-6 pb-[var(--bottom-nav-height)]">
            <BackHeader title="Privacy" />
            <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-neutral-400 dark:text-neutral-500">Coming soon</p>
            </div>
        </main>
    );
}