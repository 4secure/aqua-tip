import { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  LogIn, Clock, Shield, ShieldCheck, AlertTriangle,
  Network, FileText, Eye, StickyNote, Code, ExternalLink, Globe,
} from 'lucide-react';
import { CreditBadge } from '../components/shared/CreditBadge';
import { searchIpAddress, fetchCredits } from '../api/ip-search';
import { useAuth } from '../contexts/AuthContext';

/* ── Entity type → color mapping for D3 graph ── */
const ENTITY_COLORS = {
  'IPv4-Addr': '#FF3B5C',
  'IPv6-Addr': '#FF3B5C',
  'Malware': '#7A44E4',
  'Threat-Actor': '#FFB020',
  'Intrusion-Set': '#FFB020',
  'Attack-Pattern': '#00E5FF',
};
const DEFAULT_ENTITY_COLOR = '#5A6173';

function entityColor(entityType) {
  return ENTITY_COLORS[entityType] || DEFAULT_ENTITY_COLOR;
}

/* ── D3 Force-Directed Relationship Graph ── */
function D3Graph({ relationships, centerIp }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !relationships?.length) return;

    let cleanup = null;

    import('d3').then(d3 => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      // Build nodes from relationships
      const nodeMap = new Map();
      nodeMap.set(centerIp, { id: centerIp, type: 'IPv4-Addr', label: centerIp });

      for (const rel of relationships) {
        for (const entity of [rel.from, rel.to]) {
          if (!entity || nodeMap.has(entity.id)) continue;
          nodeMap.set(entity.id, {
            id: entity.id,
            type: entity.entity_type,
            label: entity.name || entity.observable_value || entity.entity_type,
          });
        }
      }

      const nodes = Array.from(nodeMap.values());
      const links = relationships.map(rel => ({
        source: rel.from?.id || centerIp,
        target: rel.to?.id || centerIp,
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
        .attr('r', d => d.id === centerIp ? 20 : 14)
        .attr('fill', d => entityColor(d.type) + '30')
        .attr('stroke', d => entityColor(d.type)).attr('stroke-width', 2);

      node.append('text')
        .text(d => d.label.length > 20 ? d.label.slice(0, 17) + '...' : d.label)
        .attr('fill', '#E8EAED').attr('font-size', '10px')
        .attr('font-family', 'JetBrains Mono').attr('text-anchor', 'middle')
        .attr('dy', d => d.id === centerIp ? 32 : 26);

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
  }, [relationships, centerIp]);

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

function formatDate(dateStr) {
  if (!dateStr) return '--';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return dateStr;
  }
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
            <GeoField label="ASN" value={geo.asn || '--'} />
            <GeoField label="AS Name" value={geo.as_name || '--'} />
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
  return (
    <div className="space-y-3">
      {indicators.map((ind, i) => (
        <div key={i} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-violet" />
            <span className="font-heading font-semibold text-sm">{ind.name || 'Unnamed Indicator'}</span>
            {ind.score != null && (
              <span className="ml-auto text-xs font-mono text-text-muted">Score: {ind.score}</span>
            )}
          </div>
          {ind.pattern && (
            <pre className="text-xs font-mono text-cyan bg-primary rounded p-2 mt-1 overflow-x-auto border border-border">
              {ind.pattern}
            </pre>
          )}
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-text-muted font-mono">
            {ind.pattern_type && <span>Type: {ind.pattern_type}</span>}
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

/* ── Main Page Component ── */

export default function IpSearchPage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [credits, setCredits] = useState({ remaining: 0, limit: 0, is_guest: false, resets_at: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const { isAuthenticated } = useAuth();

  const isExhausted = credits.remaining === 0 && credits.limit > 0;

  // Fetch credits on page load
  useEffect(() => {
    fetchCredits()
      .then((data) => setCredits(data))
      .catch(() => {});
  }, []);

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
      const response = await searchIpAddress({ query: query.trim() });
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
        setError({ status: 422, message: err.message || 'Invalid IP address' });
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
            <h1 className="font-heading text-xl font-bold">IP Search</h1>
            <p className="text-sm text-text-muted mt-1">Search any IP address -- IPv4 and IPv6 supported</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Enter an IP address (e.g. 185.220.101.34 or 2001:db8::1)"
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

        {/* Auth exhausted CTA */}
        {isExhausted && isAuthenticated && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-amber/10 border border-amber/20">
            <Clock size={16} className="text-amber shrink-0" />
            <span className="text-sm font-mono text-text-secondary">
              Daily limit reached. Your 10 searches refuel at midnight UTC.
              {credits.resets_at && (
                <span className="ml-1 text-text-muted">
                  (Resets: {formatDate(credits.resets_at)})
                </span>
              )}
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
                    <div className="font-heading font-semibold text-lg">{result.ip}</div>
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
                  <div className="font-heading font-semibold text-green">No threats found for {result.ip}</div>
                  <p className="text-sm text-text-secondary mt-1">
                    This IP has no known threat intelligence in our database.
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
                <h3 className="section-title mb-0">IP Relationship Graph</h3>
                <div className="flex gap-2">
                  <span className="chip-red text-[10px]">IP</span>
                  <span className="chip-violet text-[10px]">Malware</span>
                  <span className="chip-amber text-[10px]">Threat Actor</span>
                  <span className="chip-cyan text-[10px]">Attack Pattern</span>
                </div>
              </div>
              <D3Graph
                key={result.ip}
                relationships={result.relationships}
                centerIp={result.ip}
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
    </div>
  );
}
