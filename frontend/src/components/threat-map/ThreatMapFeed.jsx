import { useRef, useEffect, useState, useCallback } from 'react';

const COLOR_MAP = {
  red: 'bg-red',
  amber: 'bg-amber',
  violet: 'bg-violet',
  cyan: 'bg-cyan',
};

function relativeTime(timestamp) {
  if (!timestamp) return '';
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ThreatMapFeed({ events, onEventClick }) {
  const scrollRef = useRef(null);
  const [userScrolled, setUserScrolled] = useState(false);
  const prevFirstId = useRef(null);
  const [, setTick] = useState(0);

  // Re-render every 30s so relative timestamps stay current
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    setUserScrolled(scrollRef.current.scrollTop > 10);
  }, []);

  // Auto-scroll to top when new events arrive
  useEffect(() => {
    if (!events.length) return;
    const currentFirstId = events[0]?.id;
    if (currentFirstId !== prevFirstId.current) {
      prevFirstId.current = currentFirstId;
      if (!userScrolled && scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    }
  }, [events, userScrolled]);

  return (
    <div className="glass-card-static p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-xs text-text-muted uppercase tracking-wider font-semibold">
          Live Feed
        </div>
        <div className="live-dot live-dot-green"></div>
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="space-y-1.5 max-h-[140px] overflow-y-auto text-xs"
      >
        {events.length === 0 ? (
          <div className="text-text-muted text-center py-4">Waiting for events...</div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              onClick={() => onEventClick?.(event)}
              className="flex items-center gap-2 p-1.5 rounded bg-surface-2/50 cursor-pointer hover:bg-surface-2 transition-colors"
            >
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${COLOR_MAP[event.color] || 'bg-cyan'}`}></div>
              <span className="font-mono text-text-primary truncate">{event.ip}</span>
              <span className="text-text-muted flex-shrink-0">&rarr;</span>
              <span className="text-text-secondary flex-shrink-0">{event.type}</span>
              {event.country && (
                <span className="text-text-muted truncate hidden sm:inline">{event.country}</span>
              )}
              <span className="text-text-muted ml-auto flex-shrink-0">
                {relativeTime(event.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
