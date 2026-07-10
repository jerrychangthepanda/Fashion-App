"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function AuthGate({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [ready, setReady] = useState(false);
    const syncedUserId = useRef<string | null>(null);

    async function syncProfile(userId: string) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", userId)
            .single();
        if (profile?.username) {
            localStorage.setItem("username", profile.username);
        }
        syncedUserId.current = userId;
    }

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data }) => {
            if (data.session) await syncProfile(data.session.user.id);
            setSession(data.session);
            setReady(true);
        });

        const { data: listener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            if (newSession && newSession.user.id !== syncedUserId.current) {
                await syncProfile(newSession.user.id);
            }
            if (!newSession) syncedUserId.current = null;
            setSession(newSession);
        });

        return () => listener.subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!ready) return;
        if (!session && pathname !== "/login") router.replace("/login");
        if (session && pathname === "/login") router.replace("/");
    }, [ready, session, pathname, router]);

    if (!ready) return null;
    if (!session && pathname !== "/login") return null;
    if (session && pathname === "/login") return null;

    return <>{children}</>;
}