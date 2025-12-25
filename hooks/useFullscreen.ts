import { useState, useEffect } from 'react';

/**
 * useFullscreen - Cross-browser fullscreen toggle with iOS detection
 * 
 * iOS Safari doesn't support the Fullscreen API, so we detect it
 * and show a hint to "Add to Home Screen" instead.
 */
export function useFullscreen() {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showHint, setShowHint] = useState(false);

    // Detect iOS (Safari doesn't support Fullscreen API except for video)
    const isIOS = typeof navigator !== 'undefined' && (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );

    // Check if Fullscreen API is supported
    const isSupported = typeof document !== 'undefined' && (
        document.fullscreenEnabled ||
        (document as any).webkitFullscreenEnabled ||
        (document as any).mozFullScreenEnabled ||
        (document as any).msFullscreenEnabled
    );

    // Track fullscreen state changes
    useEffect(() => {
        const handleChange = () => {
            setIsFullscreen(!!(
                document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).mozFullScreenElement ||
                (document as any).msFullscreenElement
            ));
        };

        document.addEventListener('fullscreenchange', handleChange);
        document.addEventListener('webkitfullscreenchange', handleChange);
        document.addEventListener('mozfullscreenchange', handleChange);
        document.addEventListener('MSFullscreenChange', handleChange);

        // Initial check
        handleChange();

        return () => {
            document.removeEventListener('fullscreenchange', handleChange);
            document.removeEventListener('webkitfullscreenchange', handleChange);
            document.removeEventListener('mozfullscreenchange', handleChange);
            document.removeEventListener('MSFullscreenChange', handleChange);
        };
    }, []);

    // Toggle fullscreen with cross-browser support
    const toggle = async () => {
        // On iOS or unsupported, show hint about Add to Home Screen
        if (isIOS || !isSupported) {
            setShowHint(true);
            setTimeout(() => setShowHint(false), 3000);
            return;
        }

        try {
            if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if ((document as any).webkitExitFullscreen) {
                    await (document as any).webkitExitFullscreen();
                }
            } else {
                const elem = document.documentElement;
                if (elem.requestFullscreen) {
                    await elem.requestFullscreen();
                } else if ((elem as any).webkitRequestFullscreen) {
                    await (elem as any).webkitRequestFullscreen();
                } else if ((elem as any).mozRequestFullScreen) {
                    await (elem as any).mozRequestFullScreen();
                } else if ((elem as any).msRequestFullscreen) {
                    await (elem as any).msRequestFullscreen();
                }
            }
        } catch (err) {
            console.warn('Fullscreen request failed:', err);
            setShowHint(true);
            setTimeout(() => setShowHint(false), 3000);
        }
    };

    return {
        isFullscreen,
        toggle,
        showHint,
        isIOS,
        isSupported,
    };
}
