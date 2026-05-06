import { useState, useEffect } from 'react';

/**
 * Hook to detect online/offline status
 */
export function useOffline(): { isOffline: boolean; wasOffline: boolean } {
  const [isOffline, setIsOffline] = useState(() => {
    // SSR/prerender: navigator is not available.
    if (typeof navigator === 'undefined') return false
    return !navigator.onLine
  });
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleOnline = () => {
      setWasOffline(isOffline);
      setIsOffline(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setWasOffline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOffline]);

  return { isOffline, wasOffline };
}

