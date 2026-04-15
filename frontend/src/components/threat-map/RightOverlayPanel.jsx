import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { apiClient } from '../../api/client';
import { TYPE_BADGE_COLORS, formatRelativeTime, STAT_CARD_CONFIG } from '../../data/dashboard-config';
import AttackCategoryChart from './AttackCategoryChart';

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

const DOT_COLORS = {
  red: 'bg-red',
  violet: 'bg-violet',
  cyan: 'bg-cyan',
  amber: 'bg-amber',
  green: 'bg-green',
};

function StatRow({ config, count, loading, error }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${DOT_COLORS[config.color] || 'bg-violet'}`} />
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

export default function RightOverlayPanel({ collapsed, peeking, onPeekStart, onPeekEnd, events, onEventClick }) {
  const [indicators, setIndicators] = useState([]);
  const [indicatorsLoading, setIndicatorsLoading] = useState(true);
  const [indicatorsError, setIndicatorsError] = useState(null);

  const [counts, setCounts] = useState({});
  const [countsLoading, setCountsLoading] = useState(true);
  const [countsError, setCountsError] = useState(null);

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIndicatorsLoading(true);
    apiClient.get('/api/dashboard/indicators')
      .then((res) => {
        if (cancelled) return;
        const raw = res.data?.data ?? res.data;
        setIndicators(Array.isArray(raw) ? raw : []);
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

  useEffect(() => {
    let cancelled = false;
    setCountsLoading(true);
    apiClient.get('/api/dashboard/counts')
      .then((res) => {
        if (cancelled) return;
        const lookup = {};
        const raw = res.data?.data ?? res.data;
        const items = Array.isArray(raw) ? raw : [];
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

  useEffect(() => {
    let cancelled = false;
    setCategoriesLoading(true);
    apiClient.get('/api/dashboard/categories')
      .then((res) => {
        if (cancelled) return;
        const raw = res.data?.data ?? res.data;
        setCategories(Array.isArray(raw) ? raw : []);
        setCategoriesError(null);
      })
      .catch((err) => {
        if (!cancelled) setCategoriesError(err);
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const panelContent = (
    <>
      {/* Indicators section — flexible, scrolls internally */}
      <div className="flex-1 min-h-0">
        <div className="glass-card-static p-3 h-full flex flex-col min-h-0">
          <h3 className="text-sm font-semibold text-text-secondary mb-2 flex-shrink-0">Recent Indicators</h3>
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
            <div className="space-y-2">
              {SKELETON_WIDTHS.map((w, i) => (
                <div
                  key={i}
                  className="h-6 bg-surface-2 rounded animate-pulse"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          ) : indicators.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-4">No indicators found</p>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto">
              {indicators.slice(0, 10).map((ind) => (
                <IndicatorRow key={ind.id} indicator={ind} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Attack Categories chart — fixed height */}
      <div className="flex-shrink-0">
        <div className="glass-card-static p-3">
          <h3 className="text-sm font-semibold text-text-secondary mb-2">Top Attack Categories</h3>
          {categoriesLoading ? (
            <div className="space-y-2">
              {[60, 80, 50, 70, 65].map((w, i) => (
                <div key={i} className="h-5 bg-surface-2 rounded animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : categoriesError ? (
            <div className="space-y-2">
              {[60, 80, 50, 70, 65].map((w, i) => (
                <div key={i} className="h-5 bg-surface-2 rounded animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-4">No category data</p>
          ) : (
            <div className="h-[200px]">
              <AttackCategoryChart categories={categories} />
            </div>
          )}
        </div>
      </div>

      {/* Threat Database section — flexible, scrolls internally */}
      <div className="flex-1 min-h-0">
        <div className="glass-card-static p-3 h-full flex flex-col min-h-0">
          <h3 className="text-sm font-semibold text-text-secondary mb-2 flex-shrink-0">Threat Database</h3>
          <div className="flex-1 min-h-0 overflow-y-auto">
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
        </div>
      </div>
    </>
  );

  return (
    <>
      {collapsed && (
        <div
          className="absolute top-1/2 -translate-y-1/2 right-0 h-[60%] z-[1000]"
          onPointerEnter={() => onPeekStart('right')}
          onPointerLeave={() => onPeekEnd('right')}
        >
          <AnimatePresence mode="wait">
            {!peeking ? (
              <motion.div
                key="right-sliver"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-[10px] h-full glass-sliver-right cursor-pointer hover:border-violet/30 transition-colors"
                {...EVENT_ISOLATION}
              />
            ) : (
              <motion.div
                key="right-panel"
                initial={{ x: 380, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 380, opacity: 0 }}
                transition={SPRING_TRANSITION}
                className="w-[380px] h-full flex flex-col gap-4 pt-4 pr-4"
                {...EVENT_ISOLATION}
              >
                {panelContent}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Expanded panel — AnimatePresence always mounted so exit animates */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            key="right-expanded"
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={SPRING_TRANSITION}
            className="absolute top-4 right-4 z-[1000] w-[380px] h-[calc(100vh-120px)] flex flex-col gap-4"
            {...EVENT_ISOLATION}
          >
            {panelContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
