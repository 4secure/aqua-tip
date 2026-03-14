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
  ArrowUpDown,
} from 'lucide-react';
import { fetchThreatNews } from '../api/threat-news';
import PaginationControls from '../components/shared/PaginationControls';
import SkeletonCard from '../components/shared/SkeletonCard';

const CONFIDENCE_OPTIONS = [
  { value: '', label: 'All Confidence' },
  { value: '0', label: 'Low (0\u201329)' },
  { value: '30', label: 'Medium (30\u201369)' },
  { value: '70', label: 'High (70\u2013100)' },
];

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

function confidenceBadge(confidence) {
  if (confidence >= 70) return { bg: 'bg-green/20', text: 'text-green', label: 'High' };
  if (confidence >= 30) return { bg: 'bg-amber/20', text: 'text-amber', label: 'Medium' };
  return { bg: 'bg-red/20', text: 'text-red', label: 'Low' };
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

const PAGE_SIZE = 20;
const MAX_VISIBLE_ENTITIES = 4;

export default function ThreatNewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [cursorHistory, setCursorHistory] = useState([]);
  const [entityFilterName, setEntityFilterName] = useState('');

  const debounceRef = useRef(null);

  const after = searchParams.get('after') || '';
  const search = searchParams.get('search') || '';
  const confidence = searchParams.get('confidence') || '';
  const order = searchParams.get('order') || 'desc';
  const entity = searchParams.get('entity') || '';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = { sort: 'published', order };
      if (after) params.after = after;
      if (confidence) params.confidence = confidence;

      // Use entity name as search term when filtering by entity
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
  }, [after, search, confidence, order, entity]);

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

  const toggleOrder = useCallback(() => {
    updateParam('order', order === 'desc' ? 'asc' : 'desc');
  }, [order, updateParam]);

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

  const toggleExpand = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary mb-1">
          Threat News
        </h1>
        <p className="font-mono text-sm text-text-muted">
          Browse threat intelligence reports from OpenCTI
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

        <select
          value={confidence}
          onChange={(e) => updateParam('confidence', e.target.value)}
          className="px-3 py-2.5 bg-surface border border-border text-text-primary rounded-lg font-mono text-sm focus:outline-none focus:border-violet transition-colors"
        >
          {CONFIDENCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          onClick={toggleOrder}
          className="flex items-center gap-2 px-3 py-2.5 bg-surface border border-border text-text-primary rounded-lg font-mono text-sm hover:bg-surface-2 transition-colors"
        >
          <ArrowUpDown size={14} />
          {order === 'desc' ? 'Newest first' : 'Oldest first'}
        </button>
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
            Try adjusting your search or filters
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
                isExpanded={expandedId === report.id}
                onToggle={() => toggleExpand(report.id)}
                onEntityClick={handleEntityChipClick}
              />
            ))}
          </div>

          <PaginationControls
            pagination={pagination}
            onNext={handleNext}
            onPrevious={handlePrevious}
            pageSize={PAGE_SIZE}
            currentOffset={currentOffset}
          />
        </>
      )}
    </div>
  );
}

/* ── Report Card ── */

function ReportCard({ report, isExpanded, onToggle, onEntityClick }) {
  const entities = report.related_entities || [];
  const visibleEntities = entities.slice(0, MAX_VISIBLE_ENTITIES);
  const overflowCount = entities.length - MAX_VISIBLE_ENTITIES;
  const badge = confidenceBadge(report.confidence ?? 0);

  return (
    <motion.div
      layout
      onClick={onToggle}
      className="bg-surface/60 border border-border backdrop-blur-sm rounded-xl p-5 cursor-pointer hover:border-violet/40 transition-colors"
    >
      {/* Title + Date row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-display text-lg font-bold text-text-primary leading-tight">
          {report.name}
        </h3>
        <span className={`shrink-0 ${badge.bg} ${badge.text} px-2 py-0.5 rounded text-xs font-mono`}>
          {badge.label} ({report.confidence ?? 0})
        </span>
      </div>

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

      {/* Expanded section */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              {/* Full related entities */}
              {entities.length > MAX_VISIBLE_ENTITIES && (
                <div>
                  <span className="text-xs font-display text-text-muted uppercase tracking-wider">
                    All Related Entities
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {entities.map((ent) => {
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
                  </div>
                </div>
              )}

              {/* Full description */}
              {report.description && (
                <div>
                  <span className="text-xs font-display text-text-muted uppercase tracking-wider">
                    Full Description
                  </span>
                  <p className="font-mono text-sm text-text-primary mt-0.5 whitespace-pre-line">
                    {report.description}
                  </p>
                </div>
              )}

              {/* External references */}
              {report.external_references?.length > 0 && (
                <div>
                  <span className="text-xs font-display text-text-muted uppercase tracking-wider">
                    External References
                  </span>
                  <ul className="mt-1 space-y-1">
                    {report.external_references.map((ref, i) => (
                      <li key={i}>
                        {ref.url ? (
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
