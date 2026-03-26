import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, AlertTriangle, ShieldCheck, RotateCcw, Radio } from 'lucide-react';
import { Globe, Mail, Key, FileText } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Icon } from '../data/icons';
import { startDarkWebSearch, checkDarkWebStatus, fetchCredits } from '../api/dark-web';
import { CreditBadge } from '../components/shared/CreditBadge';

function BreachCard({ breach }) {
  const title = (breach.title || 'Unknown Source').replace(/[\u{1F000}-\u{1FFFF}]/gu, '').trim();

  const fields = [
    { icon: Globe, label: 'Source', value: breach.source },
    { icon: Mail, label: 'Identity', value: breach.identity },
    { icon: Key, label: 'Credential', value: breach.credential },
  ].filter(f => f.value);

  const contextHtml = breach.context
    ? DOMPurify.sanitize(breach.context, { ALLOWED_TAGS: ['b', 'br', 'code', 'a'], ALLOWED_ATTR: ['href', 'target', 'rel'] })
    : null;

  return (
    <div className="bg-surface/60 border border-border backdrop-blur-sm rounded-xl p-4 space-y-3 h-full flex flex-col">
      <h3 className="font-sans text-sm font-semibold text-violet">{title}</h3>
      {fields.length > 0 && (
        <div className="space-y-2">
          {fields.map(({ icon: IconComp, label, value }) => (
            <div key={label} className="flex items-start gap-2">
              <IconComp size={13} className="text-text-muted shrink-0 mt-0.5" />
              <span className="text-[11px] text-text-muted w-16 shrink-0">{label}</span>
              <span className="font-mono text-xs text-text-primary break-all">{value}</span>
            </div>
          ))}
        </div>
      )}
      {contextHtml && (
        <div
          className="border-t border-border pt-2 font-mono text-[11px] text-text-secondary leading-relaxed flex-1 [&_b]:text-text-muted [&_b]:font-semibold [&_code]:text-cyan [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:rounded [&_a]:text-cyan [&_a]:hover:underline"
          dangerouslySetInnerHTML={{ __html: contextHtml }}
        />
      )}
    </div>
  );
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;
const STORAGE_KEY = 'darkweb_recent_queries';
const MAX_RECENT = 5;
const POLL_INTERVAL_MS = 4000;
const MAX_POLL_ATTEMPTS = 12;

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

const SCAN_PHASES = [
  'Submitting query...',
  'Scanning SMACK database...',
  'Searching dark web sources...',
  'Cross-referencing breach databases...',
  'Analyzing leaked credentials...',
  'Compiling results...',
];

function ScanningAnimation({ partialCount }) {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % SCAN_PHASES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="bg-surface/60 border border-violet/30 backdrop-blur-sm rounded-xl p-8"
    >
      <div className="flex flex-col items-center gap-6">
        {/* Pulsing radar icon */}
        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-full bg-violet/20"
            animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative z-10 w-16 h-16 rounded-full bg-violet/10 border border-violet/30 flex items-center justify-center">
            <Radio size={28} className="text-violet" />
          </div>
        </div>

        {/* Status text */}
        <div className="text-center space-y-2">
          <AnimatePresence mode="wait">
            <motion.p
              key={phaseIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="font-mono text-sm text-cyan"
            >
              {SCAN_PHASES[phaseIndex]}
            </motion.p>
          </AnimatePresence>

          {partialCount > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-mono text-xs text-text-muted"
            >
              <span className="text-amber font-semibold">{partialCount}</span>{' '}
              partial {partialCount === 1 ? 'result' : 'results'} found so far...
            </motion.p>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs">
          <div className="h-1 bg-surface-2 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet to-cyan rounded-full"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: '50%' }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function DarkWebPage() {
  const [searchType, setSearchType] = useState('email');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searchMeta, setSearchMeta] = useState(null);
  const [credits, setCredits] = useState({ remaining: 0, limit: 0, resets_at: '' });
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [partialCount, setPartialCount] = useState(0);
  const [recentQueries, setRecentQueries] = useState([]);
  const [showRecent, setShowRecent] = useState(false);
  const blurTimeoutRef = useRef(null);
  const pollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchCredits()
      .then((data) => setCredits(data))
      .catch(() => {});
    setRecentQueries(loadRecentQueries());
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const pollForResults = useCallback(
    (taskId, searchQuery, attempt = 0) => {
      if (attempt >= MAX_POLL_ATTEMPTS) {
        setError({ message: 'Search timed out. Please try again.' });
        setScanning(false);
        setHasSearched(true);
        return;
      }

      pollRef.current = setTimeout(async () => {
        try {
          const response = await checkDarkWebStatus(taskId);
          const { status, data } = response;

          if (status === 'PROCESSING') {
            // Show partial results
            if (data?.results?.length > 0) {
              setPartialCount(data.results.length);
              setResults(data.results);
              setSearchMeta({ found: data.found, query: searchQuery, partial: true });
            }
            // Continue polling
            pollForResults(taskId, searchQuery, attempt + 1);
          } else if (status === 'SUCCESS') {
            // Final results
            setResults(data?.results ?? []);
            setSearchMeta({ found: data?.found ?? 0, query: searchQuery, partial: false });
            setScanning(false);
            setPartialCount(0);
            setHasSearched(true);
          } else if (status === 'PENDING') {
            // Still waiting, continue polling
            pollForResults(taskId, searchQuery, attempt + 1);
          } else {
            // ERROR or unknown
            setError({ message: 'Search failed. No credit was deducted.' });
            setScanning(false);
            setHasSearched(true);
          }
        } catch (err) {
          setError({ message: err.message || 'Failed to check search status.' });
          setScanning(false);
          setHasSearched(true);
        }
      }, POLL_INTERVAL_MS);
    },
    []
  );

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

      // Cancel any in-flight poll
      if (pollRef.current) clearTimeout(pollRef.current);

      setError(null);
      setScanning(true);
      setResults(null);
      setSearchMeta(null);
      setPartialCount(0);
      setShowRecent(false);

      try {
        const response = await startDarkWebSearch({ query: q, type: t });

        if (response.credits) {
          setCredits(response.credits);
        }

        const updated = saveRecentQuery(q, t, recentQueries);
        setRecentQueries(updated);

        // Start polling for results
        pollForResults(response.task_id, q);
      } catch (err) {
        if (err.status === 429) {
          setError({ message: err.message || 'Daily limit reached.' });
          setCredits((prev) => ({ ...prev, remaining: 0 }));
        } else if (err.status === 502) {
          setError({
            message: 'Something went wrong. No credit was deducted.',
            refunded: true,
          });
        } else if (err.status === 422 && err.errors) {
          const msgs = Object.values(err.errors).flat().join(' ');
          setError({ message: msgs || 'Validation failed.' });
        } else {
          setError({ message: err.message || 'An unexpected error occurred.' });
        }
        setScanning(false);
        setHasSearched(true);
      }
    },
    [query, searchType, recentQueries, pollForResults]
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !scanning && credits.remaining > 0) {
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
  const searchDisabled = scanning || isExhausted;
  const showStickyHeader = hasSearched || scanning;

  return (
    <div className="space-y-6">
      <div
        className={
          showStickyHeader
            ? 'sticky top-0 z-10 bg-primary/90 backdrop-blur-md pb-4 pt-2 -mx-6 px-6'
            : 'flex flex-col items-center justify-center min-h-[60vh]'
        }
      >
        <div className="relative">
          <AnimatePresence>
            {!showStickyHeader && (
              <motion.div
                key="hero"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, position: 'relative' }}
                exit={{ opacity: 0, y: -30, position: 'absolute', left: 0, right: 0, transition: { duration: 0.3 } }}
                className="flex flex-col items-center mb-8"
              >
                <span className="text-violet mb-4 [&_svg]:w-12 [&_svg]:h-12"><Icon name="incognito" /></span>
                <h1 className="font-sans text-3xl font-bold text-text-primary mb-2">
                  Dark Web Search
                </h1>
                <p className="font-mono text-sm text-text-muted text-center max-w-md">
                  Search for breached credentials across known data breaches
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          layout="position"
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={showStickyHeader ? 'flex items-center gap-3' : 'flex flex-col items-center gap-4 w-full max-w-xl'}
        >
          {/* Email/Domain Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button
              onClick={() => setSearchType('email')}
              className={`px-4 py-2 text-sm font-sans transition-colors ${
                searchType === 'email'
                  ? 'bg-violet text-white'
                  : 'bg-surface text-text-muted hover:text-text-primary'
              }`}
            >
              Email
            </button>
            <button
              onClick={() => setSearchType('domain')}
              className={`px-4 py-2 text-sm font-sans transition-colors ${
                searchType === 'domain'
                  ? 'bg-violet text-white'
                  : 'bg-surface text-text-muted hover:text-text-primary'
              }`}
            >
              Domain
            </button>
          </div>

          {/* Search Input */}
          <div className={`relative ${showStickyHeader ? 'flex-1' : 'w-full'}`}>
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
                {scanning ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Search size={18} />
                )}
                {!showStickyHeader && 'Search'}
              </button>
            </div>
          </div>

          {/* Credit Badge */}
          <CreditBadge remaining={credits.remaining} limit={credits.limit} />
        </motion.div>

        {/* Exhausted message */}
        {isExhausted && (
          <p className="text-amber text-sm font-mono mt-2 text-center">
            Daily limit reached. Your credits reset at 00:00 UTC.
          </p>
        )}
      </div>

      {/* Results Area */}
      <AnimatePresence mode="wait">
        {scanning && !results && (
          <ScanningAnimation key="scanning" partialCount={partialCount} />
        )}

        {scanning && results && results.length > 0 && (
          <motion.div
            key="partial-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 mb-2">
              <Loader2 size={16} className="animate-spin text-violet" />
              <p className="font-mono text-sm text-text-muted">
                <span className="text-amber font-semibold">{searchMeta?.found}</span>{' '}
                partial {searchMeta?.found === 1 ? 'result' : 'results'} found &mdash; scanning for more...
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              {results.map((breach, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="h-full"
                >
                  <BreachCard breach={breach} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {!scanning && error && (
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
                    className="mt-3 flex items-center gap-2 text-sm font-sans text-cyan hover:text-cyan/80 transition-colors"
                  >
                    <RotateCcw size={14} /> Retry
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {!scanning && !error && hasSearched && results && results.length === 0 && (
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

        {!scanning && !error && hasSearched && results && results.length > 0 && (
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              {results.map((breach, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="h-full"
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
