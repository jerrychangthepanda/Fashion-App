"use client";

import { useSyncExternalStore } from "react";

// Generalizes the technique already used in components/ThemeProvider.tsx
// (see that file's comments for the full rationale): read a
// localStorage-backed value the way React's docs recommend for
// anything that lives outside React — via useSyncExternalStore —
// instead of copying it into useState from a one-time mount effect.
// That avoids both the extra "wrong then right" render the effect
// approach causes and the react-hooks/set-state-in-effect lint
// warning it triggers, while staying just as SSR-safe (the server has
// no localStorage, so it gets a `null` snapshot instead of crashing).
//
// The browser only fires a native "storage" event in OTHER tabs, not
// the one that made the write — so a caller that also WRITES this key
// from within the same mounted component (e.g. a settings toggle)
// should write through setLocalStorageValue below instead of calling
// localStorage.setItem directly, so this hook's subscribers in this
// tab update immediately too. Callers where the key is only ever
// written by some OTHER page (which remounts this one on return, e.g.
// a profile field edited on a separate screen) don't need that and
// can keep writing however they already do.
function subscribe(onStoreChange: () => void) {
    window.addEventListener("storage", onStoreChange);
    return () => window.removeEventListener("storage", onStoreChange);
}

function getServerSnapshot(): null {
    return null;
}

export function useLocalStorageValue(key: string): string | null {
    return useSyncExternalStore(
        subscribe,
        () => localStorage.getItem(key),
        getServerSnapshot
    );
}

export function setLocalStorageValue(key: string, value: string): void {
    localStorage.setItem(key, value);

    // Same-tab readers of useLocalStorageValue subscribe to "storage"
    // events the same as cross-tab ones do, but the browser never
    // fires that event in the tab that made the write — dispatch one
    // manually so this tab's own UI updates without a reload.
    window.dispatchEvent(
        new StorageEvent("storage", { key, newValue: value })
    );
}
