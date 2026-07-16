import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

export function SettingsRow({
    href,
    icon: Icon,
    label,
    subtitle,
}: {
    href: string;
    icon: LucideIcon;
    label: string;
    subtitle?: string;
}) {
    return (
        <Link
            href={href}
            className="flex items-center justify-between px-4 py-3 active:bg-neutral-100 dark:active:bg-neutral-800"
        >
            <div className="flex items-center gap-3">
                <Icon size={18} className="text-neutral-500 dark:text-neutral-400" />
                <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{label}</p>
                    {subtitle && <p className="text-xs text-neutral-400 dark:text-neutral-500">{subtitle}</p>}
                </div>
            </div>
            <ChevronRight size={16} className="text-neutral-300 dark:text-neutral-600" />
        </Link>
    );
}