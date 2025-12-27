/**
 * useIsMobile.ts
 * 
 * Custom hook to detect mobile/small screen devices.
 * Uses both screen width and touch capability for accurate detection.
 */

import { useState, useEffect } from 'react';

export function useIsMobile(): boolean {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth < 768 ||
            ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0);
    });

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768 ||
                ('ontouchstart' in window) ||
                (navigator.maxTouchPoints > 0);
            setIsMobile(mobile);
        };

        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
}

/**
 * Check if device is likely low-powered (mobile GPU)
 * Uses screen size and pixel ratio as proxy
 */
export function useIsLowPowerDevice(): boolean {
    const [isLowPower, setIsLowPower] = useState(() => {
        if (typeof window === 'undefined') return false;
        const pixelRatio = window.devicePixelRatio || 1;
        const screenArea = window.innerWidth * window.innerHeight;
        // Low power if: small screen OR high DPI mobile (expensive to render)
        return screenArea < 500000 || (pixelRatio > 2 && window.innerWidth < 1024);
    });

    useEffect(() => {
        const check = () => {
            const pixelRatio = window.devicePixelRatio || 1;
            const screenArea = window.innerWidth * window.innerHeight;
            setIsLowPower(screenArea < 500000 || (pixelRatio > 2 && window.innerWidth < 1024));
        };

        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    return isLowPower;
}
