import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, AlertTriangle, ShieldCheck, RotateCcw } from 'lucide-react';
import { Icon } from '../data/icons';
import { searchDarkWeb, fetchCredits } from '../api/dark-web';
import { CreditBadge } from '../components/shared/CreditBadge';
import { BreachCard } from '../components/shared/BreachCard';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
const STORAGE_KEY = 'darkweb_recent_queries';
const MAX_RECENT = 5;

function loadRecentQueries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecentQuery(query, type, existing) {
  const deduped = existing.filter(
    (item) => !(item.query === query && item.type === type)
  );
  const updated = [{ query, type, timestamp: Date.now() }, ...deduped].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export default function DarkWebPage() {
  const [searchType, setSearchType] = useState('email');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searchMeta, setSearchMeta] = useState(null);
  const [credits, setCredits] = useState({ remaining: 0, limit: 0, resets_at: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentQueries, setRecentQueries] = useState([]);
  const [showRecent, setShowRecent] = useState(false);
  const blurTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchCredits()
      .then((data) => setCredits(data))
      .catch(() => {});
    setRecentQueries(loadRecentQueries());
  }, []);

  const handleSearch = useCallback(
    async (overrideQuery, overrideType) => {
      const q = (overrideQuery ?? query).trim();
      const t = overrideType ?? searchType;

      if (!q) {
        setError({ message: 'Please enter a search query.' });
        return;
      }

      if (t === 'email' && !EMAIL_REGEX.test(q)) {
        setError({ message: 'Please enter a valid email address.' });
        return;
      }
      if (t === 'domain' && !DOMAIN_REGEX.test(q)) {
        setError({ message: 'Please enter a valid domain name.' });
        return;
      }

      setError(null);
      setLoading(true);
      setShowRecent(false);

      try {
        const response = await searchDarkWeb({ query: q, type: t });
        setResults(response.data?.results ?? []);
        setSearchMeta({ found: response.data?.found ?? 0, query: q });
        if (response.credits) {
          setCredits(response.credits);
        }
        const updated = saveRecentQuery(q, t, recentQueries);
        setRecentQueries(updated);
        setHasSearched(true);
      } catch (err) {
        if (err.status === 429) {
          setError({ message: err.message || 'Daily limit reached.' });
          setCredits((prev) => ({ ...prev, remaining: 0 }));
          setResults(null);
          setSearchMeta(null);
        } else if (err.status === 502) {
          setError({
            message: 'Something went wrong. No credit was deducted.',
            refunded: true,
          });
          setResults(null);
          setSearchMeta(null);
        } else if (err.status === 422 && err.errors) {
          const msgs = Object.values(err.errors).flat().join(' ');
          setError({ message: msgs || 'Validation failed.' });
        } else {
          setError({ message: err.message || 'An unexpected error occurred.' });
        }
        setHasSearched(true);
      } finally {
        setLoading(false);
      }
    },
    [query, searchType, recentQueries]
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !loading && credits.remaining > 0) {
      handleSearch();
    }
  };

  const handleRecentClick = (item) => {
    setQuery(item.query);
    setSearchType(item.type);
    setShowRecent(false);
    handleSearch(item.query, item.type);
  };

  const handleInputFocus = () => {
    if (recentQueries.length > 0) {
      setShowRecent(true);
    }
  };

  const handleInputBlur = () => {
    blurTimeoutRef.current = setTimeout(() => setShowRecent(false), 200);
  };

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const isExhausted = credits.remaining === 0 && credits.limit > 0;
  const searchDisabled = loading || isExhausted;

  return (
    <div className="space-y-6">
      <motion.div
        layout
        className={
          hasSearched
            ? 'sticky top-0 z-10 bg-primary/90 backdrop-blur-md pb-4 pt-2 -mx-6 px-6'
            : 'flex flex-col items-center justify-center min-h-[60vh]'
        }
      >
        {!hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center mb-8"
          >
            <span className="text-violet mb-4 [&_svg]:w-12 [&_svg]:h-12"><Icon name="incognito" /></span>
            <h1 className="font-display text-3xl font-bold text-text-primary mb-2">
              Dark Web Search
            </h1>
            <p className="font-mono text-sm text-text-muted text-center max-w-md">
              Search for breached credentials across known data breaches
            </p>
          </motion.div>
        )}

        <div className={hasSearched ? 'flex items-center gap-3' : 'flex flex-col items-center gap-4 w-full max-w-xl'}>
          {/* Email/Domain Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button
              onClick={() => setSearchType('email')}
              className={`px-4 py-2 text-sm font-display transition-colors ${
                searchType === 'email'
                  ? 'bg-violet text-white'
                  : 'bg-surface text-text-muted hover:text-text-primary'
              }`}
            >
              Email
            </button>
            <button
              onClick={() => setSearchType('domain')}
              className={`px-4 py-2 text-sm font-display transition-colors ${
                searchType === 'domain'
                  ? 'bg-violet text-white'
                  : 'bg-surface text-text-muted hover:text-text-primary'
              }`}
            >
              Domain
            </button>
          </div>

          {/* Search Input */}
          <div className={`relative ${hasSearched ? 'flex-1' : 'w-full'}`}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder={
                    searchType === 'email'
                      ? 'Enter email address...'
                      : 'Enter domain name...'
                  }
                  disabled={searchDisabled}
                  className="input-mono w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                />

                {/* Recent Queries Dropdown */}
                {showRecent && recentQueries.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                    {recentQueries.map((item, i) => (
                      <button
                        key={i}
                        onMouseDown={() => handleRecentClick(item)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-surface-2 transition-colors"
                      >
                        <Search size={14} className="text-text-muted shrink-0" />
                        <span className="text-sm font-mono text-text-primary truncate">
                          {item.query}
                        </span>
                        <span className="chip chip-cyan text-[10px] ml-auto shrink-0">
                          {item.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleSearch()}
                disabled={searchDisabled}
                className="btn-primary px-6 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Search size={18} />
                )}
                {!hasSearched && 'Search'}
              </button>
            </div>
          </div>

          {/* Credit Badge */}
          <CreditBadge remaining={credits.remaining} limit={credits.limit} />
        </div>

        {/* Exhausted message */}
        {isExhausted && (
          <p className="text-amber text-sm font-mono mt-2 text-center">
            Daily limit reached. Your credits reset at 00:00 UTC.
          </p>
        )}
      </motion.div>

      {/* Results Area */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-surface/60 border border-border rounded-xl p-4 animate-pulse"
              >
                <div className="h-4 bg-surface-2 rounded w-2/3 mb-3" />
                <div className="h-3 bg-surface-2 rounded w-1/2 mb-2" />
                <div className="h-3 bg-surface-2 rounded w-1/3" />
              </div>
            ))}
          </motion.div>
        )}

        {!loading && error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`border rounded-xl p-6 ${
              error.refunded
                ? 'bg-red/5 border-red/30'
                : 'bg-amber/5 border-amber/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={20}
                className={error.refunded ? 'text-red shrink-0 mt-0.5' : 'text-amber shrink-0 mt-0.5'}
              />
              <div>
                <p className={`text-sm font-mono ${error.refunded ? 'text-red' : 'text-amber'}`}>
                  {error.message}
                </p>
                {error.refunded && (
                  <button
                    onClick={() => handleSearch()}
                    className="mt-3 flex items-center gap-2 text-sm font-display text-cyan hover:text-cyan/80 transition-colors"
                  >
                    <RotateCcw size={14} /> Retry
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {!loading && !error && hasSearched && results && results.length === 0 && (
          <motion.div
            key="safe"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-green/5 border border-green/30 rounded-xl p-6"
          >
            <div className="flex items-start gap-3">
              <ShieldCheck size={20} className="text-green shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-mono text-green">
                  No breaches found for{' '}
                  <span className="font-semibold">{searchMeta?.query}</span>.
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {searchMeta?.query} appears safe in known data breaches.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {!loading && !error && hasSearched && results && results.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <p className="font-mono text-sm text-text-muted">
              <span className="text-red font-semibold">{searchMeta?.found}</span>{' '}
              {searchMeta?.found === 1 ? 'breach' : 'breaches'} found for{' '}
              <span className="text-text-primary font-semibold">{searchMeta?.query}</span>
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {results.map((breach, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <BreachCard breach={breach} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
