import { CameraError } from '../components/WebcamFeed';

export const logCameraError = (error: CameraError) => {
  const payload = {
    code: error.code,
    message: error.message,
    cause: error.cause instanceof Error ? error.cause.message : error.cause,
  };

  console.warn('[Telemetry] Camera error', payload);
};

export default logCameraError;
