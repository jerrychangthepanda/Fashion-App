import { BackHeader } from "@/components/BackHeader";

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-white dark:bg-neutral-950 px-5 pt-6 pb-[var(--bottom-nav-height)]">
            <BackHeader title="About" />
            <div className="mt-10 space-y-4 text-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Version 0.1.0 (MVP)</p>
                <a
                    href="mailto:hello@example.com"
                    className="inline-block text-sm font-medium text-neutral-900 dark:text-neutral-50 underline"
                >
                    Contact support
                </a>
            </div>
        </main>
    );
}