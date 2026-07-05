"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CameraOff, X } from "lucide-react";

export default function CreatePage() {
    const router = useRouter();

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [cameraOn, setCameraOn] = useState(false);
    const [cameraError, setCameraError] = useState("");

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
            </div>

            <div className="flex flex-1 flex-col items-center justify-center px-5 py-3">
                <div className="flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-neutral-900">
                    {cameraOn ? (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex flex-col items-center">
                            <Camera size={32} className="text-white/25" />
                            <p className="mt-3 text-sm text-white/40">Camera is off</p>
                        </div>
                    )}
                </div>

                {cameraError && (
                    <p className="mt-3 text-center text-sm text-red-400">
                        {cameraError}
                    </p>
                )}
            </div>

            <div className="flex flex-col items-center justify-center pb-10">
                <button
                    aria-label="Take picture"
                    disabled={!cameraOn}
                    className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-[3px] border-white disabled:border-white/30"
                >
                    <span className="h-[54px] w-[54px] rounded-full bg-white" />
                </button>

                <p className="mt-4 text-xs text-white/40">
                    {cameraOn ? "Camera on" : "Tap the camera icon to turn it on"}
                </p>
            </div>
        </div>
    );
}