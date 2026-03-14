import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Shield, AlertTriangle, RotateCcw, ExternalLink, X } from 'lucide-react';
import { fetchThreatActors } from '../api/threat-actors';
import PaginationControls from '../components/shared/PaginationControls';
import SkeletonCard from '../components/shared/SkeletonCard';

const MOTIVATION_OPTIONS = [
  { value: '', label: 'All Motivations' },
  { value: 'espionage', label: 'Espionage' },
  { value: 'financial-gain', label: 'Financial Gain' },
  { value: 'ideology', label: 'Ideology' },
  { value: 'personal-gain', label: 'Personal Gain' },
  { value: 'personal-satisfaction', label: 'Personal Satisfaction' },
  { value: 'dominance', label: 'Dominance' },
  { value: 'coercion', label: 'Coercion' },
  { value: 'disruption', label: 'Disruption' },
  { value: 'unknown', label: 'Unknown' },
];

const PAGE_SIZE = 21;

export default function ThreatActorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedActor, setSelectedActor] = useState(null);
  const [cursorHistory, setCursorHistory] = useState([]);

  const debounceRef = useRef(null);

  const after = searchParams.get('after') || '';
  const search = searchParams.get('search') || '';
  const motivation = searchParams.get('motivation') || '';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {};
      if (after) params.after = after;
      if (search) params.search = search;
      if (motivation) params.motivation = motivation;

      const response = await fetchThreatActors(params);
      const data = response.data || response;
      setItems(data.items || []);
      setPagination(data.pagination || null);
    } catch (err) {
      setError(err.message || 'Unable to load threat actors. Please try again.');
      setItems([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, [after, search, motivation]);

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
          Threat Actors
        </h1>
        <p className="font-mono text-sm text-text-muted">
          Browse known threat actor profiles from OpenCTI
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
            placeholder="Search threat actors..."
            className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border text-text-primary rounded-lg font-mono text-sm placeholder:text-text-muted focus:outline-none focus:border-violet transition-colors"
          />
        </div>

        <select
          value={motivation}
          onChange={(e) => updateParam('motivation', e.target.value)}
          className="px-3 py-2.5 bg-surface border border-border text-text-primary rounded-lg font-mono text-sm focus:outline-none focus:border-violet transition-colors"
        >
          {MOTIVATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

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
          <Shield size={48} className="text-text-muted mb-4" />
          <p className="font-display text-lg text-text-muted">
            No threat actors found
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
            {items.map((actor) => (
              <ThreatActorCard
                key={actor.id}
                actor={actor}
                onClick={() => setSelectedActor(actor)}
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

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedActor && (
          <ThreatActorModal
            actor={selectedActor}
            onClose={() => setSelectedActor(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Threat Actor Card ── */

function ThreatActorCard({ actor, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-surface/60 border border-border backdrop-blur-sm rounded-xl p-5 cursor-pointer hover:border-violet/40 transition-colors"
    >
      <h3 className="font-display text-lg font-bold text-text-primary mb-1">
        {actor.name}
      </h3>

      {actor.aliases?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {actor.aliases.map((alias) => (
            <span
              key={alias}
              className="bg-surface-2 text-cyan text-xs px-2 py-0.5 rounded-full font-mono"
            >
              {alias}
            </span>
          ))}
        </div>
      )}

      {actor.description && (
        <p className="font-mono text-sm text-text-muted line-clamp-3 mb-3">
          {actor.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {actor.motivation && (
          <span className="bg-violet/20 text-violet px-2 py-0.5 rounded text-xs font-mono">
            {actor.motivation}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Threat Actor Modal ── */

function ThreatActorModal({ actor, onClose }) {
  const isMitre = (ref) =>
    ref.source_name?.toLowerCase().includes('mitre') ||
    ref.url?.includes('attack.mitre.org');

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

        {/* Name */}
        <h2 className="font-display text-2xl font-bold text-text-primary mb-1 pr-10">
          {actor.name}
        </h2>

        {/* Aliases */}
        {actor.aliases?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {actor.aliases.map((alias) => (
              <span
                key={alias}
                className="bg-surface-2 text-cyan text-xs px-2 py-0.5 rounded-full font-mono"
              >
                {alias}
              </span>
            ))}
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-5">
          {actor.motivation && (
            <span className="bg-violet/20 text-violet px-2.5 py-1 rounded text-xs font-mono">
              {actor.motivation}
            </span>
          )}
          {actor.resource_level && (
            <span className="bg-cyan/20 text-cyan px-2.5 py-1 rounded text-xs font-mono">
              {actor.resource_level}
            </span>
          )}
        </div>

        {/* Description */}
        {actor.description && (
          <div className="mb-5">
            <h3 className="text-xs font-display text-text-muted uppercase tracking-wider mb-1.5">
              Description
            </h3>
            <p className="font-mono text-sm text-text-primary whitespace-pre-line leading-relaxed">
              {actor.description}
            </p>
          </div>
        )}

        {/* Goals */}
        {actor.goals?.length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs font-display text-text-muted uppercase tracking-wider mb-1.5">
              Goals
            </h3>
            <ul className="space-y-1">
              {actor.goals.map((goal, i) => (
                <li key={i} className="font-mono text-sm text-text-primary flex items-start gap-2">
                  <span className="text-violet mt-0.5">&#x2022;</span>
                  {goal}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* External References */}
        {actor.external_references?.length > 0 && (
          <div>
            <h3 className="text-xs font-display text-text-muted uppercase tracking-wider mb-1.5">
              External References
            </h3>
            <ul className="space-y-1.5">
              {actor.external_references.map((ref, i) => (
                <li key={i}>
                  {ref.url ? (
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 text-sm font-mono hover:underline ${
                        isMitre(ref) ? 'text-amber' : 'text-cyan'
                      }`}
                    >
                      <ExternalLink size={12} />
                      {ref.source_name}
                    </a>
                  ) : (
                    <span className="text-sm font-mono text-text-muted">
                      {ref.source_name}
                    </span>
                  )}
                  {ref.description && (
                    <p className="text-xs text-text-muted ml-5 mt-0.5">
                      {ref.description}
                    </p>
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
