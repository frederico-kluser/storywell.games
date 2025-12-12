import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook to manage the Screen Wake Lock API
 * Prevents the device screen from turning off during critical operations
 * like audio recording or playback
 */
export const useWakeLock = () => {
  const [isLocked, setIsLocked] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Check if Wake Lock API is supported
  useEffect(() => {
    setIsSupported('wakeLock' in navigator);
  }, []);

  // Request wake lock
  const requestWakeLock = useCallback(async (): Promise<boolean> => {
    if (!('wakeLock' in navigator)) {
      console.warn('Wake Lock API not supported');
      return false;
    }

    try {
      // Release any existing wake lock first
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
      }

      wakeLockRef.current = await navigator.wakeLock.request('screen');
      setIsLocked(true);

      // Handle release event (e.g., when tab becomes hidden)
      wakeLockRef.current.addEventListener('release', () => {
        setIsLocked(false);
        wakeLockRef.current = null;
      });

      console.log('Wake Lock activated');
      return true;
    } catch (err) {
      // Wake lock request can fail for various reasons:
      // - Low battery
      // - Document not visible
      // - Permission denied
      console.warn('Wake Lock request failed:', err);
      setIsLocked(false);
      return false;
    }
  }, []);

  // Release wake lock
  const releaseWakeLock = useCallback(async (): Promise<void> => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsLocked(false);
        console.log('Wake Lock released');
      } catch (err) {
        console.warn('Wake Lock release failed:', err);
      }
    }
  }, []);

  // Re-acquire wake lock when page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isLocked && !wakeLockRef.current) {
        // Re-acquire the wake lock if we were supposed to be locked
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLocked, requestWakeLock]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  return {
    isLocked,
    isSupported,
    requestWakeLock,
    releaseWakeLock,
  };
};
