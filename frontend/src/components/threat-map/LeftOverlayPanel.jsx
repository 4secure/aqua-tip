import { AnimatePresence, motion } from 'framer-motion';
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

export default function LeftOverlayPanel({ collapsed, peeking, onPeekStart, onPeekEnd, counters, connected, countryCounts, typeCounts }) {
  const panelContent = (
    <>
      <ThreatMapCounters counters={counters} connected={connected} />
      <ThreatMapCountries countryCounts={countryCounts} />
      <ThreatMapDonut typeCounts={typeCounts} />
    </>
  );

  return (
    <>
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
                className="w-[340px] max-h-full overflow-hidden space-y-4 pt-4 pl-4"
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
            className="absolute top-4 left-4 z-[1000] w-[340px] max-h-[calc(100vh-120px)] overflow-hidden space-y-4"
            {...EVENT_ISOLATION}
          >
            {panelContent}
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}
