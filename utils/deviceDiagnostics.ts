export interface MediaPreflightResult {
  ok: boolean;
  issues: string[];
  details: {
    isSecureContext: boolean;
    hasMediaDevices: boolean;
    hasGetUserMedia: boolean;
  };
}

const isHttpsLikeHost = () =>
  typeof window !== 'undefined' &&
  (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const mediaPreflightCheck = (): MediaPreflightResult => {
  const hasMediaDevices = typeof navigator !== 'undefined' && !!navigator.mediaDevices;
  const hasGetUserMedia = !!navigator?.mediaDevices?.getUserMedia;
  const isSecure = typeof window !== 'undefined' ? window.isSecureContext || isHttpsLikeHost() : false;

  const issues: string[] = [];
  if (!isSecure) {
    issues.push('Camera access requires HTTPS or localhost. Switch to a secure origin and retry.');
  }
  if (!hasMediaDevices) {
    issues.push('MediaDevices API is unavailable. Use a modern browser.');
  }
  if (!hasGetUserMedia) {
    issues.push('getUserMedia is missing on mediaDevices. Update the browser or disable restrictive extensions.');
  }

  return {
    ok: issues.length === 0,
    issues,
    details: {
      isSecureContext: isSecure,
      hasMediaDevices,
      hasGetUserMedia,
    },
  };
};
