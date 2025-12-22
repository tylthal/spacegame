import React, { useEffect } from 'react';
import { mediaPreflightCheck, type MediaPreflightResult } from '../utils/deviceDiagnostics';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement>;
  onPermissionGranted?: () => void;
  onError?: (error: CameraError) => void;
  onDiagnostics?: (info: CameraDiagnostics) => void;
  accessRequestToken?: number;
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

export interface CameraDiagnostics {
  event: 'preflight' | 'request' | 'acquired' | 'devicechange' | 'error';
  deviceLabel?: string;
  deviceId?: string;
  constraints?: MediaStreamConstraints;
  appliedSettings?: MediaTrackSettings;
  preflightDetails?: MediaPreflightResult['details'];
  errorName?: string;
  message?: string;
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
const WebcamFeed: React.FC<Props> = ({
  videoRef,
  onPermissionGranted,
  onError,
  onDiagnostics,
  accessRequestToken,
}) => {
  useEffect(() => {
    if (!accessRequestToken) return;

    let active = true;
    let currentStream: MediaStream | null = null;
    let currentDeviceId: string | null = null;
    let lastConstraints: MediaStreamConstraints | null = null;
    let lastDeviceLabel: string | undefined;
    let lastDeviceId: string | undefined;
    let permissionProbeStream: MediaStream | null = null;

    const stopCurrentStream = (includeProbe = false) => {
      if (currentStream) {
        if (includeProbe || currentStream !== permissionProbeStream) {
          currentStream.getTracks().forEach(track => track.stop());
        }
        currentStream = null;
      }

      if (includeProbe && permissionProbeStream) {
        permissionProbeStream.getTracks().forEach(track => track.stop());
        permissionProbeStream = null;
      }
    };

    const getVideoInputs = async () => {
      let devices = await navigator.mediaDevices.enumerateDevices();
      let videoInputs = devices.filter(device => device.kind === 'videoinput');

      if (videoInputs.length === 0 && navigator.mediaDevices?.getUserMedia) {
        try {
          if (!permissionProbeStream) {
            permissionProbeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          }
          devices = await navigator.mediaDevices.enumerateDevices();
          videoInputs = devices.filter(device => device.kind === 'videoinput');
        } catch (probeError) {
          if (probeError instanceof DOMException && (probeError.name === 'NotAllowedError' || probeError.name === 'SecurityError')) {
            throw createCameraError(
              'PERMISSION_DENIED',
              'Camera permission denied. Enable access to continue.',
              probeError,
            );
          }
          throw probeError;
        }
      }

      return videoInputs;
    };

    const applyPreferredConstraints = async (stream: MediaStream, constraints: MediaStreamConstraints) => {
      if (!constraints.video || typeof constraints.video !== 'object') return;
      const [videoTrack] = stream.getVideoTracks();
      if (videoTrack) {
        await videoTrack.applyConstraints(constraints.video as MediaTrackConstraints);
      }
    };

    const startCamera = async (targetDeviceId?: string, allowFallbackRetry = true) => {
      try {
        const preflight = mediaPreflightCheck();
        onDiagnostics?.({
          event: 'preflight',
          deviceLabel: lastDeviceLabel,
          deviceId: lastDeviceId,
          constraints: lastConstraints ?? undefined,
          preflightDetails: preflight.details,
          message: preflight.ok ? 'Preflight passed' : preflight.issues.join(' '),
        });

        if (!preflight.ok) {
          const preflightError = createCameraError('UNSUPPORTED', preflight.issues.join(' '));
          onDiagnostics?.({
            event: 'error',
            deviceLabel: lastDeviceLabel,
            deviceId: lastDeviceId,
            constraints: lastConstraints ?? undefined,
            preflightDetails: preflight.details,
            errorName: 'PreflightFailed',
            message: preflightError.message,
          });
          onError?.(preflightError);
          return;
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
        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: preferredDevice.deviceId ? { exact: preferredDevice.deviceId } : undefined,
            width: { ideal: 320 },
            height: { ideal: 240 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        };

        lastConstraints = constraints;
        lastDeviceLabel = preferredDevice.label;
        lastDeviceId = preferredDevice.deviceId;
        console.info('[CameraDiagnostics] Requesting camera', {
          label: preferredDevice.label || 'Unknown device',
          deviceId: preferredDevice.deviceId || 'unknown',
          constraints,
        });
        onDiagnostics?.({
          event: 'request',
          deviceLabel: preferredDevice.label,
          deviceId: preferredDevice.deviceId,
          constraints,
        });

        let stream: MediaStream;

        if (permissionProbeStream) {
          const probeSettings = permissionProbeStream.getVideoTracks()[0]?.getSettings();
          const deviceMatches =
            !preferredDevice.deviceId || probeSettings?.deviceId === preferredDevice.deviceId || !probeSettings?.deviceId;

          if (deviceMatches) {
            await applyPreferredConstraints(permissionProbeStream, constraints);
            stream = permissionProbeStream;
          } else {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            permissionProbeStream = stream;
          }
        } else {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          permissionProbeStream = stream;
        }

        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        stopCurrentStream();
        currentStream = stream;
        currentDeviceId = preferredDevice.deviceId;

        const appliedSettings = stream.getVideoTracks()[0]?.getSettings();

        console.info('[CameraDiagnostics] Stream acquired', {
          label: preferredDevice.label || 'Unknown device',
          deviceId: preferredDevice.deviceId || 'unknown',
          constraints,
          appliedSettings,
        });
        onDiagnostics?.({
          event: 'acquired',
          deviceLabel: preferredDevice.label,
          deviceId: preferredDevice.deviceId,
          constraints,
          appliedSettings,
        });

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
        onDiagnostics?.({
          event: 'error',
          deviceLabel: lastDeviceLabel,
          deviceId: lastDeviceId,
          constraints: lastConstraints ?? undefined,
          errorName: err instanceof DOMException ? err.name : undefined,
          message: err instanceof Error ? err.message : String(err),
        });
        if ((err as CameraError)?.code) {
          onError?.(err as CameraError);
          return;
        }
        if (err instanceof DOMException && err.name === 'NotFoundError' && allowFallbackRetry) {
          console.warn('Preferred camera missing, retrying without device constraint.');
          onDiagnostics?.({
            event: 'devicechange',
            deviceLabel: lastDeviceLabel,
            deviceId: lastDeviceId,
            constraints: lastConstraints ?? undefined,
            errorName: err.name,
            message: 'Requested device not found. Retrying with default camera.',
          });
          await startCamera(undefined, false);
          return;
        }
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
          onDiagnostics?.({
            event: 'devicechange',
            deviceLabel: lastDeviceLabel,
            deviceId: lastDeviceId,
            constraints: lastConstraints ?? undefined,
            message: 'All cameras removed. Waiting for device to reconnect.',
          });
          return;
        }

        const activeDeviceAvailable = currentDeviceId
          ? videoInputs.some(device => device.deviceId === currentDeviceId)
          : false;

        if (!activeDeviceAvailable) {
          const fallbackDevice = videoInputs[0];
          onDiagnostics?.({
            event: 'devicechange',
            deviceLabel: fallbackDevice?.label,
            deviceId: fallbackDevice?.deviceId,
            constraints: lastConstraints ?? undefined,
            message: 'Active camera unplugged, retrying with available device.',
          });
          await startCamera(videoInputs[0]?.deviceId);
        } else {
          onDiagnostics?.({
            event: 'devicechange',
            deviceLabel: lastDeviceLabel,
            deviceId: lastDeviceId,
            constraints: lastConstraints ?? undefined,
            message: 'Device change detected but active camera remains available.',
          });
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
      stopCurrentStream(true);
      // Cleanup: Stop all tracks on unmount
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [accessRequestToken, onDiagnostics, onError, onPermissionGranted, videoRef]);

  // scale-x-[-1] mirrors the feed for intuitive human movement matching
  return <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" playsInline muted />;
};

export default WebcamFeed;
