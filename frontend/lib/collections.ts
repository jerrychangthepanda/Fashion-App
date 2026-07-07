export type Collection = {
    id: string;
    name: string;
    postIds: string[];
};

const STORAGE_KEY = "fashion-app-collections";

export function getCollections(): Collection[] {
    if (typeof window === "undefined") return [];

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
        return JSON.parse(raw) as Collection[];
    } catch {
        return [];
    }
}

function saveCollections(collections: Collection[]): boolean {
    if (typeof window === "undefined") return false;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
        return true;
    } catch (error) {
        console.error("Failed to save collections:", error);
        return false;
    }
}

export function createCollection(name: string): Collection | null {
    const collections = getCollections();

    const newCollection: Collection = {
        id: crypto.randomUUID(),
        name,
        postIds: [],
    };

    const success = saveCollections([...collections, newCollection]);
    return success ? newCollection : null;
}

export function deleteCollection(collectionId: string): boolean {
    const collections = getCollections();
    const updated = collections.filter((c) => c.id !== collectionId);
    return saveCollections(updated);
}

export function togglePostInCollection(collectionId: string, postId: string): boolean {
    const collections = getCollections();

    const updated = collections.map((collection) => {
        if (collection.id !== collectionId) return collection;

        const alreadyIn = collection.postIds.includes(postId);
        const postIds = alreadyIn
            ? collection.postIds.filter((id) => id !== postId)
            : [...collection.postIds, postId];

        return { ...collection, postIds };
    });

    return saveCollections(updated);
}

export function removePostFromAllCollections(postId: string): boolean {
    const collections = getCollections();

    const updated = collections.map((collection) => ({
        ...collection,
        postIds: collection.postIds.filter((id) => id !== postId),
    }));

    return saveCollections(updated);
}

export function renameCollection(collectionId: string, newName: string): boolean {
    const collections = getCollections();
    const updated = collections.map((collection) =>
        collection.id === collectionId ? { ...collection, name: newName } : collection
    );
    return saveCollections(updated);
}

export function setCollectionPostIds(collectionId: string, postIds: string[]): boolean {
    const collections = getCollections();
    const updated = collections.map((collection) =>
        collection.id === collectionId ? { ...collection, postIds } : collection
    );
    return saveCollections(updated);
}