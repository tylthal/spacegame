
import { useEffect, useRef } from 'react';

interface WebcamPreviewProps {
    onStreamReady: (video: HTMLVideoElement) => void;
    onError?: (err: Error) => void;
}

export function WebcamPreview({ onStreamReady, onError }: WebcamPreviewProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;

        async function setupCamera() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: 'user',
                    },
                    audio: false,
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        if (videoRef.current) {
                            videoRef.current.play();
                            onStreamReady(videoRef.current);
                        }
                    };
                }
            } catch (err) {
                console.error('Camera access denied:', err);
                onError?.(err instanceof Error ? err : new Error('Camera access denied'));
            }
        }

        setupCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
        };
    }, [onStreamReady, onError]);

    // Hidden video element OR visible for calibration/debugging
    return (
        <div className="relative w-full h-full overflow-hidden rounded-lg bg-slate-950">
            {/* Mirror the video for natural interaction */}
            <video
                ref={videoRef}
                className="w-full h-full object-cover scale-x-[-1]"
                playsInline
                muted
            />
        </div>
    );
}
