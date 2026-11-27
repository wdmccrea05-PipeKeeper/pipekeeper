import { useEffect } from 'react';
import { restoreScrollPosition, saveScrollPosition } from '@/lib/navigation/returnTo';

/**
 * Remembers where the collector was on this route and puts them back there when
 * they return to it.
 */
export default function useScrollRestoration(key) {
  useEffect(() => {
    restoreScrollPosition(key);
    return () => saveScrollPosition(key);
  }, [key]);
}