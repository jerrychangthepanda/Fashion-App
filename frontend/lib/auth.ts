import { supabase } from "@/lib/supabase";

export async function logOut(): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signOut();
    if (error) return { error: error.message };

    localStorage.removeItem("username");
    localStorage.removeItem("bio");
    localStorage.removeItem("profileImage");
    localStorage.removeItem("userId");
    return { error: null };
}