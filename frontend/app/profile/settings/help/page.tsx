import { BackHeader } from "@/components/BackHeader";

export default function HelpSettingsPage() {
    return (
        <main className="flex min-h-screen flex-col bg-white px-5 pt-6 pb-28">
            <BackHeader title="Help & FAQ" />
            <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-neutral-1500">ICEMAN will solve your problems!!!</p>
            </div>
        </main>
    );
}