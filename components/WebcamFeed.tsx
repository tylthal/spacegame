import React, { useEffect } from 'react';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement>;
  onPermissionGranted?: () => void;
  onError?: (error: CameraError) => void;
}

export type CameraErrorCode =
  | 'NO_DEVICES'
  | 'PERMISSION_DENIED'
  | 'DEVICE_IN_USE'
  | 'DEVICE_LOST'
  | 'UNSUPPORTED'
  | 'UNKNOWN';

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

/**
 * WebcamFeed Component
 * Requests and manages the user's camera stream.
 * Optimized for computer vision tasks with low-resolution and specific frame rate.
 */
const WebcamFeed: React.FC<Props> = ({ videoRef, onPermissionGranted, onError }) => {
  useEffect(() => {
    let active = true;
    let currentStream: MediaStream | null = null;
    let currentDeviceId: string | null = null;

    const stopCurrentStream = () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
      }
    };

    const getVideoInputs = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    };

    const startCamera = async (targetDeviceId?: string) => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw createCameraError('UNSUPPORTED', 'Camera API unavailable in this browser.');
        }

        const videoInputs = await getVideoInputs();
        if (videoInputs.length === 0) {
          throw createCameraError('NO_DEVICES', 'No camera detected. Connect a device and try again.');
        }

        const preferredDevice =
          videoInputs.find(device => device.deviceId === targetDeviceId) ??
          videoInputs.find(device => device.label.toLowerCase().includes('front')) ??
          videoInputs[0];

        /**
         * Vision Optimization:
         * 320x240 is used to reduce data transfer to the GPU and inference time.
         * Higher resolutions significantly impact "Neural FPS" without increasing tracking accuracy.
         */
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: preferredDevice.deviceId ? { exact: preferredDevice.deviceId } : undefined,
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

        stopCurrentStream();
        currentStream = stream;
        currentDeviceId = preferredDevice.deviceId;

        stream.getTracks().forEach(track => {
          track.onended = () => {
            if (!active) return;
            const deviceLostError = createCameraError('DEVICE_LOST', 'Camera disconnected during capture.');
            onError?.(deviceLostError);
          };
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        onPermissionGranted?.();
      } catch (err) {
        console.error('Neural Uplink Error (Camera Access):', err);
        if (err instanceof DOMException) {
          switch (err.name) {
            case 'NotAllowedError':
            case 'SecurityError':
              onError?.(createCameraError('PERMISSION_DENIED', 'Camera permission denied. Enable access to continue.', err));
              return;
            case 'NotFoundError':
              onError?.(createCameraError('NO_DEVICES', 'No camera detected. Connect a device and try again.', err));
              return;
            case 'NotReadableError':
              onError?.(createCameraError('DEVICE_IN_USE', 'Camera is in use by another application.', err));
              return;
            case 'AbortError':
              onError?.(createCameraError('DEVICE_LOST', 'Camera disconnected during capture.', err));
              return;
            default:
              onError?.(createCameraError('UNKNOWN', err.message, err));
              return;
          }
        }
        onError?.(createCameraError('UNKNOWN', 'Unable to access camera. Verify permissions and hardware.', err));
      }
    };

    const handleDeviceChange = async () => {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      try {
        const videoInputs = await getVideoInputs();
        if (videoInputs.length === 0) {
          stopCurrentStream();
          onError?.(createCameraError('NO_DEVICES', 'No camera detected. Connect a device and try again.'));
          return;
        }

        const activeDeviceAvailable = currentDeviceId
          ? videoInputs.some(device => device.deviceId === currentDeviceId)
          : false;

        if (!activeDeviceAvailable) {
          await startCamera(videoInputs[0]?.deviceId);
        }
      } catch (err) {
        console.error('Camera device change handling failed:', err);
      }
    };

    startCamera();
    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);

    return () => {
      active = false;
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
      stopCurrentStream();
      // Cleanup: Stop all tracks on unmount
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [onError, onPermissionGranted, videoRef]);

  // scale-x-[-1] mirrors the feed for intuitive human movement matching
  return <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" playsInline muted />;
};

export default WebcamFeed;
