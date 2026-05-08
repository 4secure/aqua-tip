import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ExternalLink } from 'lucide-react';
import { useFormatDate } from '../../hooks/useFormatDate';

/**
 * CampaignDetailModal — Phase 65 (revised post-deploy).
 *
 * Mirrors ThreatActorModal's shell (Framer Motion backdrop + Escape key + body overflow lock)
 * but is a single scrollable content area — no tabs, no enrichment fetch, no activeTab state.
 * The list response from /api/threat-campaigns is complete (D-14); this modal renders straight
 * from the prop.
 *
 * D-20 supersession (2026-05-05): the original CONTEXT.md D-20 assumed Phase 60 payload omitted
 * `description`. Live OpenCTI probe confirmed `description` IS returned and is the richest field
 * (multi-paragraph prose with citations) — `objective` is null on virtually all MITRE-imported
 * campaigns. D-20 is replaced by sections that surface the data that actually exists.
 *
 * Sections (in order):
 *   1. Header (name)
 *   2. Date range (first_seen — last_seen)
 *   3. Aliases (chips, omitted when empty)
 *   4. Description (cleaned of markdown link syntax + (Citation: ...) markers)
 *   5. Objective (rendered only when present — was the always-on D-22 section)
 *   6. Attribution chips (omitted when empty)
 *   7. External References (omitted when empty)
 *   8. Labels (omitted when empty)
 */
function cleanDescription(raw) {
  if (!raw) return '';
  // Strip MITRE markdown link syntax `[text](url)` → `text` (URLs come back as separate
  // external_references already, no need to render them inline).
  let cleaned = raw.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Strip `(Citation: ...)` markers — also surfaced as external_references.
  cleaned = cleaned.replace(/\(Citation:\s*[^)]+\)/g, '');
  // Collapse runs of whitespace introduced by the strips.
  cleaned = cleaned.replace(/[ \t]+/g, ' ').replace(/[ \t]*\n[ \t]*/g, '\n');
  return cleaned.trim();
}

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
  const aliases = campaign?.aliases ?? [];
  const description = cleanDescription(campaign?.description);
  const attributedTo = campaign?.attributed_to ?? [];
  const externalRefs = campaign?.external_references ?? [];
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

        {/* Aliases — omitted when empty */}
        {aliases.length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs font-sans text-text-muted uppercase tracking-wider mb-1.5">
              Also known as
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {aliases.map((alias) => (
                <span
                  key={alias}
                  className="inline-flex items-center px-2.5 py-1 rounded text-xs font-mono text-text-secondary bg-surface-2"
                >
                  {alias}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description — omitted when empty */}
        {description && (
          <div className="mb-5">
            <h3 className="text-xs font-sans text-text-muted uppercase tracking-wider mb-1.5">
              Description
            </h3>
            <p className="font-sans text-sm text-text-primary whitespace-pre-line leading-relaxed">
              {description}
            </p>
          </div>
        )}

        {/* Objective — omitted when empty (rare for MITRE-imported campaigns) */}
        {campaign?.objective && (
          <div className="mb-5">
            <h3 className="text-xs font-sans text-text-muted uppercase tracking-wider mb-1.5">
              Objective
            </h3>
            <p className="font-sans text-sm text-text-primary whitespace-pre-line leading-relaxed">
              {campaign.objective}
            </p>
          </div>
        )}

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

        {/* External References — omitted when empty */}
        {externalRefs.length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs font-sans text-text-muted uppercase tracking-wider mb-1.5">
              References
            </h3>
            <ul className="space-y-1.5">
              {externalRefs.map((ref, idx) => (
                <li key={ref.url || `${ref.source_name}-${idx}`} className="flex items-start gap-2">
                  <ExternalLink size={13} className="text-text-muted shrink-0 mt-1" />
                  <div className="min-w-0">
                    {ref.url ? (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-sans text-sm text-violet hover:text-violet-light transition-colors break-all"
                      >
                        {ref.source_name || ref.url}
                      </a>
                    ) : (
                      <span className="font-sans text-sm text-text-secondary">{ref.source_name}</span>
                    )}
                    {ref.description && (
                      <p className="font-sans text-xs text-text-muted mt-0.5">{ref.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Labels section — entirely omitted when empty */}
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
