"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, Music, X } from "lucide-react";
import { saveLocalPost, type MusicTrack } from "@/lib/localPosts";

type ITunesSong = {
    trackName?: string;
    artistName?: string;
    previewUrl?: string;
    artworkUrl100?: string;
    trackId?: number;
};

export default function CreatePage() {
    const router = useRouter();

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [cameraOn, setCameraOn] = useState(false);
    const [cameraError, setCameraError] = useState("");
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [editingPost, setEditingPost] = useState(false);

    const [caption, setCaption] = useState("");
    const [tagsText, setTagsText] = useState("");
    const [musicSearch, setMusicSearch] = useState("");
    const [songResults, setSongResults] = useState<MusicTrack[]>([]);
    const [selectedSong, setSelectedSong] = useState<MusicTrack | null>(null);
    const [searchingMusic, setSearchingMusic] = useState(false);

    async function turnCameraOn() {
        try {
            setCameraError("");

            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false,
            });

            streamRef.current = stream;
            setCameraOn(true);
        } catch (error) {
            console.error(error);
            setCameraError("Camera access was blocked or unavailable.");
        }
    }

    function turnCameraOff() {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setCameraOn(false);
    }

    function toggleCamera() {
        if (cameraOn) {
            turnCameraOff();
        } else {
            turnCameraOn();
        }
    }

    function takePicture() {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext("2d");
        if (!context) return;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = canvas.toDataURL("image/jpeg", 0.85);
        setCapturedPhoto(imageData);
    }

    function retakePhoto() {
        setCapturedPhoto(null);
        setEditingPost(false);
        setCaption("");
        setTagsText("");
        setMusicSearch("");
        setSongResults([]);
        setSelectedSong(null);
    }

    function usePhoto() {
        setEditingPost(true);
        turnCameraOff();
    }

    async function searchSongs() {
        const query = musicSearch.trim();
        if (!query) return;

        try {
            setSearchingMusic(true);

            const response = await fetch(
                `https://itunes.apple.com/search?term=${encodeURIComponent(
                    query
                )}&media=music&entity=song&limit=8`
            );

            const data = await response.json();

            const songs: MusicTrack[] = data.results
                .filter(
                    (song: ITunesSong) =>
                        song.trackName && song.artistName && song.previewUrl
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

    function postPhoto() {
        if (!capturedPhoto) return;

        const savedUsername = localStorage.getItem("username") || "you";

        const tags = tagsText
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean);

        const success = saveLocalPost({
            id: crypto.randomUUID(),
            username: savedUsername,
            timeAgo: "now",
            caption: caption.trim() || "new fit",
            tags,
            likes: 0,
            comments: 0,
            imageUrl: capturedPhoto,
            music: selectedSong ?? undefined,
        });

        if (success) {
            router.push("/");
        } else {
            alert(
                "Couldn't save your post - storage might be full. Try a smaller photo or clear some old posts."
            );
        }
    }

    useEffect(() => {
        if (cameraOn && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.play();
        }
    }, [cameraOn]);

    useEffect(() => {
        return () => {
            turnCameraOff();
        };
    }, []);

    const showVideo = cameraOn && !capturedPhoto;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950">
            <div className="flex items-center justify-between px-5 pt-5">
                <button
                    onClick={() => {
                        turnCameraOff();
                        router.back();
                    }}
                    aria-label="Close"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
                >
                    <X size={18} className="text-white" />
                </button>

                {!capturedPhoto && (
                    <button
                        onClick={toggleCamera}
                        aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
                    >
                        {cameraOn ? (
                            <Camera size={18} className="text-white" />
                        ) : (
                            <CameraOff size={18} className="text-white" />
                        )}
                    </button>
                )}
            </div>

            <div className="flex flex-1 flex-col items-center overflow-y-auto px-5 py-3">
                <div className="relative mt-4 flex aspect-[4/5] w-full max-w-[440px] shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-neutral-900">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`h-full w-full object-cover ${showVideo ? "block" : "hidden"
                            }`}
                    />

                    {capturedPhoto && (
                        <img
                            src={capturedPhoto}
                            alt="Captured"
                            className="absolute inset-0 h-full w-full object-cover"
                        />
                    )}

                    {!cameraOn && !capturedPhoto && (
                        <div className="flex flex-col items-center">
                            <Camera size={32} className="text-white/25" />
                            <p className="mt-3 text-sm text-white/40">
                                Camera is off
                            </p>
                        </div>
                    )}
                </div>

                <canvas ref={canvasRef} className="hidden" />

                {cameraError && (
                    <p className="mt-3 text-center text-sm text-red-400">
                        {cameraError}
                    </p>
                )}

                {editingPost && (
                    <div className="mt-5 w-full max-w-[440px] space-y-4 pb-8">
                        <textarea
                            value={caption}
                            onChange={(event) => setCaption(event.target.value)}
                            placeholder="Write a caption..."
                            className="min-h-24 w-full resize-none rounded-2xl bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40"
                        />

                        <input
                            value={tagsText}
                            onChange={(event) => setTagsText(event.target.value)}
                            placeholder="Add tags separated by commas, like Ralph Lauren, COS, Clarks"
                            className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40"
                        />

                        <div className="rounded-2xl bg-white/10 p-4">
                            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                                <Music size={16} />
                                Add music
                            </div>

                            <div className="flex gap-2">
                                <input
                                    value={musicSearch}
                                    onChange={(event) =>
                                        setMusicSearch(event.target.value)
                                    }
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            searchSongs();
                                        }
                                    }}
                                    placeholder="Search a real song..."
                                    className="min-w-0 flex-1 rounded-xl bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40"
                                />

                                <button
                                    onClick={searchSongs}
                                    disabled={searchingMusic || !musicSearch.trim()}
                                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-50"
                                >
                                    {searchingMusic ? "..." : "Search"}
                                </button>
                            </div>

                            {songResults.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {songResults.map((song) => (
                                        <button
                                            key={`${song.title}-${song.artist}-${song.previewUrl}`}
                                            onClick={() => setSelectedSong(song)}
                                            className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/10 px-3 py-2 text-left"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                {song.artworkUrl && (
                                                    <img
                                                        src={song.artworkUrl}
                                                        alt=""
                                                        className="h-10 w-10 rounded-lg object-cover"
                                                    />
                                                )}

                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm font-medium text-white">
                                                        {song.title}
                                                    </span>
                                                    <span className="block truncate text-xs text-white/50">
                                                        {song.artist}
                                                    </span>
                                                </span>
                                            </div>

                                            <span className="shrink-0 text-xs text-white/60">
                                                {selectedSong?.previewUrl === song.previewUrl
                                                    ? "Selected"
                                                    : "Add"}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedSong && (
                                <div className="mt-3 flex items-center gap-3 rounded-xl bg-black/30 p-3 text-sm text-white">
                                    {selectedSong.artworkUrl && (
                                        <img
                                            src={selectedSong.artworkUrl}
                                            alt=""
                                            className="h-10 w-10 rounded-lg object-cover"
                                        />
                                    )}

                                    <div className="min-w-0">
                                        <p className="truncate font-semibold">
                                            {selectedSong.title}
                                        </p>
                                        <p className="truncate text-xs text-white/50">
                                            {selectedSong.artist}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center justify-center pb-10">
                {capturedPhoto ? (
                    <div className="flex items-center gap-6">
                        <button
                            onClick={retakePhoto}
                            className="rounded-full bg-white/10 px-5 py-3 text-sm font-medium text-white"
                        >
                            Retake
                        </button>

                        {editingPost ? (
                            <button
                                onClick={postPhoto}
                                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-neutral-900"
                            >
                                Post
                            </button>
                        ) : (
                            <button
                                onClick={usePhoto}
                                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-neutral-900"
                            >
                                Use Photo
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <button
                            onClick={takePicture}
                            aria-label="Take picture"
                            disabled={!cameraOn}
                            className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-[3px] border-white disabled:border-white/30"
                        >
                            <span className="h-[54px] w-[54px] rounded-full bg-white" />
                        </button>

                        <p className="mt-4 text-xs text-white/40">
                            {cameraOn
                                ? "Camera on"
                                : "Tap the camera icon to turn it on"}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}