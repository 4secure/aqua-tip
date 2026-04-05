import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { apiClient } from '../../api/client';
import { STAT_CARD_CONFIG } from '../../data/dashboard-config';
import ThreatMapCounters from './ThreatMapCounters';
import ThreatMapCountries from './ThreatMapCountries';
import ThreatMapDonut from './ThreatMapDonut';

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

function StatRow({ config, count, loading, error }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full bg-${config.color}`} />
        <span className="text-xs text-text-secondary">{config.label}</span>
      </div>
      {loading ? (
        <div className="h-4 w-12 bg-surface-2 rounded animate-pulse" />
      ) : error ? (
        <span className="text-sm font-mono text-text-muted">---</span>
      ) : (
        <span className="text-sm font-mono font-semibold text-text-primary">
          {(count || 0).toLocaleString()}
        </span>
      )}
    </div>
  );
}

export default function LeftOverlayPanel({ collapsed, peeking, onPeekStart, onPeekEnd, counters, connected, countryCounts, typeCounts }) {
  const [counts, setCounts] = useState({});
  const [countsLoading, setCountsLoading] = useState(true);
  const [countsError, setCountsError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setCountsLoading(true);
    apiClient.get('/api/dashboard/counts')
      .then((res) => {
        if (cancelled) return;
        // API returns array of { entity_type, count } -- convert to lookup object
        const lookup = {};
        const items = Array.isArray(res.data) ? res.data : [];
        for (const item of items) {
          lookup[item.entity_type] = item.count;
        }
        setCounts(lookup);
        setCountsError(null);
      })
      .catch((err) => {
        if (!cancelled) setCountsError(err);
      })
      .finally(() => {
        if (!cancelled) setCountsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const panelContent = (
    <>
      {/* Stat cards section */}
      <div className="glass-card-static p-3">
        <h3 className="text-sm font-semibold text-text-secondary mb-2">Threat Database</h3>
        {STAT_CARD_CONFIG.map((config) => (
          <StatRow
            key={config.entity_type}
            config={config}
            count={counts[config.entity_type]}
            loading={countsLoading}
            error={countsError}
          />
        ))}
      </div>

      {/* Existing map widgets */}
      <ThreatMapCounters counters={counters} connected={connected} />
      <ThreatMapCountries countryCounts={countryCounts} />
      <ThreatMapDonut typeCounts={typeCounts} />
    </>
  );

  return (
    <>
      {collapsed && (
        <div
          className="absolute top-4 left-4 z-[1000]"
          onPointerEnter={() => onPeekStart('left')}
          onPointerLeave={() => onPeekEnd('left')}
        >
          <AnimatePresence mode="wait">
            {!peeking ? (
              <motion.div
                key="left-sliver"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-[10px] glass-card-static cursor-pointer hover:border-violet/30 transition-colors"
                style={{ height: 'calc(100vh - 120px)' }}
                {...EVENT_ISOLATION}
              />
            ) : (
              <motion.div
                key="left-panel"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={SPRING_TRANSITION}
                className="w-[340px] max-h-[calc(100vh-120px)] overflow-y-auto space-y-4"
                {...EVENT_ISOLATION}
              >
                {panelContent}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {!collapsed && (
        <AnimatePresence>
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={SPRING_TRANSITION}
            className="absolute top-4 left-4 z-[1000] w-[340px] max-h-[calc(100vh-120px)] overflow-y-auto space-y-4"
            {...EVENT_ISOLATION}
          >
            {panelContent}
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}
