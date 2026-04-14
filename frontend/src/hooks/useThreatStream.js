import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../api/client';

const MAX_EVENTS = 100;
const MAX_RETRIES = 10;
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function aggregateCountryCounts(events) {
  const map = {};
  for (const e of events) {
    if (!e.countryCode) continue;
    if (!map[e.countryCode]) {
      map[e.countryCode] = { code: e.countryCode, name: e.country || e.countryCode, count: 0 };
    }
    map[e.countryCode] = { ...map[e.countryCode], count: map[e.countryCode].count + 1 };
  }
  return Object.values(map)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function aggregateTypeCounts(events) {
  const map = {};
  for (const e of events) {
    const type = e.type || 'Unknown';
    map[type] = (map[type] || 0) + 1;
  }
  return { ...map };
}

function deriveCounters(events) {
  const countries = new Set();
  const types = new Set();
  for (const e of events) {
    if (e.countryCode) countries.add(e.countryCode);
    if (e.type) types.add(e.type);
  }
  return {
    threats: events.length,
    countries: countries.size,
    types: types.size,
  };
}

export function useThreatStream() {
  const [events, setEvents] = useState([]);
  const [counters, setCounters] = useState({ threats: 0, countries: 0, types: 0 });
  const [connected, setConnected] = useState(false);
  const esRef = useRef(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef(null);
  const [snapshotLoaded, setSnapshotLoaded] = useState(false);

  const recalculate = useCallback((eventList) => {
    setCounters(deriveCounters(eventList));
  }, []);

  // Snapshot loading
  useEffect(() => {
    let cancelled = false;

    async function loadSnapshot() {
      try {
        const response = await apiClient.get('/api/threat-map/snapshot');
        if (cancelled) return;
        const initialEvents = (response?.data?.events || []).slice(0, MAX_EVENTS);
        setEvents(initialEvents);
        if (response?.data?.counters) {
          setCounters(response.data.counters);
        } else {
          recalculate(initialEvents);
        }
        setSnapshotLoaded(true);
      } catch {
        // Snapshot failed - continue with empty state, SSE may still work
        setSnapshotLoaded(true);
      }
    }

    loadSnapshot();
    return () => { cancelled = true; };
  }, [recalculate]);

  // SSE connection with reconnection and visibility handling
  useEffect(() => {
    if (!snapshotLoaded) return;

    function connect() {
      // Clean up any existing connection
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      const es = new EventSource(`${BASE_URL}/api/threat-map/stream`, {
        withCredentials: true,
      });
      esRef.current = es;

      es.onopen = () => {
        setConnected(true);
        retryCountRef.current = 0;
      };

      es.onmessage = (msg) => {
        try {
          const newEvent = JSON.parse(msg.data);
          if (newEvent.error) return;
          setEvents((prev) => {
            const updated = [newEvent, ...prev].slice(0, MAX_EVENTS);
            setCounters(deriveCounters(updated));
            return updated;
          });
        } catch {
          // Ignore malformed messages
        }
      };

      es.addEventListener('stream-error', (msg) => {
        try {
          const payload = JSON.parse(msg.data);
          console.warn('[ThreatStream] Server error:', payload.error);
        } catch {
          // Ignore malformed stream-error events
        }
      });

      es.onerror = () => {
        setConnected(false);
        es.close();
        esRef.current = null;

        if (retryCountRef.current < MAX_RETRIES) {
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
          retryCountRef.current += 1;
          retryTimerRef.current = setTimeout(connect, delay);
        }
      };
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        // Tab hidden — disconnect to free resources
        clearTimeout(retryTimerRef.current);
        if (esRef.current) {
          esRef.current.close();
          esRef.current = null;
        }
        setConnected(false);
      } else {
        // Tab visible — reconnect immediately
        retryCountRef.current = 0;
        connect();
      }
    }

    connect();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(retryTimerRef.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [snapshotLoaded]);

  const countryCounts = aggregateCountryCounts(events);
  const typeCounts = aggregateTypeCounts(events);

  return { events, counters, countryCounts, typeCounts, connected };
}
