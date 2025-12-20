import React, { useEffect } from 'react';

interface Props {
  videoRef: React.RefObject<HTMLVideoElement>;
}

/**
 * WebcamFeed Component
 * Requests and manages the user's camera stream.
 * Optimized for computer vision tasks with low-resolution and specific frame rate.
 */
const WebcamFeed: React.FC<Props> = ({ videoRef }) => {
  useEffect(() => {
    async function startCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
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
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        }
      } catch (err) {
        console.error("Neural Uplink Error (Camera Access):", err);
      }
    }
    startCamera();
    return () => {
      // Cleanup: Stop all tracks on unmount
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // scale-x-[-1] mirrors the feed for intuitive human movement matching
  return <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" playsInline muted />;
};

export default WebcamFeed;