import React, { useEffect } from 'react';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement>;
  onPermissionGranted?: () => void;
  onStreamReady?: (stream: MediaStream | null) => void;
  onError?: (error: CameraError) => void;
  accessRequestToken?: number;
}

export type CameraErrorCode = 'PERMISSION_DENIED' | 'NO_DEVICES' | 'UNKNOWN';

export interface CameraError extends Error {
  code: CameraErrorCode;
  cause?: unknown;
}

const createCameraError = (code: CameraErrorCode, message: string, cause?: unknown): CameraError => {
  const error = new Error(message) as CameraError;
  error.name = 'CameraError';
  error.code = code;
  if (cause) {
    error.cause = cause;
  }
  return error;
};

const stopStreamTracks = (stream: MediaStream | null) => {
  stream?.getTracks().forEach(track => track.stop());
};

/**
 * WebcamFeed Component
 * Requests and manages the user's camera stream.
 */
const WebcamFeed: React.FC<Props> = ({ videoRef, onPermissionGranted, onStreamReady, onError, accessRequestToken }) => {
  useEffect(() => {
    if (!accessRequestToken) return undefined;

    let cancelled = false;
    let currentStream: MediaStream | null = null;

    const requestCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

        if (cancelled) {
          stopStreamTracks(stream);
          return;
        }

        currentStream = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        onStreamReady?.(stream);
        onPermissionGranted?.();
      } catch (err) {
        let cameraError: CameraError;

        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          cameraError = createCameraError('PERMISSION_DENIED', 'Camera permission denied. Enable access to continue.', err);
        } else if (err instanceof DOMException && err.name === 'NotFoundError') {
          cameraError = createCameraError('NO_DEVICES', 'No camera detected. Connect a device and try again.', err);
        } else {
          cameraError = createCameraError('UNKNOWN', 'Unable to access camera. Verify permissions and hardware.', err);
        }

        onError?.(cameraError);
      }
    };

    requestCamera();

    return () => {
      cancelled = true;
      onStreamReady?.(null);
      stopStreamTracks(currentStream);
      if (videoRef.current?.srcObject) {
        stopStreamTracks(videoRef.current.srcObject as MediaStream);
        videoRef.current.srcObject = null;
      }
    };
  }, [accessRequestToken, onPermissionGranted, onStreamReady, onError, videoRef]);

  // scale-x-[-1] mirrors the feed for intuitive human movement matching
  return (
    <video
      ref={videoRef}
      className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
      autoPlay
      playsInline
      muted
    />
  );
};

export default WebcamFeed;
