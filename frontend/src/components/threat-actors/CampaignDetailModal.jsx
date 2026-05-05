import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useFormatDate } from '../../hooks/useFormatDate';

/**
 * CampaignDetailModal — Phase 65 (D-18, D-19, D-20, D-21, D-22, D-23).
 *
 * Mirrors ThreatActorModal's shell (Framer Motion backdrop + Escape key + body overflow lock)
 * but is a single scrollable content area — no tabs, no enrichment fetch, no activeTab state.
 * The list response from /api/threat-campaigns is complete (D-14); this modal renders straight
 * from the prop.
 *
 * Sections (in order, per D-19):
 *   1. Header (name)
 *   2. Date range (first_seen — last_seen, with D-23 null handling)
 *   3. Objective section (always rendered; placeholder text when objective null per D-22)
 *   4. Attribution section (entirely omitted when attributed_to empty per D-21)
 *   5. Labels section (entirely omitted when labels empty)
 *
 * D-20 enforcement: no prose field rendered — Phase 60 payload omits that field.
 */
export default function CampaignDetailModal({ campaign, onClose }) {
  const { formatDate } = useFormatDate();

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const firstSeen = campaign?.first_seen;
  const lastSeen = campaign?.last_seen;
  const attributedTo = campaign?.attributed_to ?? [];
  const labels = campaign?.labels ?? [];

  let dateRange;
  if (!firstSeen && !lastSeen) {
    dateRange = 'Unknown date range';
  } else {
    const left = firstSeen ? formatDate(firstSeen) : '?';
    const right = lastSeen ? formatDate(lastSeen) : 'ongoing';
    dateRange = `${left} \u2014 ${right}`;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-primary/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-surface border border-border rounded-2xl p-6 shadow-2xl"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-surface-2 transition-colors"
        >
          <X size={18} className="text-text-muted" />
        </button>

        {/* Header */}
        <h2 className="font-sans text-2xl font-bold text-text-primary mb-1 pr-10">
          {campaign?.name}
        </h2>

        {/* Date range */}
        <p className="font-mono text-xs text-text-muted mb-5">
          {dateRange}
        </p>

        {/* Objective section — always rendered (D-22 modal: structural anchor preserved) */}
        <div className="mb-5">
          <h3 className="text-xs font-sans text-text-muted uppercase tracking-wider mb-1.5">
            Objective
          </h3>
          {campaign?.objective ? (
            <p className="font-sans text-sm text-text-primary whitespace-pre-line leading-relaxed">
              {campaign.objective}
            </p>
          ) : (
            <p className="font-sans text-sm text-text-muted">
              No objective specified.
            </p>
          )}
        </div>

        {/* Attribution section — entirely omitted when empty (D-21) */}
        {attributedTo.length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs font-sans text-text-muted uppercase tracking-wider mb-1.5">
              Attributed to
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {attributedTo.map((a) => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-border text-xs font-sans text-text-primary"
                >
                  {a.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Labels section — entirely omitted when empty (D-19 §5) */}
        {labels.length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs font-sans text-text-muted uppercase tracking-wider mb-1.5">
              Labels
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {labels.map((label) => (
                <span
                  key={label.id}
                  className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-mono text-text-primary ${label.color ? '' : 'bg-surface-2'}`}
                  style={label.color ? { backgroundColor: label.color } : undefined}
                >
                  {label.value}
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
