import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../api/client';

const MAX_EVENTS = 50;
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
    .slice(0, 5);
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

  // SSE connection
  useEffect(() => {
    if (!snapshotLoaded) return;

    const es = new EventSource(`${BASE_URL}/api/threat-map/stream`, {
      withCredentials: true,
    });
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
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

    es.onerror = () => {
      setConnected(false);
      // EventSource auto-reconnects; server sends retry: 10000
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [snapshotLoaded]);

  const countryCounts = aggregateCountryCounts(events);
  const typeCounts = aggregateTypeCounts(events);

  return { events, counters, countryCounts, typeCounts, connected };
}
