import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { fetchCredits } from '../api/dark-web';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../data/icons';
import { useChartJs } from '../hooks/useChartJs';
import { useLeaflet } from '../hooks/useLeaflet';
import { useFormatDate } from '../hooks/useFormatDate';
import { CreditBadge } from '../components/shared/CreditBadge';

const STAT_CARD_CONFIG = [
  { entity_type: 'IPv4-Addr', label: 'IP Addresses', color: 'red' },
  { entity_type: 'Domain-Name', label: 'Domains', color: 'violet' },
  { entity_type: 'Hostname', label: 'Hostnames', color: 'cyan' },
  { entity_type: 'X509-Certificate', label: 'Certificates', color: 'amber' },
];

const STAT_COLOR_MAP = {
  red: { bg: 'bg-red/10', text: 'text-red', border: 'border-red/20' },
  violet: { bg: 'bg-violet/10', text: 'text-violet', border: 'border-violet/20' },
  cyan: { bg: 'bg-cyan/10', text: 'text-cyan', border: 'border-cyan/20' },
  amber: { bg: 'bg-amber/10', text: 'text-amber', border: 'border-amber/20' },
};

const TYPE_BADGE_COLORS = {
  'IPv4-Addr':        { bg: '#FF3B5C25', text: '#FF3B5C' },
  'IPv6-Addr':        { bg: '#FF3B5C25', text: '#FF3B5C' },
  'Domain-Name':      { bg: '#00E5FF25', text: '#00E5FF' },
  'Url':              { bg: '#7A44E425', text: '#7A44E4' },
  'Email-Addr':       { bg: '#FFB02025', text: '#FFB020' },
  'StixFile':         { bg: '#00C48C25', text: '#00C48C' },
  'Hostname':         { bg: '#9B6BF725', text: '#9B6BF7' },
  'X509-Certificate': { bg: '#FFB02025', text: '#FFB020' },
};

const CATEGORY_COLORS = [
  '#FF3B5C', '#7A44E4', '#00E5FF', '#FFB020', '#00C48C', '#9B6BF7',
];

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

/* ---------- Sub-components ---------- */

function StatCard({ label, count, color, loading, error }) {
  const colors = STAT_COLOR_MAP[color] || STAT_COLOR_MAP.violet;
  return (
    <div className="glass-card p-5">
      <div className="text-xs text-text-muted mb-1">{label}</div>
      {loading ? (
        <div className="h-8 w-24 bg-surface-2 rounded animate-pulse mb-2" />
      ) : error ? (
        <div className="text-sm text-red">Failed to load</div>
      ) : (
        <div className="text-2xl font-heading font-bold text-text-primary mb-2">
          {(count || 0).toLocaleString()}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full bg-green animate-pulse`} />
        <span className="text-[10px] text-text-muted">Live</span>
      </div>
    </div>
  );
}

function AttackChart({ categories, activeFilter, onFilterChange }) {
  const config = useMemo(() => {
    if (!categories || categories.length === 0) return null;
    const labels = categories.map(c => c.label);
    const data = categories.map(c => c.count);
    const bgColors = categories.map((_, i) => {
      const base = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
      return labels[i] === activeFilter ? base : base + '40';
    });
    return {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: bgColors,
          borderColor: categories.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]),
          borderWidth: 1,
          borderRadius: 6,
          barThickness: 28,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        onClick: (_event, elements) => {
          if (elements.length > 0) {
            const idx = elements[0].index;
            const clickedLabel = labels[idx];
            onFilterChange(clickedLabel === activeFilter ? null : clickedLabel);
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#161822',
            borderColor: '#2A2D3E',
            borderWidth: 1,
            titleColor: '#E8EAED',
            bodyColor: '#9AA0AD',
            padding: 10,
            cornerRadius: 8,
          },
        },
        scales: {
          x: { grid: { color: '#1E203020', drawBorder: false }, ticks: { color: '#5A6173', font: { size: 11 } } },
          y: { grid: { display: false }, ticks: { color: '#9AA0AD', font: { size: 12, family: 'Space Grotesk' } } },
        },
      },
    };
  }, [categories, activeFilter, onFilterChange]);

  const ref = useChartJs(config);
  if (!categories || categories.length === 0) {
    return <div className="flex items-center justify-center h-full text-text-muted text-sm">No data</div>;
  }
  return <canvas ref={ref} />;
}

function IndicatorsTable({ indicators, activeFilter, onClearFilter }) {
  const displayed = indicators.slice(0, 8);

  return (
    <div>
      {activeFilter && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs text-text-muted">Filtered by:</span>
          <span className="chip chip-violet text-xs flex items-center gap-1">
            {activeFilter}
            <button onClick={onClearFilter} className="ml-1 hover:text-white">&times;</button>
          </span>
        </div>
      )}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr><th>Type</th><th>Value</th><th>Labels</th><th>Date</th></tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr><td colSpan={4} className="text-center text-text-muted text-sm py-6">No indicators found</td></tr>
            ) : displayed.map((ind) => {
              const badge = TYPE_BADGE_COLORS[ind.entity_type] || { bg: '#7A44E425', text: '#7A44E4' };
              return (
                <tr key={ind.id}>
                  <td>
                    <span
                      className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold"
                      style={{ backgroundColor: badge.bg, color: badge.text }}
                    >
                      {ind.entity_type}
                    </span>
                  </td>
                  <td className="font-mono text-xs text-text-primary max-w-[200px] truncate">{ind.value}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {(ind.labels || []).map((lbl) => (
                        <span key={lbl} className="chip chip-violet text-[10px]">{lbl}</span>
                      ))}
                    </div>
                  </td>
                  <td className="text-xs text-text-muted whitespace-nowrap">{formatRelativeTime(ind.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreditWidget({ credits, loading, error }) {
  const { formatDateTime } = useFormatDate();
  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-green/10 flex items-center justify-center text-green"><Icon name="activity" /></div>
          <h3 className="font-heading font-semibold text-sm">Credit Balance</h3>
        </div>
        <div className="h-4 w-32 bg-surface-2 rounded animate-pulse" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-green/10 flex items-center justify-center text-green"><Icon name="activity" /></div>
          <h3 className="font-heading font-semibold text-sm">Credit Balance</h3>
        </div>
        <div className="text-sm text-red">Failed to load</div>
      </div>
    );
  }
  if (!credits) return null;

  const ratio = credits.limit > 0 ? credits.remaining / credits.limit : 0;
  const barColor = ratio >= 0.5 ? '#00C48C' : ratio >= 0.2 ? '#FFB020' : '#FF3B5C';

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-green/10 flex items-center justify-center text-green"><Icon name="activity" /></div>
          <h3 className="font-heading font-semibold text-sm">Credit Balance</h3>
        </div>
        <CreditBadge remaining={credits.remaining} limit={credits.limit} />
      </div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-mono text-text-primary">{credits.remaining} / {credits.limit}</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${Math.round(ratio * 100)}%`, background: barColor }}
        />
      </div>
      {credits.resets_at && (
        <div className="text-[10px] text-text-muted mt-2">
          Resets: {formatDateTime(credits.resets_at)}
        </div>
      )}
    </div>
  );
}

function RecentSearchesWidget({ searches, loading, error }) {
  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-cyan/10 flex items-center justify-center text-cyan"><Icon name="clock" /></div>
          <h3 className="font-heading font-semibold text-sm">Recent Searches</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-6 bg-surface-2 rounded animate-pulse" />)}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-cyan/10 flex items-center justify-center text-cyan"><Icon name="clock" /></div>
          <h3 className="font-heading font-semibold text-sm">Recent Searches</h3>
        </div>
        <div className="text-sm text-red">Failed to load</div>
      </div>
    );
  }

  const items = (searches || []).slice(0, 5);

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-cyan/10 flex items-center justify-center text-cyan"><Icon name="clock" /></div>
        <h3 className="font-heading font-semibold text-sm">Recent Searches</h3>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-text-muted text-center py-4">No searches yet</div>
      ) : (
        <div className="space-y-2">
          {items.map((s) => {
            const badge = TYPE_BADGE_COLORS[s.type] || { bg: '#7A44E425', text: '#7A44E4' };
            return (
              <div key={s.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/30 last:border-0">
                <span className="font-mono text-xs text-text-primary truncate max-w-[160px]">{s.query}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold"
                    style={{ backgroundColor: badge.bg, color: badge.text }}
                  >
                    {s.type}
                  </span>
                  <span className="text-[10px] text-text-muted">{formatRelativeTime(s.created_at)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GuestCta({ icon, message }) {
  return (
    <div className="glass-card p-5 flex flex-col items-center justify-center text-center py-8">
      <div className="w-12 h-12 rounded-xl bg-violet/10 flex items-center justify-center text-violet mb-4">
        <Icon name={icon} />
      </div>
      <p className="text-sm text-text-secondary mb-4 font-mono">{message}</p>
      <Link to="/login" className="btn-primary text-sm">Sign In</Link>
    </div>
  );
}

/* ---------- Main Component ---------- */

export default function DashboardPage() {
  const { isAuthenticated } = useAuth();

  // Counts
  const [counts, setCounts] = useState([]);
  const [countsLoading, setCountsLoading] = useState(true);
  const [countsError, setCountsError] = useState(null);

  // Indicators
  const [indicators, setIndicators] = useState([]);
  const [indicatorsLoading, setIndicatorsLoading] = useState(true);
  const [indicatorsError, setIndicatorsError] = useState(null);

  // Categories
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);

  // Map
  const [mapData, setMapData] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(null);

  // Credits (auth only)
  const [credits, setCredits] = useState(null);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [creditsError, setCreditsError] = useState(null);

  // Searches (auth only)
  const [searches, setSearches] = useState([]);
  const [searchesLoading, setSearchesLoading] = useState(false);
  const [searchesError, setSearchesError] = useState(null);

  // Category filter
  const [activeFilter, setActiveFilter] = useState(null);

  // Fetch counts
  useEffect(() => {
    let cancelled = false;
    setCountsLoading(true);
    apiClient.get('/api/dashboard/counts')
      .then(res => { if (!cancelled) { setCounts(res.data); setCountsError(null); } })
      .catch(err => { if (!cancelled) setCountsError(err); })
      .finally(() => { if (!cancelled) setCountsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Fetch indicators (re-fetches when category filter changes)
  useEffect(() => {
    let cancelled = false;
    setIndicatorsLoading(true);
    const url = activeFilter
      ? `/api/dashboard/indicators?label=${encodeURIComponent(activeFilter)}`
      : '/api/dashboard/indicators';
    apiClient.get(url)
      .then(res => { if (!cancelled) { setIndicators(res.data); setIndicatorsError(null); } })
      .catch(err => { if (!cancelled) setIndicatorsError(err); })
      .finally(() => { if (!cancelled) setIndicatorsLoading(false); });
    return () => { cancelled = true; };
  }, [activeFilter]);

  // Fetch categories
  useEffect(() => {
    let cancelled = false;
    setCategoriesLoading(true);
    apiClient.get('/api/dashboard/categories')
      .then(res => { if (!cancelled) { setCategories(res.data); setCategoriesError(null); } })
      .catch(err => { if (!cancelled) setCategoriesError(err); })
      .finally(() => { if (!cancelled) setCategoriesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Fetch map data
  useEffect(() => {
    let cancelled = false;
    setMapLoading(true);
    apiClient.get('/api/threat-map/snapshot')
      .then(res => { if (!cancelled) { setMapData(res.data); setMapError(null); } })
      .catch(err => { if (!cancelled) setMapError(err); })
      .finally(() => { if (!cancelled) setMapLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Fetch credits (auth only)
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setCreditsLoading(true);
    fetchCredits()
      .then(res => { if (!cancelled) { setCredits(res); setCreditsError(null); } })
      .catch(err => { if (!cancelled) setCreditsError(err); })
      .finally(() => { if (!cancelled) setCreditsLoading(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Fetch searches (auth only)
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setSearchesLoading(true);
    apiClient.get('/api/search-history')
      .then(res => { if (!cancelled) { setSearches(res.data); setSearchesError(null); } })
      .catch(err => { if (!cancelled) setSearchesError(err); })
      .finally(() => { if (!cancelled) setSearchesLoading(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Auto-refresh public endpoints every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      apiClient.get('/api/dashboard/counts')
        .then(res => setCounts(res.data))
        .catch(() => {});
      apiClient.get('/api/dashboard/indicators')
        .then(res => setIndicators(res.data))
        .catch(() => {});
      apiClient.get('/api/dashboard/categories')
        .then(res => setCategories(res.data))
        .catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Map markers
  const markers = useMemo(() => {
    if (!mapData?.events) return [];
    return mapData.events.map(e => ({
      lat: e.lat, lng: e.lng, size: 10,
      html: '<div class="map-marker"><div class="threat-pulse" style="background:rgba(255,59,92,0.3);width:20px;height:20px;border-radius:50%;position:absolute;inset:-5px;"></div></div>',
      popup: `<div style="font-family:'Space Grotesk',sans-serif;color:#E8EAED;background:#161822;padding:8px 12px;border-radius:8px;border:1px solid #2A2D3E;min-width:150px;"><div style="font-weight:600;font-size:13px;margin-bottom:4px;">${e.city || e.ip}</div><div style="font-size:11px;color:#9AA0AD;">${e.type} -- ${e.country || ''}</div></div>`,
    }));
  }, [mapData]);
  const mapRef = useLeaflet({ center: [25, 10], zoom: 3, markers });

  // Filter handler
  const handleFilterChange = (label) => {
    setActiveFilter(label);
  };

  const handleClearFilter = () => {
    setActiveFilter(null);
  };

  return (
    <div className="space-y-6">
      {/* Threat Map */}
      <div className="glass-card p-0 overflow-hidden" style={{ height: '40vh', minHeight: '320px' }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <h2 className="font-heading font-semibold text-sm">Global Threat Map</h2>
            <div className="live-dot live-dot-green" />
          </div>
        </div>
        <div className="relative" style={{ height: 'calc(100% - 48px)' }}>
          <div ref={mapRef} style={{ height: '100%' }} />
          {mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/80 backdrop-blur-sm">
              <div className="text-center">
                <Icon name="globe" />
                <p className="text-sm text-text-muted mt-2">
                  {mapError.status === 401 || !isAuthenticated
                    ? 'Sign in for live threat data'
                    : 'Unable to load map'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {STAT_CARD_CONFIG.map(cfg => {
          const match = (counts || []).find(c => c.entity_type === cfg.entity_type);
          return (
            <StatCard
              key={cfg.entity_type}
              label={cfg.label}
              count={match ? match.count : 0}
              color={cfg.color}
              loading={countsLoading}
              error={countsError}
            />
          );
        })}
      </div>

      {/* 2-col: Indicators Table + Attack Chart */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">Recent Indicators</h3>
          </div>
          {indicatorsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-surface-2 rounded animate-pulse" />)}
            </div>
          ) : indicatorsError ? (
            <div className="text-sm text-red py-4">Failed to load indicators</div>
          ) : (
            <IndicatorsTable
              indicators={indicators}
              activeFilter={activeFilter}
              onClearFilter={handleClearFilter}
            />
          )}
        </div>
        <div className="col-span-2 glass-card p-5">
          <h3 className="section-title">Top Attack Categories</h3>
          <div style={{ height: '280px' }}>
            {categoriesLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="h-8 w-32 bg-surface-2 rounded animate-pulse" />
              </div>
            ) : categoriesError ? (
              <div className="h-full flex items-center justify-center text-sm text-red">Failed to load</div>
            ) : (
              <AttackChart
                categories={categories}
                activeFilter={activeFilter}
                onFilterChange={handleFilterChange}
              />
            )}
          </div>
        </div>
      </div>

      {/* Bottom widgets: Credit + Recent Searches (or Guest CTAs) */}
      <div className="grid grid-cols-2 gap-4">
        {isAuthenticated ? (
          <CreditWidget credits={credits} loading={creditsLoading} error={creditsError} />
        ) : (
          <GuestCta icon="activity" message="Sign in to track your credit balance" />
        )}
        {isAuthenticated ? (
          <RecentSearchesWidget searches={searches} loading={searchesLoading} error={searchesError} />
        ) : (
          <GuestCta icon="clock" message="Sign in to see your search history" />
        )}
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-5">
        <h3 className="section-title">Quick Actions</h3>
        <div className="flex gap-3">
          <Link to="/cti" className="btn-primary flex items-center gap-2"><Icon name="search" />IP Lookup</Link>
          <Link to="/threat-search" className="btn-secondary flex items-center gap-2"><Icon name="fingerprint" />Threat Search</Link>
          <Link to="/vuln-scanner" className="btn-secondary flex items-center gap-2"><Icon name="shield" />Scan Target</Link>
          <Link to="/feeds" className="btn-secondary flex items-center gap-2"><Icon name="rss" />Manage Feeds</Link>
          <Link to="/threat-map" className="btn-secondary flex items-center gap-2"><Icon name="globe" />Threat Map</Link>
        </div>
      </div>
    </div>
  );
}
