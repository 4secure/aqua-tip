import { useEffect } from 'react';

export function useKeyboardShortcut(key, callback, { meta = false } = {}) {
  useEffect(() => {
    const handler = (e) => {
      if (meta && !(e.metaKey || e.ctrlKey)) return;
      if (e.key === key) {
        e.preventDefault();
        callback(e);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [key, callback, meta]);
}
