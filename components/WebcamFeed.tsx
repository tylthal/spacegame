import React, { useEffect } from 'react';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement>;
  onPermissionGranted?: () => void;
  onPermissionDenied?: (error: unknown) => void;
}

/**
 * WebcamFeed Component
 * Requests and manages the user's camera stream.
 * Optimized for computer vision tasks with low-resolution and specific frame rate.
 */
const WebcamFeed: React.FC<Props> = ({ videoRef, onPermissionGranted, onPermissionDenied }) => {
  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API unavailable in this browser.');
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideoInput = devices.some(device => device.kind === 'videoinput');
        if (!hasVideoInput) {
          throw new Error('Requested device not found. Connect a camera or check system permissions.');
        }

        /**
         * Vision Optimization:
         * 320x240 is used to reduce data transfer to the GPU and inference time.
         * Higher resolutions significantly impact "Neural FPS" without increasing tracking accuracy.
         */
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 320 },
            height: { ideal: 240 },
            frameRate: { ideal: 30 }
          },
          audio: false
        });

        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        onPermissionGranted?.();
      } catch (err) {
        console.error('Neural Uplink Error (Camera Access):', err);
        onPermissionDenied?.(err);
      }
    }

    startCamera();
    return () => {
      active = false;
      // Cleanup: Stop all tracks on unmount
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [onPermissionDenied, onPermissionGranted, videoRef]);

  // scale-x-[-1] mirrors the feed for intuitive human movement matching
  return <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" playsInline muted />;
};

export default WebcamFeed;