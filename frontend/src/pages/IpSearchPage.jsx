import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, Clock } from 'lucide-react';
import { IP_RELATIONS, IP_REPORT } from '../data/mock-data';
import { Icon } from '../data/icons';
import { CreditBadge } from '../components/shared/CreditBadge';
import { fetchCredits } from '../api/dark-web';
import { useAuth } from '../contexts/AuthContext';

function D3Graph() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cleanup = null;

    import('d3').then(d3 => {
      const width = container.clientWidth;
      const height = container.clientHeight;

      const nodes = [
        { id: '185.220.101.34', type: 'ip', label: '185.220.101.34' },
        { id: 'malware-c2.evil.ru', type: 'domain', label: 'malware-c2.evil.ru' },
        { id: '103.224.182.251', type: 'ip', label: '103.224.182.251' },
        { id: 'api-update.download', type: 'domain', label: 'api-update.download' },
        { id: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', type: 'hash', label: 'a1b2c3d4...' },
        { id: 'f7a8b9c0d1e2f7a8b9c0d1e2f7a8b9c0', type: 'hash', label: 'f7a8b9c0...' },
        { id: 'APT-29', type: 'actor', label: 'APT-29' },
      ];

      const links = IP_RELATIONS.filter(r => r.target).map(r => ({
        source: r.source, target: r.target, label: r.type,
      }));

      const colorMap = { ip: '#FF3B5C', domain: '#7A44E4', hash: '#00E5FF', actor: '#FFB020' };

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
        .attr('r', d => d.id === '185.220.101.34' ? 20 : 14)
        .attr('fill', d => colorMap[d.type] + '30')
        .attr('stroke', d => colorMap[d.type]).attr('stroke-width', 2);

      node.append('text').text(d => d.label).attr('fill', '#E8EAED').attr('font-size', '10px')
        .attr('font-family', 'JetBrains Mono').attr('text-anchor', 'middle')
        .attr('dy', d => d.id === '185.220.101.34' ? 32 : 26);

      simulation.on('tick', () => {
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        linkLabel.attr('x', d => (d.source.x + d.target.x) / 2).attr('y', d => (d.source.y + d.target.y) / 2 - 5);
        node.attr('transform', d => `translate(${d.x},${d.y})`);
      });

      cleanup = () => { simulation.stop(); svg.remove(); };
    });

    return () => { if (cleanup) cleanup(); };
  }, []);

  return <div ref={containerRef} style={{height:'450px', background:'#0A0B10', borderRadius:'0.75rem', border:'1px solid #1E2030'}}></div>;
}

const TABS = ['summary', 'relations', 'sandbox', 'osint', 'raw'];

export default function IpSearchPage() {
  const [activeTab, setActiveTab] = useState('summary');
  const [credits, setCredits] = useState({ remaining: 0, limit: 0, is_guest: false, resets_at: null });
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchCredits()
      .then((data) => setCredits(data))
      .catch(() => {});
  }, []);

  const isExhausted = credits.remaining === 0 && credits.limit > 0;

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-heading text-xl font-bold">IP Search</h1>
            <p className="text-sm text-text-muted mt-1">Search any IP address -- IPv4 and IPv6 supported</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <span>Bulk Mode</span>
              <div className="toggle" onClick={e => e.currentTarget.classList.toggle('active')}></div>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input type="text" placeholder="Enter an IP address (e.g. 185.220.101.34 or 2001:db8::1)" className="input-mono w-full py-3 pr-32" defaultValue="185.220.101.34" />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="chip-red">IP Detected</span>
            </div>
          </div>
          <button className="btn-primary px-8" disabled={isExhausted}>Search</button>
          <CreditBadge remaining={credits.remaining} limit={credits.limit} />
        </div>
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
        {isExhausted && isAuthenticated && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-amber/10 border border-amber/20">
            <Clock size={16} className="text-amber shrink-0" />
            <span className="text-sm font-mono text-text-secondary">
              Daily limit reached. Your credits reset at 00:00 UTC.
            </span>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="score-ring">
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle className="score-track" cx="32" cy="32" r="26" strokeWidth="4"/>
                <circle className="score-fill" cx="32" cy="32" r="26" stroke="#FF3B5C" strokeWidth="4" strokeDasharray="163.4" strokeDashoffset="21.2"/>
              </svg>
              <div className="score-value text-lg text-red">87</div>
            </div>
            <div>
              <div className="font-heading font-semibold text-lg">185.220.101.34</div>
              <div className="text-sm text-text-muted">Threat Score: <span className="text-red font-semibold">Malicious</span></div>
            </div>
          </div>
          <div className="flex gap-6 ml-auto text-center">
            <div><div className="text-xl font-heading font-bold text-red">5</div><div className="text-[10px] text-text-muted uppercase">Blocklists</div></div>
            <div><div className="text-xl font-heading font-bold text-amber">1,847</div><div className="text-[10px] text-text-muted uppercase">Reports</div></div>
            <div><div className="text-xl font-heading font-bold text-cyan">8</div><div className="text-[10px] text-text-muted uppercase">Relations</div></div>
            <div><div className="text-xl font-heading font-bold text-violet">3</div><div className="text-[10px] text-text-muted uppercase">Tags</div></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map(tab => (
          <button key={tab} className={`tab-item ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card p-5">
            <h3 className="section-title">Threat Classifications</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-surface-2"><span className="text-sm">C2 Server</span><span className="severity-critical">Critical</span></div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-2"><span className="text-sm">Botnet Node</span><span className="severity-high">High</span></div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-2"><span className="text-sm">Network Scanner</span><span className="severity-medium">Medium</span></div>
            </div>
          </div>
          <div className="glass-card p-5">
            <h3 className="section-title">Intelligence Sources</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-surface-2"><span className="text-sm">AlienVault OTX</span><span className="text-xs text-text-muted">28 pulses</span></div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-2"><span className="text-sm">AbuseIPDB</span><span className="text-xs text-text-muted">342 reports</span></div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-2"><span className="text-sm">VirusTotal</span><span className="text-xs text-text-muted">67/90 engines</span></div>
              <div className="flex items-center justify-between p-2 rounded bg-surface-2"><span className="text-sm">Shodan</span><span className="text-xs text-text-muted">6 open ports</span></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'relations' && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">IP Relationship Graph</h3>
            <div className="flex gap-2">
              <span className="chip-red text-[10px]">IP</span>
              <span className="chip-violet text-[10px]">Domain</span>
              <span className="chip-cyan text-[10px]">Hash</span>
              <span className="chip-amber text-[10px]">Actor</span>
            </div>
          </div>
          <D3Graph />
        </div>
      )}

      {activeTab === 'sandbox' && (
        <div className="glass-card p-5">
          <h3 className="section-title">Sandbox Analysis</h3>
          <div className="text-center py-12 text-text-muted">
            <div className="text-4xl mb-3">🔬</div>
            <div className="text-sm">No sandbox results available for this indicator.</div>
            <button className="btn-primary mt-4">Submit to Sandbox</button>
          </div>
        </div>
      )}

      {activeTab === 'osint' && (
        <div className="glass-card p-5">
          <h3 className="section-title">OSINT Intelligence</h3>
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-surface-2 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span className="severity-critical">Critical</span>
                <span className="text-sm font-medium">APT-29 Attribution</span>
                <span className="text-xs text-text-muted ml-auto">Mandiant, 2026-02-28</span>
              </div>
              <p className="text-xs text-text-secondary">This IP has been attributed to APT-29 (Cozy Bear) campaigns targeting government entities in Eastern Europe.</p>
            </div>
            <div className="p-4 rounded-lg bg-surface-2 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span className="severity-high">High</span>
                <span className="text-sm font-medium">Malware Distribution Hub</span>
                <span className="text-xs text-text-muted ml-auto">CrowdStrike, 2026-03-05</span>
              </div>
              <p className="text-xs text-text-secondary">Identified as active malware distribution point serving Cobalt Strike beacons and custom backdoors.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'raw' && (
        <div className="glass-card p-5">
          <pre className="bg-primary rounded-lg p-4 text-xs font-mono text-text-secondary overflow-auto max-h-[500px] border border-border">{JSON.stringify(IP_REPORT, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
