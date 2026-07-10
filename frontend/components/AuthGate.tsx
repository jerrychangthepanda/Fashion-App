"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasCurrentUser } from "@/lib/users";

export function AuthGate({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        const loggedIn = hasCurrentUser();

        if (!loggedIn && pathname !== "/login") {
            router.replace("/login");
            return;
        }

        if (loggedIn && pathname === "/login") {
            router.replace("/");
            return;
        }

        setChecked(true);
    }, [pathname, router]);

    if (!checked) return null;

    return <>{children}</>;
}