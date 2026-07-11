"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Music, Trash2 } from "lucide-react";
import {
    getPostById,
    updatePost,
    type LocalPost,
    type MusicTrack,
} from "@/lib/localPosts";
import { BackHeader } from "@/components/BackHeader";

type ITunesSong = {
    trackName?: string;
    artistName?: string;
    previewUrl?: string;
    artworkUrl100?: string;
};

export default function EditPostPage() {
    const router = useRouter();
    const params = useParams();
    const postId = params.postId as string;

    const [post, setPost] = useState<LocalPost | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [saving, setSaving] = useState(false);

    const [caption, setCaption] = useState("");
    const [tagsText, setTagsText] = useState("");
    const [musicSearch, setMusicSearch] = useState("");
    const [songResults, setSongResults] = useState<MusicTrack[]>(
        []
    );

    const [selectedSong, setSelectedSong] =
        useState<MusicTrack | null>(null);

    const [searchingMusic, setSearchingMusic] =
        useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadPost() {
            try {
                setNotFound(false);

                const found = await getPostById(postId);

                if (cancelled) {
                    return;
                }

                if (!found) {
                    setNotFound(true);
                    return;
                }

                setPost(found);
                setCaption(found.caption);
                setTagsText(found.tags.join(", "));
                setSelectedSong(found.music ?? null);
            } catch (error) {
                console.error("Could not load post:", error);

                if (!cancelled) {
                    setNotFound(true);
                }
            }
        }

        void loadPost();

        return () => {
            cancelled = true;
        };
    }, [postId]);

    async function searchSongs() {
        const query = musicSearch.trim();

        if (!query) {
            return;
        }

        try {
            setSearchingMusic(true);

            const response = await fetch(
                `https://itunes.apple.com/search?term=${encodeURIComponent(
                    query
                )}&media=music&entity=song&limit=8`
            );

            if (!response.ok) {
                throw new Error("Music search failed.");
            }

            const data = await response.json();

            const songs: MusicTrack[] = data.results
                .filter(
                    (song: ITunesSong) =>
                        song.trackName &&
                        song.artistName &&
                        song.previewUrl
                )
                .map((song: ITunesSong) => ({
                    title: song.trackName as string,
                    artist: song.artistName as string,
                    previewUrl: song.previewUrl as string,
                    artworkUrl: song.artworkUrl100,
                }));

            setSongResults(songs);
        } catch (error) {
            console.error(error);
            setSongResults([]);
        } finally {
            setSearchingMusic(false);
        }
    }

    async function handleSave() {
        if (!post || saving) {
            return;
        }

        const tags = tagsText
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean);

        try {
            setSaving(true);

            await updatePost(post.id, {
                caption,
                tags,
                music: selectedSong,
            });

            router.push(`/profile/post/${post.id}`);
            router.refresh();
        } catch (error) {
            console.error("Could not update post:", error);

            alert(
                error instanceof Error
                    ? error.message
                    : "Could not save your changes."
            );
        } finally {
            setSaving(false);
        }
    }

    if (notFound) {
        return (
            <main className="min-h-screen bg-white px-5 pt-6 pb-[var(--bottom-nav-height)]">
                <BackHeader title="Edit post" />

                <div className="flex h-60 items-center justify-center">
                    <p className="text-sm text-neutral-400">
                        Post not found
                    </p>
                </div>
            </main>
        );
    }

    if (!post) {
        return (
            <main className="min-h-screen bg-white px-5 pt-6 pb-[var(--bottom-nav-height)]">
                <div className="flex h-60 items-center justify-center">
                    <p className="text-sm text-neutral-400">
                        Loading...
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-white px-5 pt-6 pb-[var(--bottom-nav-height)]">
            <BackHeader title="Edit post" />

            <div className="mt-4 flex justify-center">
                <div className="aspect-[4/5] w-full max-w-[280px] overflow-hidden rounded-2xl bg-neutral-100">
                    {post.imageUrl && (
                        <img
                            src={post.imageUrl}
                            alt="Post"
                            className="h-full w-full object-cover"
                        />
                    )}
                </div>
            </div>

            <div className="mt-5 space-y-4">
                <textarea
                    value={caption}
                    onChange={(event) =>
                        setCaption(event.target.value)
                    }
                    placeholder="Write a caption..."
                    className="min-h-24 w-full resize-none rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                />

                <input
                    value={tagsText}
                    onChange={(event) =>
                        setTagsText(event.target.value)
                    }
                    placeholder="Add tags separated by commas"
                    className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-400"
                />

                <div className="rounded-2xl bg-neutral-50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-900">
                        <Music size={16} />
                        Music
                    </div>

                    {selectedSong && (
                        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-white p-3">
                            <div className="flex min-w-0 items-center gap-3">
                                {selectedSong.artworkUrl && (
                                    <img
                                        src={selectedSong.artworkUrl}
                                        alt=""
                                        className="h-10 w-10 rounded-lg object-cover"
                                    />
                                )}

                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-neutral-900">
                                        {selectedSong.title}
                                    </p>

                                    <p className="truncate text-xs text-neutral-500">
                                        {selectedSong.artist}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() =>
                                    setSelectedSong(null)
                                }
                                aria-label="Remove music"
                                className="shrink-0 rounded-full bg-neutral-100 p-2"
                            >
                                <Trash2
                                    size={15}
                                    className="text-red-500"
                                />
                            </button>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <input
                            value={musicSearch}
                            onChange={(event) =>
                                setMusicSearch(
                                    event.target.value
                                )
                            }
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault();
                                    void searchSongs();
                                }
                            }}
                            placeholder="Search a song..."
                            className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
                        />

                        <button
                            onClick={() => void searchSongs()}
                            disabled={
                                searchingMusic ||
                                !musicSearch.trim()
                            }
                            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {searchingMusic ? "..." : "Search"}
                        </button>
                    </div>

                    {songResults.length > 0 && (
                        <div className="mt-3 space-y-2">
                            {songResults.map((song) => (
                                <button
                                    key={`${song.title}-${song.artist}-${song.previewUrl}`}
                                    onClick={() =>
                                        setSelectedSong(song)
                                    }
                                    className="flex w-full items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-left"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        {song.artworkUrl && (
                                            <img
                                                src={
                                                    song.artworkUrl
                                                }
                                                alt=""
                                                className="h-10 w-10 rounded-lg object-cover"
                                            />
                                        )}

                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-medium text-neutral-900">
                                                {song.title}
                                            </span>

                                            <span className="block truncate text-xs text-neutral-500">
                                                {song.artist}
                                            </span>
                                        </span>
                                    </div>

                                    <span className="shrink-0 text-xs text-neutral-500">
                                        {selectedSong?.previewUrl ===
                                            song.previewUrl
                                            ? "Selected"
                                            : "Add"}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="w-full rounded-full bg-neutral-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Save changes"}
                </button>
            </div>
        </main>
    );
}