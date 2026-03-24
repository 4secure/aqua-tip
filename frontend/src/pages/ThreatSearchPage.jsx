import { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  LogIn, Clock, Shield, ShieldCheck, AlertTriangle,
  Network, FileText, Eye, StickyNote, Code, ExternalLink, Globe,
} from 'lucide-react';
import { CreditBadge } from '../components/shared/CreditBadge';
import { searchThreat, fetchCredits } from '../api/threat-search';
import { useAuth } from '../contexts/AuthContext';
import { useFormatDate } from '../hooks/useFormatDate';
import { apiClient } from '../api/client';

/* ── Entity type → color mapping for D3 graph ── */
const ENTITY_COLORS = {
  'IPv4-Addr': '#FF3B5C',
  'IPv6-Addr': '#FF3B5C',
  'Malware': '#7A44E4',
  'Threat-Actor': '#FFB020',
  'Intrusion-Set': '#FFB020',
  'Attack-Pattern': '#00E5FF',
  'Domain-Name': '#00E5FF',
  'Url': '#7A44E4',
  'Email-Addr': '#FFB020',
  'StixFile': '#00C48C',
  'Hostname': '#9B6BF7',
};
const DEFAULT_ENTITY_COLOR = '#5A6173';

function entityColor(entityType) {
  return ENTITY_COLORS[entityType] || DEFAULT_ENTITY_COLOR;
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

const TYPE_BADGE_COLORS = {
  'IPv4-Addr':     { bg: '#FF3B5C25', text: '#FF3B5C' },
  'IPv6-Addr':     { bg: '#FF3B5C25', text: '#FF3B5C' },
  'Domain-Name':   { bg: '#00E5FF25', text: '#00E5FF' },
  'Url':           { bg: '#7A44E425', text: '#7A44E4' },
  'Email-Addr':    { bg: '#FFB02025', text: '#FFB020' },
  'StixFile':      { bg: '#00C48C25', text: '#00C48C' },
  'Hostname':      { bg: '#9B6BF725', text: '#9B6BF7' },
};

/* ── D3 Force-Directed Relationship Graph ── */
function D3Graph({ relationships, centerQuery, detectedType }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !relationships?.length) return;

    let cleanup = null;

    import('d3').then(d3 => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Build nodes from relationships
      // Use centerQuery as canonical ID for any entity matching the searched IP
      const nodeMap = new Map();
      const uuidToCanonical = new Map(); // maps OpenCTI UUID → centerQuery when entity is the searched IP
      nodeMap.set(centerQuery, { id: centerQuery, type: detectedType || 'unknown', label: centerQuery });

      for (const rel of relationships) {
        for (const entity of [rel.from, rel.to]) {
          if (!entity) continue;
          const isCenterEntity = (entity.name === centerQuery || entity.observable_value === centerQuery);
          if (isCenterEntity) {
            uuidToCanonical.set(entity.id, centerQuery);
            continue; // already in nodeMap as centerQuery
          }
          if (nodeMap.has(entity.id)) continue;
          nodeMap.set(entity.id, {
            id: entity.id,
            type: entity.entity_type,
            label: entity.name || entity.observable_value || entity.entity_type,
          });
        }
      }

      const resolveId = (id) => uuidToCanonical.get(id) || id;
      const nodes = Array.from(nodeMap.values());
      const links = relationships.map(rel => ({
        source: resolveId(rel.from?.id) || centerQuery,
        target: resolveId(rel.to?.id) || centerQuery,
        label: rel.relationship_type,
      }));

      const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);

      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(120))
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(40));

      const link = svg.append('g').selectAll('line').data(links).join('line')
        .attr('stroke', '#2A2D3E').attr('stroke-width', 1.5).attr('stroke-dasharray', '4,4');

      const linkLabel = svg.append('g').selectAll('text').data(links).join('text')
        .text(d => d.label).attr('fill', '#5A6173').attr('font-size', '9px')
        .attr('font-family', 'JetBrains Mono').attr('text-anchor', 'middle');

      const node = svg.append('g').selectAll('g').data(nodes).join('g')
        .call(d3.drag()
          .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

      node.append('circle')
        .attr('r', d => d.id === centerQuery ? 20 : 14)
        .attr('fill', d => entityColor(d.type) + '30')
        .attr('stroke', d => entityColor(d.type)).attr('stroke-width', 2);

      node.append('text')
        .text(d => d.label.length > 20 ? d.label.slice(0, 17) + '...' : d.label)
        .attr('fill', '#E8EAED').attr('font-size', '10px')
        .attr('font-family', 'JetBrains Mono').attr('text-anchor', 'middle')
        .attr('dy', d => d.id === centerQuery ? 32 : 26);

      simulation.on('tick', () => {
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        linkLabel.attr('x', d => (d.source.x + d.target.x) / 2)
                 .attr('y', d => (d.source.y + d.target.y) / 2 - 5);
        node.attr('transform', d => `translate(${d.x},${d.y})`);
      });

      cleanup = () => { simulation.stop(); svg.remove(); };
    });

    return () => { if (cleanup) cleanup(); };
  }, [relationships, centerQuery]);

  return (
    <div
      ref={containerRef}
      style={{ height: '450px', background: '#0A0B10', borderRadius: '0.75rem', border: '1px solid #1E2030' }}
    />
  );
}

/* ── Helpers ── */
function threatLevel(score) {
  if (score >= 70) return { label: 'Malicious', color: 'text-red' };
  if (score >= 40) return { label: 'Suspicious', color: 'text-amber' };
  return { label: 'Low Risk', color: 'text-green' };
}

function scoreRingColor(score) {
  if (score >= 70) return '#FF3B5C';
  if (score >= 40) return '#FFB020';
  return '#00C48C';
}

function countryFlag(code) {
  if (!code || code.length !== 2) return '';
  const codePoints = [...code.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/* ── Tab Content Components ── */

function SummaryTab({ result }) {
  const geo = result.geo;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Threat Classifications */}
        <div className="glass-card p-5">
          <h3 className="section-title">Threat Classifications</h3>
          {result.labels?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {result.labels.map((lbl, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full text-xs font-mono font-medium"
                  style={{
                    backgroundColor: (lbl.color || '#7A44E4') + '33',
                    color: lbl.color || '#7A44E4',
                  }}
                >
                  {lbl.value}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No classifications available</p>
          )}
        </div>

        {/* Intelligence Sources */}
        <div className="glass-card p-5">
          <h3 className="section-title">Intelligence Sources</h3>
          <div className="space-y-2">
            {result.created_by && (
              <div className="p-2 rounded bg-surface-2">
                <span className="text-sm font-medium">{result.created_by}</span>
              </div>
            )}
            {result.description && (
              <p className="text-xs text-text-secondary mt-2">{result.description}</p>
            )}
            {!result.created_by && !result.description && (
              <p className="text-sm text-text-muted">No source information available</p>
            )}
          </div>
        </div>
      </div>

      {/* Geolocation & Network */}
      {geo && (
        <div className="glass-card p-5">
          <h3 className="section-title flex items-center gap-2">
            <Globe size={16} className="text-cyan" />
            Geolocation &amp; Network
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
            <GeoField label="Country" value={geo.country ? `${countryFlag(geo.country_code)} ${geo.country}` : '--'} />
            <GeoField label="City" value={geo.city || '--'} />
            <GeoField label="Region" value={geo.region || '--'} />
            <GeoField label="ASN" value={geo.as || '--'} />
            <GeoField label="AS Name" value={geo.asname || '--'} />
            <GeoField label="ISP" value={geo.isp || '--'} />
            <GeoField label="Organization" value={geo.org || '--'} />
            <GeoField label="Coordinates" value={geo.lat != null ? `${geo.lat}, ${geo.lon}` : '--'} />
          </div>
        </div>
      )}
    </div>
  );
}

function GeoField({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-text-muted font-mono mb-1">{label}</div>
      <div className="text-sm font-mono">{value}</div>
    </div>
  );
}

function ExternalRefsTab({ refs }) {
  return (
    <div className="space-y-3">
      {refs.map((ref, i) => (
        <div key={i} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <ExternalLink size={14} className="text-cyan" />
            <span className="font-heading font-semibold text-sm">{ref.source_name}</span>
          </div>
          {ref.url && (
            <a
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan hover:underline break-all"
            >
              {ref.url}
            </a>
          )}
          {ref.description && (
            <p className="text-xs text-text-secondary mt-2">{ref.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function IndicatorsTab({ indicators }) {
  const { formatDate } = useFormatDate();
  return (
    <div className="space-y-3">
      {indicators.map((ind, i) => (
        <div key={i} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Shield size={14} className="text-violet" />
            <span className="font-heading font-semibold text-sm">{ind.name || 'Unnamed Indicator'}</span>
            {ind.score != null && (
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium"
                style={{
                  backgroundColor: (ind.score >= 70 ? '#FF3B5C' : ind.score >= 40 ? '#FFB020' : '#00C48C') + '25',
                  color: ind.score >= 70 ? '#FF3B5C' : ind.score >= 40 ? '#FFB020' : '#00C48C',
                }}
              >
                Score: {ind.score}
              </span>
            )}
            {ind.pattern_type && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-cyan/15 text-cyan uppercase">
                {ind.pattern_type}
              </span>
            )}
          </div>
          {ind.pattern && (
            <pre className="text-xs font-mono text-cyan bg-primary rounded p-2 mt-1 overflow-x-auto border border-border">
              {ind.pattern}
            </pre>
          )}
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-text-muted font-mono">
            {ind.valid_from && <span>From: {formatDate(ind.valid_from)}</span>}
            {ind.valid_until && <span>Until: {formatDate(ind.valid_until)}</span>}
          </div>
          {ind.labels?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {ind.labels.map((lbl, j) => (
                <span
                  key={j}
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono"
                  style={{
                    backgroundColor: (lbl.color || '#7A44E4') + '33',
                    color: lbl.color || '#7A44E4',
                  }}
                >
                  {lbl.value || lbl}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SightingsTab({ sightings }) {
  const { formatDate } = useFormatDate();
  return (
    <div className="space-y-3">
      {sightings.map((s, i) => (
        <div key={i} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Eye size={14} className="text-amber" />
            <span className="font-heading font-semibold text-sm">
              {s.from?.name || s.from?.observable_value || 'Unknown'} → {s.to?.name || s.to?.observable_value || 'Unknown'}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono text-text-secondary">
            <div><span className="text-text-muted">First Seen:</span> {formatDate(s.first_seen)}</div>
            <div><span className="text-text-muted">Last Seen:</span> {formatDate(s.last_seen)}</div>
            <div><span className="text-text-muted">Count:</span> {s.count ?? '--'}</div>
            <div><span className="text-text-muted">Confidence:</span> {s.confidence ?? '--'}%</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function NotesTab({ notes }) {
  const { formatDate } = useFormatDate();
  return (
    <div className="space-y-3">
      {notes.map((note, i) => (
        <div key={i} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <StickyNote size={14} className="text-green" />
            {note.abstract && (
              <span className="font-heading font-semibold text-sm">{note.abstract}</span>
            )}
            <span className="ml-auto text-xs text-text-muted font-mono">{formatDate(note.created)}</span>
          </div>
          {note.content && (
            <p className="text-xs text-text-secondary whitespace-pre-wrap">{note.content}</p>
          )}
          {note.labels?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {note.labels.map((lbl, j) => (
                <span
                  key={j}
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono"
                  style={{
                    backgroundColor: (lbl.color || '#7A44E4') + '33',
                    color: lbl.color || '#7A44E4',
                  }}
                >
                  {lbl.value || lbl}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RawTab({ result }) {
  return (
    <div className="glass-card p-5">
      <pre className="bg-primary rounded-lg p-4 text-xs font-mono text-text-secondary overflow-auto max-h-[500px] border border-border">
        {JSON.stringify(result.raw || result, null, 2)}
      </pre>
    </div>
  );
}

/* ── Recent Search History Section ── */

function RecentSearchesSection({ isAuthenticated, history, historyLoading, historyError, onSelect }) {
  // Guest CTA
  if (!isAuthenticated) {
    return (
      <div className="glass-card p-5 flex flex-col items-center justify-center text-center py-8">
        <div className="w-12 h-12 rounded-xl bg-violet/10 flex items-center justify-center text-violet mb-4">
          <LogIn size={24} />
        </div>
        <p className="text-sm text-text-secondary mb-4 font-mono">Sign in to track your search history</p>
        <Link to="/login" className="btn-primary text-sm">Sign In</Link>
      </div>
    );
  }

  // Loading skeleton
  if (historyLoading) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-cyan/10 flex items-center justify-center text-cyan"><Clock size={18} /></div>
          <h3 className="font-heading font-semibold text-sm">Recent Searches</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-6 bg-surface-2 rounded animate-pulse" />)}
        </div>
      </div>
    );
  }

  // Error state -- silent fallback, just don't show history
  if (historyError) {
    return null;
  }

  // Empty state
  if (history.length === 0) {
    return (
      <div className="glass-card p-5 flex flex-col items-center justify-center text-center py-8">
        <div className="w-12 h-12 rounded-xl bg-cyan/10 flex items-center justify-center text-cyan mb-4">
          <Clock size={24} />
        </div>
        <p className="text-sm text-text-secondary font-mono">No searches yet -- try searching an IP, domain, or hash above</p>
      </div>
    );
  }

  // History list (up to 10 entries)
  const items = history.slice(0, 10);
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-cyan/10 flex items-center justify-center text-cyan"><Clock size={18} /></div>
        <h3 className="font-heading font-semibold text-sm">Recent Searches</h3>
      </div>
      <div className="space-y-1">
        {items.map((s) => {
          const badge = TYPE_BADGE_COLORS[s.type] || { bg: '#7A44E425', text: '#7A44E4' };
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s)}
              className="w-full flex items-center justify-between gap-3 py-2 px-2 rounded-lg hover:bg-surface-2/50 transition-colors cursor-pointer text-left"
            >
              <span className="font-mono text-xs text-text-primary truncate max-w-[300px]">{s.query}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold"
                  style={{ backgroundColor: badge.bg, color: badge.text }}
                >
                  {s.type}
                </span>
                <span className="text-[10px] text-text-muted">{formatRelativeTime(s.created_at)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Page Component ── */

export default function ThreatSearchPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [credits, setCredits] = useState({ remaining: 0, limit: 0, is_guest: false, resets_at: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const { isAuthenticated, user } = useAuth();
  const { formatDate } = useFormatDate();
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const inputRef = useRef(null);

  const isExhausted = credits.remaining === 0 && credits.limit > 0;

  // Fetch credits on page load
  useEffect(() => {
    fetchCredits()
      .then((data) => setCredits(data))
      .catch(() => {});
  }, []);

  // Fetch search history on mount (auth-only, once)
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setHistoryLoading(true);
    apiClient.get('/api/search-history')
      .then(res => { if (!cancelled) { setHistory(res.data || []); setHistoryError(null); } })
      .catch(err => { if (!cancelled) setHistoryError(err); })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Build dynamic tabs from result
  const tabs = useMemo(() => {
    if (!result) return [];
    const t = [{ key: 'summary', label: 'Summary', icon: FileText }];
    if (result.relationships?.length > 0) {
      t.push({ key: 'relations', label: 'Relations', icon: Network });
    }
    if (result.external_references?.length > 0) {
      t.push({ key: 'external_refs', label: 'External References', icon: ExternalLink });
    }
    if (result.indicators?.length > 0) {
      t.push({ key: 'indicators', label: 'Indicators', icon: Shield });
    }
    if (result.sightings?.length > 0) {
      t.push({ key: 'sightings', label: 'Sightings & History', icon: Eye });
    }
    if (result.notes?.length > 0) {
      t.push({ key: 'notes', label: 'Notes', icon: StickyNote });
    }
    t.push({ key: 'raw', label: 'Raw', icon: Code });
    return t;
  }, [result]);

  async function handleSearch(e) {
    e?.preventDefault();
    if (loading || isExhausted || !query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await searchThreat({ query: query.trim() });
      setResult(response.data);
      if (response.credits) {
        setCredits(response.credits);
      }
      setActiveTab('summary');
    } catch (err) {
      const status = err.status || 500;
      if (status === 502) {
        setError({ status: 502, message: err.message || 'Search failed' });
        if (err.credits) setCredits(err.credits);
        // Keep previous result visible
      } else if (status === 429) {
        if (err.credits) setCredits(err.credits);
        // Keep previous result visible
      } else if (status === 422) {
        setError({ status: 422, message: err.message || 'Invalid input' });
        setResult(null);
      } else {
        setError({ status, message: err.message || 'Something went wrong' });
      }
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  }

  function handleHistoryClick(entry) {
    setQuery(entry.query);
    inputRef.current?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const level = result?.found ? threatLevel(result.score) : null;
  const ringColor = result?.found ? scoreRingColor(result.score) : null;
  const circumference = 2 * Math.PI * 26; // r=26
  const dashOffset = result?.found
    ? circumference - (result.score / 100) * circumference
    : circumference;

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-heading text-xl font-bold">Threat Search</h1>
            <p className="text-sm text-text-muted mt-1">Search IPs, domains, hostnames, emails, etc ...</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              placeholder="e.g., 185.220.101.34, example.com, d41d8cd98f00b204e9800998ecf8427e"
              className="input-mono w-full py-3"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
          </div>
          <button
            className="btn-primary px-8"
            disabled={isExhausted || loading || !query.trim()}
            onClick={handleSearch}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
          <CreditBadge remaining={credits.remaining} limit={credits.limit} />
        </div>

        {/* Guest exhausted CTA */}
        {isExhausted && !isAuthenticated && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-violet/10 border border-violet/20">
            <LogIn size={16} className="text-violet shrink-0" />
            <span className="text-sm font-mono text-text-secondary">
              You've used your free lookup.{' '}
              <Link to="/login" className="text-violet hover:text-violet-light underline underline-offset-2">
                Sign in for more lookups
              </Link>
            </span>
          </div>
        )}

        {/* Auth exhausted CTA -- plan-aware */}
        {isExhausted && isAuthenticated && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-amber/10 border border-amber/20">
            <Clock size={16} className="text-amber shrink-0" />
            <span className="text-sm font-mono text-text-secondary">
              {(() => {
                const planSlug = user?.plan?.slug;
                const limit = credits.limit;
                switch (planSlug) {
                  case 'free':
                    return <>Daily limit reached (0/{limit}). <Link to="/pricing" className="text-violet underline">Upgrade to Basic for 15/day</Link></>;
                  case 'basic':
                    return <>Daily limit reached (0/{limit}). <Link to="/pricing" className="text-violet underline">Upgrade to Pro for 50/day</Link></>;
                  case 'pro':
                    return <>Daily limit reached (0/{limit}). Resets tomorrow at midnight {credits.resets_at && <span className="text-text-muted">({formatDate(credits.resets_at)})</span>}</>;
                  case 'enterprise':
                    return <>Daily limit reached (0/{limit}). Resets tomorrow at midnight {credits.resets_at && <span className="text-text-muted">({formatDate(credits.resets_at)})</span>}</>;
                  default:
                    return <>Daily limit reached (0/{limit}). <Link to="/pricing" className="text-violet underline">View plans for more searches</Link></>;
                }
              })()}
            </span>
          </div>
        )}
      </div>

      {/* Error State (502) */}
      {error?.status === 502 && (
        <div className="glass-card p-5 border-red/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red/10">
              <AlertTriangle size={20} className="text-red" />
            </div>
            <div>
              <div className="font-heading font-semibold text-red">Search failed -- credit refunded</div>
              <p className="text-sm text-text-secondary mt-1">{error.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Validation Error (422) */}
      {error?.status === 422 && (
        <div className="glass-card p-5 border-amber/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber/10">
              <AlertTriangle size={20} className="text-amber" />
            </div>
            <div>
              <div className="font-heading font-semibold text-amber">Invalid input</div>
              <p className="text-sm text-text-secondary mt-1">{error.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {result !== null && (
        <>
          {result.found ? (
            <div className="glass-card p-5">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="score-ring">
                    <svg width="64" height="64" viewBox="0 0 64 64">
                      <circle className="score-track" cx="32" cy="32" r="26" strokeWidth="4" />
                      <circle
                        className="score-fill"
                        cx="32" cy="32" r="26"
                        stroke={ringColor}
                        strokeWidth="4"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                      />
                    </svg>
                    <div className={`score-value text-lg ${level.color}`}>{result.score}</div>
                  </div>
                  <div>
                    <div className="font-heading font-semibold text-lg flex items-center gap-2">
                      {result.query}
                      {result.detected_type && (
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium"
                          style={{
                            backgroundColor: (TYPE_BADGE_COLORS[result.detected_type]?.bg || '#5A617325'),
                            color: (TYPE_BADGE_COLORS[result.detected_type]?.text || '#5A6173'),
                          }}
                        >
                          {result.detected_type}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-text-muted">
                      Threat Score: <span className={`${level.color} font-semibold`}>{level.label}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-6 ml-auto text-center">
                  <div>
                    <div className="text-xl font-heading font-bold text-cyan">
                      {result.relationships?.length || 0}
                    </div>
                    <div className="text-[10px] text-text-muted uppercase">Relations</div>
                  </div>
                  <div>
                    <div className="text-xl font-heading font-bold text-violet">
                      {result.labels?.length || 0}
                    </div>
                    <div className="text-[10px] text-text-muted uppercase">Labels</div>
                  </div>
                  <div>
                    <div className="text-xl font-heading font-bold text-amber">
                      {result.indicators?.length || 0}
                    </div>
                    <div className="text-[10px] text-text-muted uppercase">Indicators</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-green/10">
                  <ShieldCheck size={24} className="text-green" />
                </div>
                <div>
                  <div className="font-heading font-semibold text-green">No threats found for {result.query}</div>
                  <p className="text-sm text-text-secondary mt-1">
                    No known threat intelligence found in our database.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          {tabs.length > 0 && (
            <div className="tab-bar">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'summary' && <SummaryTab result={result} />}

          {activeTab === 'relations' && result.relationships?.length > 0 && (
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="section-title mb-0">Relationship Graph</h3>
                <div className="flex gap-2">
                  <span className="chip-red text-[10px]">Observable</span>
                  <span className="chip-violet text-[10px]">Malware</span>
                  <span className="chip-amber text-[10px]">Threat Actor</span>
                  <span className="chip-cyan text-[10px]">Attack Pattern</span>
                </div>
              </div>
              <D3Graph
                key={result.query}
                relationships={result.relationships}
                centerQuery={result.query}
                detectedType={result.detected_type}
              />
            </div>
          )}

          {activeTab === 'external_refs' && result.external_references?.length > 0 && (
            <ExternalRefsTab refs={result.external_references} />
          )}

          {activeTab === 'indicators' && result.indicators?.length > 0 && (
            <IndicatorsTab indicators={result.indicators} />
          )}

          {activeTab === 'sightings' && result.sightings?.length > 0 && (
            <SightingsTab sightings={result.sightings} />
          )}

          {activeTab === 'notes' && result.notes?.length > 0 && (
            <NotesTab notes={result.notes} />
          )}

          {activeTab === 'raw' && <RawTab result={result} />}
        </>
      )}

      {/* Recent Search History -- shown when no search result is active */}
      {result === null && (
        <RecentSearchesSection
          isAuthenticated={isAuthenticated}
          history={history}
          historyLoading={historyLoading}
          historyError={historyError}
          onSelect={handleHistoryClick}
        />
      )}
    </div>
  );
}
