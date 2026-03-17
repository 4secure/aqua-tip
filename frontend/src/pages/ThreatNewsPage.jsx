import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Newspaper,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { fetchThreatNews } from '../api/threat-news';

const ENTITY_TYPE_COLORS = {
  IntrusionSet: { bg: 'bg-violet/20', text: 'text-violet' },
  ThreatActor: { bg: 'bg-violet/20', text: 'text-violet' },
  Malware: { bg: 'bg-red/20', text: 'text-red' },
  Indicator: { bg: 'bg-cyan/20', text: 'text-cyan' },
  AttackPattern: { bg: 'bg-amber/20', text: 'text-amber' },
};

const DEFAULT_CHIP_COLOR = { bg: 'bg-surface-2', text: 'text-text-muted' };

function chipColor(entityType) {
  return ENTITY_TYPE_COLORS[entityType] || DEFAULT_CHIP_COLOR;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

const PAGE_SIZE = 21;
const MAX_VISIBLE_ENTITIES = 3;

export default function ThreatNewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [cursorHistory, setCursorHistory] = useState([]);
  const [entityFilterName, setEntityFilterName] = useState('');

  const debounceRef = useRef(null);

  const after = searchParams.get('after') || '';
  const search = searchParams.get('search') || '';
  const entity = searchParams.get('entity') || '';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = { sort: 'published', order: 'desc' };
      if (after) params.after = after;

      const effectiveSearch = entity || search;
      if (effectiveSearch) params.search = effectiveSearch;

      const response = await fetchThreatNews(params);
      const data = response.data || response;
      setItems(data.items || []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err.message || 'Unable to load threat news. Please try again.');
      setItems([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [after, search, entity]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateParam = useCallback(
    (key, value) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        if (key !== 'after') {
          next.delete('after');
          setCursorHistory([]);
        }
        return next;
      });
    },
    [setSearchParams]
  );

  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        updateParam('search', value);
      }, 300);
    },
    [updateParam]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleEntityChipClick = useCallback(
    (e, entityItem) => {
      e.stopPropagation();
      setEntityFilterName(entityItem.name);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('entity', entityItem.name);
        next.delete('after');
        return next;
      });
      setCursorHistory([]);
    },
    [setSearchParams]
  );

  const clearEntityFilter = useCallback(() => {
    setEntityFilterName('');
    updateParam('entity', '');
  }, [updateParam]);

  const handleNext = useCallback(() => {
    if (pagination?.end_cursor) {
      setCursorHistory((prev) => [...prev, after]);
      updateParam('after', pagination.end_cursor);
    }
  }, [pagination, after, updateParam]);

  const handlePrevious = useCallback(() => {
    setCursorHistory((prev) => {
      const copy = [...prev];
      const prevCursor = copy.pop();
      setSearchParams((sp) => {
        const next = new URLSearchParams(sp);
        if (prevCursor) {
          next.set('after', prevCursor);
        } else {
          next.delete('after');
        }
        return next;
      });
      return copy;
    });
  }, [setSearchParams]);

  const currentOffset = cursorHistory.length * PAGE_SIZE;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary mb-1">
          Threat News
        </h1>
        <p className="font-mono text-sm text-text-muted">
          Browse threat intelligence reports
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            defaultValue={search}
            onChange={handleSearchChange}
            placeholder="Search reports..."
            disabled={!!entity}
            className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border text-text-primary rounded-lg font-mono text-sm placeholder:text-text-muted focus:outline-none focus:border-violet transition-colors disabled:opacity-50"
          />
        </div>

      </div>

      {/* Entity Filter Banner */}
      {entity && (
        <div className="flex items-center gap-2 bg-violet/10 border border-violet/30 rounded-lg px-4 py-2.5">
          <span className="font-mono text-sm text-violet">
            Showing reports related to:{' '}
            <span className="font-semibold">{entityFilterName || entity}</span>
          </span>
          <button
            onClick={clearEntityFilter}
            className="ml-auto p-1 hover:bg-violet/20 rounded transition-colors"
          >
            <X size={14} className="text-violet" />
          </button>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="bg-red/10 border border-red/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-mono text-sm text-red">{error}</p>
            <button
              onClick={loadData}
              className="mt-2 flex items-center gap-2 text-sm font-display text-cyan hover:text-cyan/80 transition-colors"
            >
              <RotateCcw size={14} /> Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SkeletonCard count={6} />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Newspaper size={48} className="text-text-muted mb-4" />
          <p className="font-display text-lg text-text-muted">
            No reports available
          </p>
          <p className="font-mono text-sm text-text-muted mt-1">
            Try adjusting your search
          </p>
        </div>
      )}

      {/* Card Grid */}
      {!loading && !error && items.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onClick={() => setSelectedReport(report)}
                onEntityClick={handleEntityChipClick}
              />
            ))}
          </div>
        </>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedReport && (
          <ReportModal
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            onEntityClick={handleEntityChipClick}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Report Card ── */

function ReportCard({ report, onClick, onEntityClick }) {
  const entities = report.related_entities || [];
  const visibleEntities = entities.slice(0, MAX_VISIBLE_ENTITIES);
  const overflowCount = entities.length - MAX_VISIBLE_ENTITIES;
  return (
    <div
      onClick={onClick}
      className="bg-surface/60 border border-border backdrop-blur-sm rounded-xl p-5 cursor-pointer hover:border-violet/40 transition-colors"
    >
      {/* Title */}
      <h3 className="font-display text-lg font-bold text-text-primary leading-tight mb-2">
        {report.name}
      </h3>

      {/* Published date */}
      <p className="font-mono text-xs text-text-muted mb-3">
        {formatDate(report.published)}
      </p>

      {/* Description snippet */}
      {report.description && (
        <p className="font-mono text-sm text-text-muted line-clamp-3 mb-3">
          {report.description}
        </p>
      )}

      {/* Related entity chips */}
      {entities.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {visibleEntities.map((ent) => {
            const color = chipColor(ent.entity_type);
            return (
              <button
                key={ent.id}
                onClick={(e) => onEntityClick(e, ent)}
                className={`${color.bg} ${color.text} text-xs px-2 py-0.5 rounded-full font-mono hover:opacity-80 transition-opacity`}
              >
                {ent.name}
              </button>
            );
          })}
          {overflowCount > 0 && (
            <span className="bg-surface-2 text-text-muted text-xs px-2 py-0.5 rounded-full font-mono">
              +{overflowCount} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Report Modal ── */

function ReportModal({ report, onClose, onEntityClick }) {
  const entities = report.related_entities || [];

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-primary/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-surface border border-border rounded-2xl p-6 shadow-2xl"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-surface-2 transition-colors"
        >
          <X size={18} className="text-text-muted" />
        </button>

        {/* Title */}
        <h2 className="font-display text-2xl font-bold text-text-primary leading-tight pr-10 mb-2">
          {report.name}
        </h2>

        {/* Published date */}
        <p className="font-mono text-xs text-text-muted mb-4">
          {formatDate(report.published)}
        </p>

        {/* Report types */}
        {report.report_types?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {report.report_types.map((type) => (
              <span key={type} className="bg-surface-2 text-text-muted px-2.5 py-1 rounded text-xs font-mono">
                {type}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        {report.description && (
          <div className="mb-5">
            <h3 className="text-xs font-display text-text-muted uppercase tracking-wider mb-1.5">
              Description
            </h3>
            <p className="font-mono text-sm text-text-primary whitespace-pre-line leading-relaxed">
              {report.description}
            </p>
          </div>
        )}

        {/* Related Entities */}
        {entities.length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs font-display text-text-muted uppercase tracking-wider mb-1.5">
              Related Entities
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {entities.map((ent) => {
                const color = chipColor(ent.entity_type);
                return (
                  <button
                    key={ent.id}
                    onClick={(e) => {
                      onEntityClick(e, ent);
                      onClose();
                    }}
                    className={`${color.bg} ${color.text} text-xs px-2 py-0.5 rounded-full font-mono hover:opacity-80 transition-opacity`}
                  >
                    {ent.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* External References */}
        {report.external_references?.length > 0 && (
          <div>
            <h3 className="text-xs font-display text-text-muted uppercase tracking-wider mb-1.5">
              External References
            </h3>
            <ul className="space-y-1.5">
              {report.external_references.map((ref, i) => (
                <li key={i}>
                  {ref.url ? (
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-mono text-cyan hover:underline"
                    >
                      <ExternalLink size={12} />
                      {ref.source_name}
                    </a>
                  ) : (
                    <span className="text-sm font-mono text-text-muted">
                      {ref.source_name}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
