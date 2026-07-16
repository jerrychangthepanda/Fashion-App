"use client";

import {
    createContext,
    useCallback,
    useContext,
    useSyncExternalStore,
} from "react";

type Theme = "light" | "dark";

// Keep this key name in sync with the inline FOUC-prevention script in
// app/layout.tsx — both read/write the same localStorage entry.
const THEME_STORAGE_KEY = "theme";

type ThemeContextValue = {
    theme: Theme;
    toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// The actual theme lives outside React entirely: it's just the
// presence/absence of the `dark` class on <html>, the same DOM node
// the inline FOUC script (see app/layout.tsx) sets before hydration.
// Reading it straight from the DOM via useSyncExternalStore — rather
// than mirroring it into useState from an effect — means there's no
// intermediate "wrong" render to reconcile and no setState-in-effect
// anti-pattern; React treats it as the external store it genuinely is.
function getSnapshot(): Theme {
    return document.documentElement.classList.contains("dark")
        ? "dark"
        : "light";
}

// The server has no DOM/localStorage to read, so it always assumes
// "light" — useSyncExternalStore is specifically designed to let a
// client snapshot legitimately differ from the server one without
// triggering a hydration-mismatch warning.
function getServerSnapshot(): Theme {
    return "light";
}

// applyTheme is the only place the DOM class or localStorage ever
// change, so listeners only need notifying from there — no need to
// watch for external changes (e.g. another tab), which keeps this a
// plain synchronous notify-on-write rather than a real subscription.
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
    listeners.add(onStoreChange);
    return () => listeners.delete(onStoreChange);
}

// The single source of truth for "what does theme X actually do":
// toggle the `dark` class on <html>, which is what the
// `@custom-variant dark (&:where(.dark, .dark *));` rule in
// globals.css keys every `dark:` utility off of, persist the choice,
// then tell every subscribed component to re-read the new snapshot.
function applyTheme(theme: Theme) {
    document.documentElement.classList.toggle("dark", theme === "dark");

    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
        // Private browsing / disabled storage: theme still applies for
        // this tab, it just won't persist across reloads.
    }

    listeners.forEach((listener) => listener());
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const theme = useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
    );

    const toggleTheme = useCallback(() => {
        applyTheme(theme === "dark" ? "light" : "dark");
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);

    if (!context) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }

    return context;
}
