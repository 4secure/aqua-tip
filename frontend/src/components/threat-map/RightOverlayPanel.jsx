import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { apiClient } from '../../api/client';
import { TYPE_BADGE_COLORS, formatRelativeTime } from '../../data/dashboard-config';
import ThreatMapFeed from './ThreatMapFeed';

const SPRING_TRANSITION = { type: 'spring', stiffness: 300, damping: 30 };

function stopPropagation(e) {
  e.stopPropagation();
}

const EVENT_ISOLATION = {
  onPointerDown: stopPropagation,
  onWheel: stopPropagation,
  onClick: stopPropagation,
  onDoubleClick: stopPropagation,
  onTouchStart: stopPropagation,
};

const SKELETON_WIDTHS = [60, 80, 50, 70, 65];

function IndicatorRow({ indicator }) {
  const badge = TYPE_BADGE_COLORS[indicator.entity_type] || { bg: '#7A44E425', text: '#7A44E4' };

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold shrink-0"
          style={{ backgroundColor: badge.bg, color: badge.text }}
        >
          {indicator.entity_type}
        </span>
        <span className="font-mono text-xs text-text-primary truncate">{indicator.value}</span>
      </div>
      <span className="text-[10px] text-text-muted whitespace-nowrap shrink-0">
        {formatRelativeTime(indicator.created_at)}
      </span>
    </div>
  );
}

export default function RightOverlayPanel({ collapsed, events, onEventClick }) {
  const [indicators, setIndicators] = useState([]);
  const [indicatorsLoading, setIndicatorsLoading] = useState(true);
  const [indicatorsError, setIndicatorsError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIndicatorsLoading(true);
    apiClient.get('/api/dashboard/indicators')
      .then((res) => {
        if (cancelled) return;
        setIndicators(Array.isArray(res.data) ? res.data : []);
        setIndicatorsError(null);
      })
      .catch((err) => {
        if (!cancelled) setIndicatorsError(err);
      })
      .finally(() => {
        if (!cancelled) setIndicatorsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <AnimatePresence>
      {!collapsed && (
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 20, opacity: 0 }}
          transition={SPRING_TRANSITION}
          className="absolute top-4 right-4 z-[1000] w-[380px] max-h-[calc(100vh-120px)] overflow-y-auto space-y-4"
          {...EVENT_ISOLATION}
        >
          {/* Indicators section */}
          <div className="glass-card-static p-3">
            <h3 className="text-sm font-semibold text-text-secondary mb-2">Recent Indicators</h3>
            {indicatorsLoading ? (
              <div className="space-y-2">
                {SKELETON_WIDTHS.map((w, i) => (
                  <div
                    key={i}
                    className="h-6 bg-surface-2 rounded animate-pulse"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
            ) : indicatorsError ? (
              <p className="text-xs text-text-muted text-center py-4">Failed to load indicators</p>
            ) : indicators.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-4">No indicators found</p>
            ) : (
              indicators.map((ind) => (
                <IndicatorRow key={ind.id} indicator={ind} />
              ))
            )}
          </div>

          {/* Existing feed widget */}
          <ThreatMapFeed events={events} onEventClick={onEventClick} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
