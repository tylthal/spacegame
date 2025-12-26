
import { useEffect, useRef } from 'react';

interface WebcamPreviewProps {
    onStreamReady: (video: HTMLVideoElement) => void;
    onError?: (err: Error) => void;
}

export function WebcamPreview({ onStreamReady, onError }: WebcamPreviewProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Use refs for callbacks to avoid re-running useEffect on callback changes
    const onStreamReadyRef = useRef(onStreamReady);
    const onErrorRef = useRef(onError);

    // Keep refs in sync with props
    useEffect(() => {
        onStreamReadyRef.current = onStreamReady;
        onErrorRef.current = onError;
    });

    useEffect(() => {
        let stream: MediaStream | null = null;
        let isMounted = true;

        async function setupCamera() {
            try {
                // P1 Optimization: Lower resolution for faster MediaPipe processing
                // 640x480 = 6.75× fewer pixels than 1080p, still accurate for hand tracking
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: 'user',
                    },
                    audio: false,
                });

                if (videoRef.current && isMounted) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        if (videoRef.current && isMounted) {
                            videoRef.current.play();
                            onStreamReadyRef.current(videoRef.current);
                        }
                    };
                }
            } catch (err) {
                console.error('Camera access denied:', err);
                onErrorRef.current?.(err instanceof Error ? err : new Error('Camera access denied'));
            }
        }

        setupCamera();

        return () => {
            isMounted = false;
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, []); // Empty deps - only run on mount

    // Hidden video element OR visible for calibration/debugging
    return (
        <div className="relative w-full h-full overflow-hidden rounded-lg bg-slate-950">
            {/* Mirror the video for natural interaction - Semi-transparent to see gameplay behind */}
            <video
                ref={videoRef}
                className="w-full h-full object-cover scale-x-[-1] contrast-[1.3] brightness-110 saturate-[1.2] opacity-60"
                playsInline
                muted
            />
        </div>
    );
}

