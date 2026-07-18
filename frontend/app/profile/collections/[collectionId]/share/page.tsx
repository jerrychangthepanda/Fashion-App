"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  Check,
  Copy,
  Globe2,
  Lock,
  Search,
  User,
  X,
} from "lucide-react";
import { BackHeader } from "@/components/BackHeader";
import {
  addCollectionCollaborator,
  getCollectionById,
  getCollectionCollaborators,
  getCollectionPermission,
  removeCollectionCollaborator,
  searchProfilesForCollectionSharing,
  updateCollectionCollaboratorRole,
  type Collection,
  type CollectionCollaborator,
  type CollectionShareProfile,
  type CollectionShareRole,
} from "@/lib/collections";

export default function ShareCollectionPage() {
  const params = useParams();
  const collectionId = String(params.collectionId ?? "");

  const [collection, setCollection] =
    useState<Collection | null>(null);
  const [collaborators, setCollaborators] = useState<
    CollectionCollaborator[]
  >([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    CollectionShareProfile[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [busyUserIds, setBusyUserIds] = useState<Set<string>>(
    new Set()
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSharePage() {
      try {
        const [loadedCollection, permission] =
          await Promise.all([
            getCollectionById(collectionId),
            getCollectionPermission(collectionId),
          ]);

        if (!loadedCollection || permission !== "owner") {
          if (!cancelled) {
            setCollection(loadedCollection);
            setIsOwner(false);
          }
          return;
        }

        const loadedCollaborators =
          await getCollectionCollaborators(collectionId);

        if (!cancelled) {
          setCollection(loadedCollection);
          setCollaborators(loadedCollaborators);
          setIsOwner(true);
        }
      } catch (error) {
        console.error("Could not load sharing settings:", error);

        if (!cancelled) {
          alert("Couldn't load sharing settings.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSharePage();

    return () => {
      cancelled = true;
    };
  }, [collectionId]);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || !isOwner) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const profiles =
          await searchProfilesForCollectionSharing(
            trimmedQuery
          );

        if (!cancelled) {
          setResults(profiles);
        }
      } catch (error) {
        console.error(
          "Could not search profiles for sharing:",
          error
        );

        if (!cancelled) {
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isOwner, query]);

  const collaboratorIds = useMemo(
    () => new Set(collaborators.map((item) => item.userId)),
    [collaborators]
  );

  const visibleResults = results.filter(
    (profile) =>
      profile.id !== collection?.userId &&
      !collaboratorIds.has(profile.id)
  );

  function setUserBusy(userId: string, busy: boolean) {
    setBusyUserIds((current) => {
      const updated = new Set(current);

      if (busy) {
        updated.add(userId);
      } else {
        updated.delete(userId);
      }

      return updated;
    });
  }

  async function handleAdd(
    profile: CollectionShareProfile,
    role: CollectionShareRole
  ) {
    if (busyUserIds.has(profile.id)) {
      return;
    }

    setUserBusy(profile.id, true);

    try {
      await addCollectionCollaborator(
        collectionId,
        profile.id,
        role
      );

      setCollaborators((current) => [
        ...current,
        {
          userId: profile.id,
          username: profile.username,
          profilePictureUrl: profile.profilePictureUrl,
          role,
          createdAt: new Date().toISOString(),
        },
      ]);

      setQuery("");
      setResults([]);
    } catch (error) {
      console.error("Could not share collection:", error);
      alert("Couldn't share the collection with this person.");
    } finally {
      setUserBusy(profile.id, false);
    }
  }

  async function handleRoleChange(
    collaborator: CollectionCollaborator,
    role: CollectionShareRole
  ) {
    if (
      busyUserIds.has(collaborator.userId) ||
      collaborator.role === role
    ) {
      return;
    }

    const oldRole = collaborator.role;
    setUserBusy(collaborator.userId, true);

    setCollaborators((current) =>
      current.map((item) =>
        item.userId === collaborator.userId
          ? { ...item, role }
          : item
      )
    );

    try {
      await updateCollectionCollaboratorRole(
        collectionId,
        collaborator.userId,
        role
      );
    } catch (error) {
      console.error(
        "Could not update collection permission:",
        error
      );
      setCollaborators((current) =>
        current.map((item) =>
          item.userId === collaborator.userId
            ? { ...item, role: oldRole }
            : item
        )
      );
      alert("Couldn't update this person's permission.");
    } finally {
      setUserBusy(collaborator.userId, false);
    }
  }

  async function handleRemove(
    collaborator: CollectionCollaborator
  ) {
    if (busyUserIds.has(collaborator.userId)) {
      return;
    }

    const confirmed = window.confirm(
      `Remove @${collaborator.username}'s access?`
    );

    if (!confirmed) {
      return;
    }

    setUserBusy(collaborator.userId, true);

    try {
      await removeCollectionCollaborator(
        collectionId,
        collaborator.userId
      );
      setCollaborators((current) =>
        current.filter(
          (item) => item.userId !== collaborator.userId
        )
      );
    } catch (error) {
      console.error("Could not remove collaborator:", error);
      alert("Couldn't remove this person's access.");
    } finally {
      setUserBusy(collaborator.userId, false);
    }
  }

  async function handleCopyLink() {
    try {
      const url = `${window.location.origin}/profile/collections/${collectionId}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error("Could not copy collection link:", error);
      alert("Couldn't copy the link.");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white dark:bg-neutral-950 px-5 py-8 text-sm text-neutral-500">
        Loading...
      </main>
    );
  }

  if (!collection || !isOwner) {
    return (
      <main className="min-h-screen bg-white dark:bg-neutral-950 px-5 pt-6">
        <BackHeader title="Share collection" />

        <div className="mt-12 rounded-3xl bg-neutral-50 dark:bg-neutral-900 px-6 py-12 text-center">
          <Lock
            size={28}
            className="mx-auto text-neutral-400"
          />
          <h1 className="mt-3 text-base font-semibold text-neutral-900 dark:text-neutral-50">
            Owner access required
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Only the collection owner can manage sharing.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-neutral-950 px-5 pt-6 pb-[var(--bottom-nav-height)]">
      <BackHeader title="Share collection" />

      <section className="mt-6 rounded-3xl bg-neutral-50 p-4 dark:bg-neutral-900">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {collection.isPublic ? (
              <Globe2 size={19} />
            ) : (
              <Lock size={19} />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">
              {collection.name}
            </h2>
            <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
              {collection.isPublic
                ? "Everyone can view this public collection. People added below still receive an explicit viewer or editor role."
                : "Only you and the people added below can open this private collection."}
            </p>
          </div>
        </div>

        <button
          onClick={() => void handleCopyLink()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100"
        >
          {copied ? <Check size={17} /> : <Copy size={17} />}
          {copied ? "Link copied" : "Copy collection link"}
        </button>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          Add people
        </h2>

        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-3 dark:bg-neutral-900">
          <Search
            size={18}
            className="shrink-0 text-neutral-400"
          />
          <input
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
            placeholder="Search by username"
            className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-50"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="text-neutral-400"
            >
              <X size={17} />
            </button>
          )}
        </div>

        {query.trim() && (
          <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-100 dark:border-neutral-800">
            {searching ? (
              <div className="px-4 py-5 text-center text-sm text-neutral-400">
                Searching...
              </div>
            ) : visibleResults.length === 0 ? (
              <div className="px-4 py-5 text-center text-sm text-neutral-400">
                No available users found.
              </div>
            ) : (
              visibleResults.map((profile, index) => (
                <div
                  key={profile.id}
                  className={`flex items-center gap-3 px-3 py-3 ${
                    index > 0
                      ? "border-t border-neutral-100 dark:border-neutral-800"
                      : ""
                  }`}
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    {profile.profilePictureUrl ? (
                      <Image
                        src={profile.profilePictureUrl}
                        alt={`@${profile.username}`}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <User
                          size={19}
                          className="text-neutral-400"
                        />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                      @{profile.username}
                    </p>
                    {profile.bio && (
                      <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {profile.bio}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() =>
                        void handleAdd(profile, "viewer")
                      }
                      disabled={busyUserIds.has(profile.id)}
                      className="rounded-full bg-neutral-100 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-700 disabled:opacity-60 dark:bg-neutral-800 dark:text-neutral-200"
                    >
                      Viewer
                    </button>
                    <button
                      onClick={() =>
                        void handleAdd(profile, "editor")
                      }
                      disabled={busyUserIds.has(profile.id)}
                      className="rounded-full bg-neutral-900 px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-60 dark:bg-neutral-50 dark:text-neutral-950"
                    >
                      Editor
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      <section className="mt-9">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
          People with access
        </h2>

        <div className="mt-3 overflow-hidden rounded-2xl bg-neutral-50 dark:bg-neutral-900">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-800">
              <User
                size={19}
                className="text-neutral-500 dark:text-neutral-300"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                You
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Owner
              </p>
            </div>
          </div>

          {collaborators.map((collaborator) => (
            <div
              key={collaborator.userId}
              className="flex items-center gap-3 border-t border-neutral-200 px-4 py-3.5 dark:border-neutral-800"
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                {collaborator.profilePictureUrl ? (
                  <Image
                    src={collaborator.profilePictureUrl}
                    alt={`@${collaborator.username}`}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <User
                      size={19}
                      className="text-neutral-500 dark:text-neutral-300"
                    />
                  </div>
                )}
              </div>

              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                @{collaborator.username}
              </p>

              <select
                value={collaborator.role}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  void handleRoleChange(
                    collaborator,
                    event.target.value as CollectionShareRole
                  )
                }
                disabled={busyUserIds.has(collaborator.userId)}
                className="rounded-full border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 outline-none disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>

              <button
                onClick={() => void handleRemove(collaborator)}
                disabled={busyUserIds.has(collaborator.userId)}
                aria-label={`Remove @${collaborator.username}`}
                className="flex h-8 w-8 items-center justify-center rounded-full text-red-500 disabled:opacity-60"
              >
                <X size={17} />
              </button>
            </div>
          ))}

          {collaborators.length === 0 && (
            <p className="border-t border-neutral-200 px-4 py-5 text-center text-sm text-neutral-400 dark:border-neutral-800">
              No one else has access yet.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
