import { useEffect, useRef } from 'react';

/**
 * Visibility-aware auto-refresh hook.
 * Calls fetchFn on a recurring interval, pauses when the browser tab
 * is hidden, and fires an immediate fetch when the tab becomes visible.
 *
 * @param {() => Promise<void>} fetchFn - Async function to call silently
 * @param {number} intervalMs - Refresh interval in milliseconds (default 5 min)
 */
export function useAutoRefresh(fetchFn, intervalMs = 5 * 60 * 1000) {
  const fetchRef = useRef(fetchFn);

  useEffect(() => {
    fetchRef.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    let intervalId = null;

    function startInterval() {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(() => {
        fetchRef.current().catch(() => {});
      }, intervalMs);
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        clearInterval(intervalId);
        intervalId = null;
      } else {
        fetchRef.current().catch(() => {});
        startInterval();
      }
    }

    startInterval();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [intervalMs]);
}
