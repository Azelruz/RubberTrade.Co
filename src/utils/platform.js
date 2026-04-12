/**
 * Platform Detection Utility
 * Helps identify the environment the app is running in for specific UI/Logic tweaks.
 */

export const getPlatform = () => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    
    const isAndroid = /android/i.test(ua);
    const isIOS = (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad Pro check
    const isMobile = isAndroid || isIOS || /mobile/i.test(ua);
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  window.navigator.standalone === true;

    return {
        isAndroid,
        isIOS,
        isMobile,
        isPWA,
        isDesktop: !isMobile
    };
};

export const platform = getPlatform();
