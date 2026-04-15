import { AnimatePresence, motion } from 'framer-motion';
import ThreatMapCounters from './ThreatMapCounters';
import ThreatMapCountries from './ThreatMapCountries';
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

export default function LeftOverlayPanel({ collapsed, peeking, onPeekStart, onPeekEnd, counters, connected, countryCounts, events, onEventClick }) {
  const panelContent = (
    <>
      <div className="flex-shrink-0">
        <ThreatMapCounters counters={counters} connected={connected} />
      </div>
      <div className="flex-1 min-h-0">
        <ThreatMapCountries countryCounts={countryCounts} />
      </div>
      <div className="flex-1 min-h-0">
        <ThreatMapFeed events={events} onEventClick={onEventClick} />
      </div>
    </>
  );

  return (
    <>
      {/* Peek zone (collapsed only) */}
      {collapsed && (
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 h-[60%] z-[1000]"
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
                className="w-[10px] h-full glass-sliver-left cursor-pointer hover:border-violet/30 transition-colors"
                {...EVENT_ISOLATION}
              />
            ) : (
              <motion.div
                key="left-panel"
                initial={{ x: -340, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -340, opacity: 0 }}
                transition={SPRING_TRANSITION}
                className="w-[340px] h-full flex flex-col gap-4 pt-4 pl-4"
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
            key="left-expanded"
            initial={{ x: -340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -340, opacity: 0 }}
            transition={SPRING_TRANSITION}
            className="absolute top-4 left-4 z-[1000] w-[340px] h-[calc(100vh-120px)] flex flex-col gap-4"
            {...EVENT_ISOLATION}
          >
            {panelContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
