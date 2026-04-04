import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Shield, AlertTriangle, RotateCcw, ExternalLink, X, Globe, Crosshair, Clock, ChevronLeft, ChevronRight, Swords, Bug, Flag, GitBranch, Info, Loader } from 'lucide-react';
import { fetchThreatActors, fetchThreatActorEnrichment } from '../api/threat-actors';
import { useFormatDate } from '../hooks/useFormatDate';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import SkeletonCard from '../components/shared/SkeletonCard';

const PAGE_SIZE = 24;

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

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = { sort: 'modified', order: 'desc' };
      if (after) params.after = after;
      if (search) params.search = search;

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
  }, [after, search]);

  const silentRefresh = useCallback(async () => {
    try {
      const params = { sort: 'modified', order: 'desc' };
      if (after) params.after = after;
      if (search) params.search = search;
      const response = await fetchThreatActors(params);
      const data = response.data || response;
      setItems(data.items || []);
      setPagination(data.pagination || null);
    } catch {
      // D-07: Keep stale data visible, retry next interval
    }
  }, [after, search]);

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
          Threat Actors
        </h1>
        <p className="font-mono text-sm text-text-muted">
          Browse known threat actor profiles
        </p>
      </div>

      {/* Toolbar: Search + Pagination */}
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
            placeholder="Search Threat Actors, Keywords..."
            className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border text-text-primary rounded-lg font-mono text-sm placeholder:text-text-muted focus:outline-none focus:border-violet transition-colors"
          />
        </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <SkeletonCard count={8} />
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <Shield size={48} className="text-text-muted mb-4" />
          <p className="font-sans text-lg text-text-muted">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((actor) => (
              <ThreatActorCard
                key={actor.id}
                actor={actor}
                onClick={() => setSelectedActor(actor)}
              />
            ))}
          </div>
        </>
      )}

      {/* Detail Modal — portal to body to escape sidebar/topbar stacking contexts */}
      {createPortal(
        <AnimatePresence>
          {selectedActor && (
            <ThreatActorModal
              actor={selectedActor}
              onClose={() => setSelectedActor(null)}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

/* ── Threat Actor Card ── */

function ThreatActorCard({ actor, onClick }) {
  const { formatDate } = useFormatDate();
  return (
    <div
      onClick={onClick}
      className="bg-surface/60 border border-border backdrop-blur-sm rounded-xl p-5 cursor-pointer hover:border-violet/40 transition-colors"
    >
      <h3 className="font-sans text-lg font-bold text-text-primary mb-1">
        {actor.name}
      </h3>

      {/* Modified date */}
      {actor.modified && (
        <p className="flex items-center gap-1.5 font-mono text-xs text-text-muted mb-2">
          <Clock size={12} />
          {formatDate(actor.modified)}
        </p>
      )}

      {actor.aliases?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {actor.aliases.slice(0, 3).map((alias) => (
            <span
              key={alias}
              className="bg-surface-2 text-cyan text-xs px-2 py-0.5 rounded-full font-mono"
            >
              {alias}
            </span>
          ))}
          {actor.aliases.length > 3 && (
            <span className="bg-surface-2 text-text-muted text-xs px-2 py-0.5 rounded-full font-mono">
              +{actor.aliases.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Targeted Countries */}
      {actor.targeted_countries?.length > 0 && (
        <div className="flex items-start gap-1.5 mb-2">
          <Globe size={13} className="text-cyan shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-1">
            {actor.targeted_countries.slice(0, 3).map((country) => (
              <span key={country} className="font-mono text-xs text-text-muted">
                {country}{actor.targeted_countries.indexOf(country) < Math.min(actor.targeted_countries.length, 3) - 1 ? ',' : ''}
              </span>
            ))}
            {actor.targeted_countries.length > 3 && (
              <span className="font-mono text-xs text-text-muted">
                +{actor.targeted_countries.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Targeted Sectors */}
      {actor.targeted_sectors?.length > 0 && (
        <div className="flex items-start gap-1.5 mb-3">
          <Crosshair size={13} className="text-amber shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-1">
            {actor.targeted_sectors.slice(0, 3).map((sector) => (
              <span key={sector} className="font-mono text-xs text-text-muted">
                {sector}{actor.targeted_sectors.indexOf(sector) < Math.min(actor.targeted_sectors.length, 3) - 1 ? ',' : ''}
              </span>
            ))}
            {actor.targeted_sectors.length > 3 && (
              <span className="font-mono text-xs text-text-muted">
                +{actor.targeted_sectors.length - 3} more
              </span>
            )}
          </div>
        </div>
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

/* ── Relationship Graph (D3 force-directed) ── */

function RelationshipGraph({ relationships, actorName, actorId }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !relationships?.length) return;

    let cleanup = null;

    import('d3').then(d3 => {
      const width = container.clientWidth || 500;
      const height = container.clientHeight || 600;

      const ENTITY_COLORS = {
        'IPv4-Addr': '#FF3B5C',
        'IPv6-Addr': '#FF3B5C',
        'Malware': '#7A44E4',
        'Threat-Actor': '#FFB020',
        'Intrusion-Set': '#FFB020',
        'Attack-Pattern': '#00E5FF',
        'Domain-Name': '#00E5FF',
        'Tool': '#00C48C',
        'Campaign': '#FF3B5C',
        'Identity': '#9B6BF7',
        'Sector': '#9B6BF7',
        'Country': '#00C48C',
      };
      const DEFAULT_COLOR = '#5A6173';
      const eColor = (type) => ENTITY_COLORS[type] || DEFAULT_COLOR;

      // Build nodes
      const nodeMap = new Map();
      nodeMap.set(actorId, { id: actorId, type: 'Intrusion-Set', label: actorName });

      for (const rel of relationships) {
        for (const entity of [rel.from, rel.to]) {
          if (!entity || entity.id === actorId) continue;
          if (nodeMap.has(entity.id)) continue;
          nodeMap.set(entity.id, {
            id: entity.id,
            type: entity.entity_type,
            label: (entity.name || entity.entity_type || '').slice(0, 25),
          });
        }
      }

      const nodes = Array.from(nodeMap.values());
      nodes.forEach(n => {
        n.x = width / 2 + (Math.random() - 0.5) * width * 0.4;
        n.y = height / 2 + (Math.random() - 0.5) * height * 0.4;
      });

      const links = relationships
        .filter(rel => rel.from && rel.to)
        .map(rel => ({
          source: rel.from.id === actorId ? actorId : rel.from.id,
          target: rel.to.id === actorId ? actorId : rel.to.id,
          label: rel.relationship_type,
        }));

      const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);

      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(35));

      const link = svg.append('g').selectAll('line').data(links).join('line')
        .attr('stroke', '#2A2D3E').attr('stroke-width', 1.5).attr('stroke-dasharray', '4,4');

      const linkLabel = svg.append('g').selectAll('text').data(links).join('text')
        .text(d => d.label).attr('fill', '#5A6173').attr('font-size', '8px')
        .attr('font-family', 'JetBrains Mono').attr('text-anchor', 'middle');

      const node = svg.append('g').selectAll('g').data(nodes).join('g')
        .call(d3.drag()
          .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

      node.append('circle')
        .attr('r', d => d.id === actorId ? 18 : 12)
        .attr('fill', d => eColor(d.type) + '30')
        .attr('stroke', d => eColor(d.type)).attr('stroke-width', 2);

      node.append('text')
        .text(d => d.label.length > 18 ? d.label.slice(0, 15) + '...' : d.label)
        .attr('fill', '#E8EAED').attr('font-size', '9px')
        .attr('font-family', 'JetBrains Mono').attr('text-anchor', 'middle')
        .attr('dy', d => d.id === actorId ? 28 : 22);

      simulation.on('tick', () => {
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        linkLabel.attr('x', d => (d.source.x + d.target.x) / 2)
                 .attr('y', d => (d.source.y + d.target.y) / 2 - 4);
        node.attr('transform', d => `translate(${d.x},${d.y})`);
      });

      cleanup = () => { simulation.stop(); svg.remove(); };
    });

    return () => { if (cleanup) cleanup(); };
  }, [relationships, actorName, actorId]);

  return (
    <div
      ref={containerRef}
      style={{ height: 'calc(95vh - 200px)', background: '#0A0B10', borderRadius: '0.75rem', border: '1px solid #1E2030' }}
    />
  );
}

/* ── Threat Actor Modal ── */

function ThreatActorModal({ actor, onClose }) {
  const { formatDate } = useFormatDate();
  const [activeTab, setActiveTab] = useState('overview');
  const [enrichment, setEnrichment] = useState(null);
  const [enrichLoading, setEnrichLoading] = useState(true);
  const [enrichError, setEnrichError] = useState(null);

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

  // Fetch enrichment data once on modal open
  useEffect(() => {
    let cancelled = false;
    setEnrichLoading(true);
    setEnrichError(null);
    setEnrichment(null);
    setActiveTab('overview');
    fetchThreatActorEnrichment(actor.id)
      .then(res => { if (!cancelled) setEnrichment(res.data); })
      .catch(err => { if (!cancelled) setEnrichError(err.message || 'Failed to load enrichment data'); })
      .finally(() => { if (!cancelled) setEnrichLoading(false); });
    return () => { cancelled = true; };
  }, [actor.id]);

  const TABS = [
    { key: 'overview', label: 'Overview', icon: Info },
    { key: 'relationships', label: 'Relationships', icon: GitBranch },
    { key: 'ttps', label: 'TTPs', icon: Swords },
    { key: 'tools', label: 'Tools', icon: Bug },
    { key: 'campaigns', label: 'Campaigns', icon: Flag },
  ];

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
        className="relative w-full max-w-4xl h-[95vh] overflow-y-auto bg-surface border border-border rounded-2xl p-6 shadow-2xl"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-surface-2 transition-colors"
        >
          <X size={18} className="text-text-muted" />
        </button>

        {/* ── Fixed Header ── */}
        <h2 className="font-sans text-2xl font-bold text-text-primary mb-1 pr-10">
          {actor.name}
        </h2>

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

        {actor.modified && (
          <p className="flex items-center gap-1.5 font-mono text-xs text-text-muted mb-4">
            <Clock size={12} />
            Modified {formatDate(actor.modified)}
          </p>
        )}

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

        {/* ── Tab Bar ── */}
        <div className="tab-bar !mb-4">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`tab-item flex items-center gap-1.5 ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}

        {/* Error state for enrichment tabs */}
        {enrichError && activeTab !== 'overview' && (
          <div className="flex flex-col items-center justify-center py-8 text-text-muted">
            <AlertTriangle size={32} className="mb-2 opacity-40 text-amber" />
            <p className="text-sm">Failed to load enrichment data</p>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {actor.description && (
              <div className="mb-5">
                <h3 className="text-xs font-sans text-text-muted uppercase tracking-wider mb-1.5">
                  Description
                </h3>
                <p className="font-mono text-sm text-text-primary whitespace-pre-line leading-relaxed">
                  {actor.description}
                </p>
              </div>
            )}

            {actor.goals?.length > 0 && (
              <div className="mb-5">
                <h3 className="text-xs font-sans text-text-muted uppercase tracking-wider mb-1.5">
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

            {actor.targeted_countries?.length > 0 && (
              <div className="mb-5">
                <h3 className="text-xs font-sans text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Globe size={12} />
                  Targeted Countries
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {actor.targeted_countries.map((country) => (
                    <span
                      key={country}
                      className="bg-cyan/10 text-cyan px-2.5 py-1 rounded-full text-xs font-mono"
                    >
                      {country}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {actor.targeted_sectors?.length > 0 && (
              <div className="mb-5">
                <h3 className="text-xs font-sans text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Crosshair size={12} />
                  Targeted Sectors
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {actor.targeted_sectors.map((sector) => (
                    <span
                      key={sector}
                      className="bg-amber/10 text-amber px-2.5 py-1 rounded-full text-xs font-mono"
                    >
                      {sector}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {actor.external_references?.length > 0 && (
              <div>
                <h3 className="text-xs font-sans text-text-muted uppercase tracking-wider mb-1.5">
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
          </div>
        )}

        {/* TTPs Tab */}
        {activeTab === 'ttps' && !enrichError && (
          <div>
            {enrichLoading && (
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i}>
                    <div className="h-4 bg-surface-2 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-surface-2 rounded w-3/4 ml-4 mb-1" />
                    <div className="h-3 bg-surface-2 rounded w-3/4 ml-4" />
                  </div>
                ))}
              </div>
            )}
            {!enrichLoading && enrichment?.ttps?.length > 0 && (
              <div>
                {enrichment.ttps.map((group, gi) => (
                  <div key={gi}>
                    <h4 className="font-sans text-sm font-semibold text-violet-light mb-2">{group.tactic_label}</h4>
                    <ul className="space-y-1 ml-4 mb-4">
                      {group.techniques.map((technique, ti) => (
                        <li key={ti} className="font-mono text-sm text-text-primary flex items-start gap-2">
                          <span className="text-cyan mt-0.5">&#x2022;</span>
                          {technique.name}
                          {technique.mitre_id && (
                            <span className="text-xs text-text-muted font-mono">({technique.mitre_id})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {!enrichLoading && (!enrichment?.ttps || enrichment.ttps.length === 0) && (
              <div className="flex flex-col items-center justify-center py-8 text-text-muted">
                <Swords size={32} className="mb-2 opacity-40" />
                <p className="text-sm">No TTPs found for this actor</p>
              </div>
            )}
          </div>
        )}

        {/* Tools Tab */}
        {activeTab === 'tools' && !enrichError && (
          <div>
            {enrichLoading && (
              <div className="animate-pulse flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-7 bg-surface-2 rounded-full w-24" />
                ))}
              </div>
            )}
            {!enrichLoading && (enrichment?.tools?.length > 0 || enrichment?.malware?.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {(enrichment.tools || []).map(t => (
                  <span key={t.id} className="bg-cyan/15 text-cyan px-3 py-1.5 rounded-full text-xs font-mono">
                    {t.name}
                  </span>
                ))}
                {(enrichment.malware || []).map(m => (
                  <span key={m.id} className="bg-red/15 text-red px-3 py-1.5 rounded-full text-xs font-mono">
                    {m.name}
                  </span>
                ))}
              </div>
            )}
            {!enrichLoading && (!enrichment?.tools || enrichment.tools.length === 0) && (!enrichment?.malware || enrichment.malware.length === 0) && (
              <div className="flex flex-col items-center justify-center py-8 text-text-muted">
                <Bug size={32} className="mb-2 opacity-40" />
                <p className="text-sm">No tools or malware found for this actor</p>
              </div>
            )}
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && !enrichError && (
          <div>
            {enrichLoading && (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-5 bg-surface-2 rounded w-2/3" />
                ))}
              </div>
            )}
            {!enrichLoading && enrichment?.campaigns?.length > 0 && (
              <div className="space-y-3">
                {enrichment.campaigns.map(c => (
                  <div key={c.id} className="bg-surface-2/50 border border-border rounded-lg px-4 py-3">
                    <p className="font-sans text-sm font-medium text-text-primary">{c.name}</p>
                    {(c.first_seen || c.last_seen) && (
                      <p className="font-mono text-xs text-text-muted mt-1">
                        {c.first_seen ? formatDate(c.first_seen) : '?'}
                        {' \u2014 '}
                        {c.last_seen ? formatDate(c.last_seen) : 'ongoing'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!enrichLoading && (!enrichment?.campaigns || enrichment.campaigns.length === 0) && (
              <div className="flex flex-col items-center justify-center py-8 text-text-muted">
                <Flag size={32} className="mb-2 opacity-40" />
                <p className="text-sm">No campaigns found for this actor</p>
              </div>
            )}
          </div>
        )}

        {/* Relationships Tab */}
        {activeTab === 'relationships' && !enrichError && (
          <div>
            {enrichLoading && (
              <div className="bg-surface-2 rounded-xl animate-pulse" style={{ height: 'calc(95vh - 200px)' }} />
            )}
            {!enrichLoading && enrichment?.relationships?.length > 0 && (
              <RelationshipGraph
                relationships={enrichment.relationships}
                actorName={actor.name}
                actorId={actor.id}
              />
            )}
            {!enrichLoading && (!enrichment?.relationships || enrichment.relationships.length === 0) && (
              <div className="flex flex-col items-center justify-center py-8 text-text-muted">
                <GitBranch size={32} className="mb-2 opacity-40" />
                <p className="text-sm">No relationships found for this actor</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
