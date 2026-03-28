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
  ChevronDown,
} from 'lucide-react';
import { fetchThreatNews, fetchThreatNewsLabels } from '../api/threat-news';
import { useFormatDate } from '../hooks/useFormatDate';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

const CATEGORY_COLORS = [
  { bg: 'bg-violet/20', text: 'text-violet' },
  { bg: 'bg-cyan/20', text: 'text-cyan' },
  { bg: 'bg-amber/20', text: 'text-amber' },
  { bg: 'bg-red/20', text: 'text-red' },
  { bg: 'bg-surface-2', text: 'text-text-muted' },
];

function categoryColor(labelValue) {
  let hash = 0;
  for (let i = 0; i < labelValue.length; i++) {
    hash = ((hash << 5) - hash) + labelValue.charCodeAt(i);
    hash |= 0;
  }
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
}

const PAGE_SIZE = 20;
const MAX_VISIBLE_CATEGORIES = 3;

/* -- Searchable Category Dropdown -- */

function CategoryDropdown({ categories, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const selectedLabel = categories.find((c) => c.id === value)?.value || '';

  const filtered = query
    ? categories.filter((c) =>
        c.value.toLowerCase().includes(query.toLowerCase())
      )
    : categories;

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (catId) => {
    onChange(catId);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={dropdownRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 bg-surface border border-border text-text-primary rounded-lg font-mono text-xs px-3 py-2.5 focus:outline-none focus:border-violet transition-colors hover:border-violet/40 min-w-[160px]"
      >
        <span className="truncate">
          {value ? selectedLabel : 'All categories'}
        </span>
        <ChevronDown
          size={14}
          className={`text-text-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-surface/90 border border-border backdrop-blur-md rounded-xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search categories..."
                className="w-full pl-8 pr-3 py-1.5 bg-surface-2 border border-border text-text-primary rounded-lg font-mono text-xs placeholder:text-text-muted focus:outline-none focus:border-violet transition-colors"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-56 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full text-left px-3 py-2 font-mono text-xs transition-colors ${
                !value
                  ? 'text-violet bg-violet/10'
                  : 'text-text-primary hover:bg-surface-2'
              }`}
            >
              All categories
            </button>
            {filtered.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelect(cat.id)}
                className={`w-full text-left px-3 py-2 font-mono text-xs transition-colors ${
                  value === cat.id
                    ? 'text-violet bg-violet/10'
                    : 'text-text-primary hover:bg-surface-2'
                }`}
              >
                {cat.value}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 font-mono text-xs text-text-muted">
                No categories found
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ThreatNewsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [cursorHistory, setCursorHistory] = useState([]);
  const [categoryFilterName, setCategoryFilterName] = useState('');
  const [categories, setCategories] = useState([]);

  const debounceRef = useRef(null);

  const after = searchParams.get('after') || '';
  const search = searchParams.get('search') || '';
  const label = searchParams.get('label') || '';

  useEffect(() => {
    fetchThreatNewsLabels()
      .then((res) => {
        const data = res.data || res;
        setCategories(Array.isArray(data) ? data : data.data || []);
      })
      .catch(() => setCategories([]));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = { sort: 'published', order: 'desc' };
      if (after) params.after = after;
      if (search) params.search = search;
      if (label) params.label = label;

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
  }, [after, search, label]);

  const silentRefresh = useCallback(async () => {
    try {
      const params = { sort: 'published', order: 'desc' };
      if (after) params.after = after;
      if (search) params.search = search;
      if (label) params.label = label;
      const response = await fetchThreatNews(params);
      const data = response.data || response;
      setItems(data.items || []);
      setPagination(data.pagination || null);
    } catch {
      // D-07: Keep stale data visible, retry next interval
    }
  }, [after, search, label]);

  useAutoRefresh(silentRefresh, 5 * 60 * 1000);

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

  const handleCategoryClick = useCallback(
    (e, category) => {
      e.stopPropagation();
      setCategoryFilterName(category.value);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('label', category.id);
        next.delete('after');
        return next;
      });
      setCursorHistory([]);
    },
    [setSearchParams]
  );

  const clearCategoryFilter = useCallback(() => {
    setCategoryFilterName('');
    updateParam('label', '');
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
        <h1 className="font-sans text-2xl font-bold text-text-primary mb-1">
          Threat News
        </h1>
        <p className="font-mono text-sm text-text-muted">
          Browse threat intelligence reports
        </p>
      </div>

      {/* Toolbar: Search + Category Dropdown + Pagination */}
      <div className="flex items-center gap-3">
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
            disabled={!!label}
            className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border text-text-primary rounded-lg font-mono text-sm placeholder:text-text-muted focus:outline-none focus:border-violet transition-colors disabled:opacity-50"
          />
        </div>

        <CategoryDropdown
          categories={categories}
          value={label}
          onChange={(catId) => {
            const selected = categories.find((c) => c.id === catId);
            setCategoryFilterName(selected?.value || '');
            updateParam('label', catId);
          }}
        />

        <div className="flex items-center gap-2 shrink-0 min-w-[180px] justify-end">
          {pagination ? (
            <>
              <span className="font-mono text-sm text-text-muted whitespace-nowrap">
                {pagination.total != null
                  ? `${currentOffset + 1}\u2013${Math.min(currentOffset + PAGE_SIZE, pagination.total)} of ${pagination.total}`
                  : `${currentOffset + 1}\u2013${currentOffset + PAGE_SIZE}`}
              </span>
              <button
                onClick={handlePrevious}
                disabled={!pagination.has_previous}
                className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} className="text-text-muted" />
              </button>
              <button
                onClick={handleNext}
                disabled={!pagination.has_next}
                className="p-1.5 rounded-lg hover:bg-surface-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} className="text-text-muted" />
              </button>
            </>
          ) : loading && (
            <div className="flex items-center gap-2 animate-pulse">
              <div className="h-4 w-20 bg-surface-2 rounded" />
              <div className="h-7 w-7 bg-surface-2 rounded-lg" />
              <div className="h-7 w-7 bg-surface-2 rounded-lg" />
            </div>
          )}
        </div>
      </div>

      {/* Category Filter Banner */}
      {label && (
        <div className="flex items-center gap-2 bg-violet/10 border border-violet/30 rounded-lg px-4 py-2.5">
          <span className="font-mono text-sm text-violet">
            Showing reports with category:{' '}
            <span className="font-semibold">{categoryFilterName || label}</span>
          </span>
          <button
            onClick={clearCategoryFilter}
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
              className="mt-2 flex items-center gap-2 text-sm font-sans text-cyan hover:text-cyan/80 transition-colors"
            >
              <RotateCcw size={14} /> Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-surface/60 border border-border backdrop-blur-sm rounded-xl overflow-hidden">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border animate-pulse">
              <div className="h-8 bg-surface-2 rounded w-[100px] shrink-0" />
              <div className="h-4 bg-surface-2 rounded flex-1" />
              <div className="hidden sm:block h-4 bg-surface-2 rounded w-32" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Newspaper size={48} className="text-text-muted mb-4" />
          <p className="font-sans text-lg text-text-muted">
            No reports available
          </p>
          <p className="font-mono text-sm text-text-muted mt-1">
            Try adjusting your search
          </p>
        </div>
      )}

      {/* Report List */}
      {!loading && !error && items.length > 0 && (
        <div className="bg-surface/60 border border-border backdrop-blur-sm rounded-xl overflow-hidden">
          {items.map((report) => (
            <ReportRow
              key={report.id}
              report={report}
              onClick={() => setSelectedReport(report)}
              onCategoryClick={handleCategoryClick}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedReport && (
          <ReportModal
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
            onCategoryClick={handleCategoryClick}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* -- Report Row -- */

function ReportRow({ report, onClick, onCategoryClick }) {
  const { formatDate } = useFormatDate();
  const labels = report.labels || [];
  const visibleLabels = labels.slice(0, MAX_VISIBLE_CATEGORIES);
  const overflowCount = labels.length - MAX_VISIBLE_CATEGORIES;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-4 py-3 border-b border-border hover:bg-surface-2 cursor-pointer transition-colors"
    >
      {/* Date - first column */}
      <span className="font-mono text-xs text-text-muted shrink-0 w-24">
        {formatDate(report.published)}
      </span>

      {/* Title - flexible */}
      <h3 className="font-sans text-sm font-semibold text-text-primary truncate flex-1 min-w-0">
        {report.name}
      </h3>

      {/* Category chips */}
      {labels.length > 0 && (
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          {visibleLabels.map((cat) => {
            const color = categoryColor(cat.value);
            return (
              <button
                key={cat.id}
                onClick={(e) => onCategoryClick(e, cat)}
                className={`${color.bg} ${color.text} text-xs px-2 py-0.5 rounded-full font-mono hover:opacity-80 transition-opacity`}
              >
                {cat.value}
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

/* -- Report Modal -- */

function ReportModal({ report, onClose, onCategoryClick }) {
  const { formatDate } = useFormatDate();
  const labels = report.labels || [];

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
        <h2 className="font-sans text-2xl font-bold text-text-primary leading-tight pr-10 mb-2">
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
            <h3 className="text-xs font-sans text-text-muted uppercase tracking-wider mb-1.5">
              Description
            </h3>
            <p className="font-mono text-sm text-text-primary whitespace-pre-line leading-relaxed">
              {report.description}
            </p>
          </div>
        )}

        {/* Categories */}
        {labels.length > 0 && (
          <div className="mb-5">
            <h3 className="text-xs font-sans text-text-muted uppercase tracking-wider mb-1.5">
              Categories
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {labels.map((cat) => {
                const color = categoryColor(cat.value);
                return (
                  <button
                    key={cat.id}
                    onClick={(e) => {
                      onCategoryClick(e, cat);
                      onClose();
                    }}
                    className={`${color.bg} ${color.text} text-xs px-2 py-0.5 rounded-full font-mono hover:opacity-80 transition-opacity`}
                  >
                    {cat.value}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* External References */}
        {report.external_references?.length > 0 && (
          <div>
            <h3 className="text-xs font-sans text-text-muted uppercase tracking-wider mb-1.5">
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
