import { useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { THREAT_STATS, RECENT_IOCS, ATTACK_CATEGORIES, THREAT_MAP_POINTS } from '../data/mock-data';
import { Icon } from '../data/icons';
import { useChartJs } from '../hooks/useChartJs';
import { useLeaflet } from '../hooks/useLeaflet';

function Sparkline({ color }) {
  const colorMap = { red: '#FF3B5C', violet: '#7A44E4', amber: '#FFB020', cyan: '#00E5FF' };
  const hex = colorMap[color] || '#7A44E4';
  const config = useMemo(() => ({
    type: 'line',
    data: {
      labels: Array.from({ length: 12 }, (_, i) => i),
      datasets: [{ data: Array.from({ length: 12 }, () => Math.random() * 60 + 20), borderColor: hex, borderWidth: 1.5, fill: true, backgroundColor: hex + '10', pointRadius: 0, tension: 0.4 }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } },
  }), [hex]);
  const ref = useChartJs(config);
  return <canvas ref={ref}></canvas>;
}

function AttackChart() {
  const config = useMemo(() => ({
    type: 'bar',
    data: {
      labels: ATTACK_CATEGORIES.map(c => c.name),
      datasets: [{ data: ATTACK_CATEGORIES.map(c => c.count), backgroundColor: ATTACK_CATEGORIES.map(c => c.color + '40'), borderColor: ATTACK_CATEGORIES.map(c => c.color), borderWidth: 1, borderRadius: 6, barThickness: 28 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#161822', borderColor: '#2A2D3E', borderWidth: 1, titleColor: '#E8EAED', bodyColor: '#9AA0AD', padding: 10, cornerRadius: 8 } },
      scales: { x: { grid: { color: '#1E203020', drawBorder: false }, ticks: { color: '#5A6173', font: { size: 11 } } }, y: { grid: { display: false }, ticks: { color: '#9AA0AD', font: { size: 12, family: 'Space Grotesk' } } } },
    },
  }), []);
  const ref = useChartJs(config);
  return <canvas ref={ref}></canvas>;
}

export default function DashboardPage() {
  const markers = useMemo(() => THREAT_MAP_POINTS.map(p => ({
    lat: p.lat, lng: p.lng, size: 10,
    html: `<div class="map-marker"><div class="threat-pulse" style="background:rgba(255,59,92,0.3);width:20px;height:20px;border-radius:50%;position:absolute;inset:-5px;"></div></div>`,
    popup: `<div style="font-family:'Space Grotesk',sans-serif;color:#E8EAED;background:#161822;padding:8px 12px;border-radius:8px;border:1px solid #2A2D3E;min-width:150px;"><div style="font-weight:600;font-size:13px;margin-bottom:4px;">${p.city}</div><div style="font-size:11px;color:#9AA0AD;">${p.type} — ${p.attacks} attacks</div></div>`,
  })), []);
  const mapRef = useLeaflet({ center: [25, 10], zoom: 2.3, markers });

  const statCards = [
    { label: 'Malware IPs', value: THREAT_STATS.malwareIPs.toLocaleString(), delta: THREAT_STATS.malwareIPsDelta, color: 'red' },
    { label: 'Malware Domains', value: THREAT_STATS.malwareDomains.toLocaleString(), delta: THREAT_STATS.malwareDomainsDelta, color: 'violet' },
    { label: 'CVEs Today', value: THREAT_STATS.cvesToday, delta: THREAT_STATS.cvesTodayDelta, color: 'amber' },
    { label: 'New IOCs', value: THREAT_STATS.newIOCs.toLocaleString(), delta: THREAT_STATS.newIOCsDelta, color: 'cyan' },
  ];

  const typeColors = { IP: 'chip-red', Domain: 'chip-violet', Hash: 'chip-cyan', URL: 'chip-amber' };

  return (
    <div className="space-y-6">
      {/* Threat Map */}
      <div className="glass-card p-0 overflow-hidden" style={{height:'40vh', minHeight:'320px'}}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <h2 className="font-heading font-semibold text-sm">Global Threat Map</h2>
            <div className="live-dot live-dot-green"></div>
            <span className="text-xs text-text-muted">Real-time</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="chip-red text-[10px] cursor-pointer">C2</button>
            <button className="chip-violet text-[10px] cursor-pointer">APT</button>
            <button className="chip-cyan text-[10px] cursor-pointer">DDoS</button>
            <button className="chip-amber text-[10px] cursor-pointer">Phishing</button>
          </div>
        </div>
        <div ref={mapRef} style={{height:'calc(100% - 48px)'}}></div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map(card => {
          const isPositive = card.delta > 0;
          const deltaColor = card.color === 'red' ? (isPositive ? 'text-red' : 'text-green') : (isPositive ? 'text-green' : 'text-red');
          return (
            <div key={card.label} className="glass-card p-5">
              <div className="text-xs text-text-muted mb-1">{card.label}</div>
              <div className="text-2xl font-heading font-bold text-text-primary mb-2">{card.value}</div>
              <div className={`flex items-center gap-1 ${deltaColor} text-xs`}>
                <Icon name={isPositive ? 'arrowUp' : 'arrowDown'} />
                <span>{Math.abs(card.delta)}%</span>
                <span className="text-text-muted ml-1">vs last week</span>
              </div>
              <div className="mt-3" style={{height:'30px'}}><Sparkline color={card.color} /></div>
            </div>
          );
        })}
      </div>

      {/* 2-col: IOC Table + Attack Chart */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-title mb-0">Recent IOCs</h3>
            <button className="btn-ghost text-xs">View All →</button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Type</th><th>Indicator</th><th>Threat</th><th>Confidence</th><th>Source</th><th>Time</th></tr></thead>
              <tbody>
                {RECENT_IOCS.map((ioc, i) => (
                  <tr key={i}>
                    <td><span className={typeColors[ioc.type] || 'chip-violet'}>{ioc.type}</span></td>
                    <td className="font-mono text-xs text-text-primary">{ioc.value}</td>
                    <td className="text-text-secondary text-xs">{ioc.threat}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{width:`${ioc.confidence}%`, background: ioc.confidence > 90 ? '#FF3B5C' : ioc.confidence > 75 ? '#FFB020' : '#00C48C'}}></div>
                        </div>
                        <span className="text-xs text-text-muted">{ioc.confidence}%</span>
                      </div>
                    </td>
                    <td className="text-xs text-text-secondary">{ioc.source}</td>
                    <td className="text-xs text-text-muted">{ioc.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="col-span-2 glass-card p-5">
          <h3 className="section-title">Top Attack Categories</h3>
          <div style={{height:'280px'}}><AttackChart /></div>
        </div>
      </div>

      {/* Bottom widgets */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-violet/10 flex items-center justify-center text-violet"><Icon name="key" /></div>
            <div><div className="text-2xl font-heading font-bold">3</div><div className="text-xs text-text-muted">Active API Keys</div></div>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{width:'60%'}}></div></div>
          <div className="text-[10px] text-text-muted mt-1">60% of limit used</div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-cyan/10 flex items-center justify-center text-cyan"><Icon name="rss" /></div>
            <div><div className="text-2xl font-heading font-bold">8</div><div className="text-xs text-text-muted">Active Feeds</div></div>
          </div>
          <div className="flex items-center gap-1.5"><div className="live-dot live-dot-green"></div><span className="text-xs text-green">All syncing</span></div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-green/10 flex items-center justify-center text-green"><Icon name="activity" /></div>
            <div><div className="text-2xl font-heading font-bold">24.7K</div><div className="text-xs text-text-muted">API Calls Today</div></div>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{width:'35%'}}></div></div>
          <div className="text-[10px] text-text-muted mt-1">35% of daily quota</div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-amber/10 flex items-center justify-center text-amber"><Icon name="flag" /></div>
            <div><div className="text-sm font-heading font-semibold">Acme Corp</div><div className="text-xs text-text-muted">Enterprise Plan</div></div>
          </div>
          <div className="flex items-center gap-2"><span className="chip-green text-[10px]">Verified</span><span className="text-xs text-text-muted">Since 2024</span></div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-5">
        <h3 className="section-title">Quick Actions</h3>
        <div className="flex gap-3">
          <Link to="/cti" className="btn-primary flex items-center gap-2"><Icon name="search" />IP Lookup</Link>
          <Link to="/ioc-search" className="btn-secondary flex items-center gap-2"><Icon name="fingerprint" />IOC Search</Link>
          <Link to="/vuln-scanner" className="btn-secondary flex items-center gap-2"><Icon name="shield" />Scan Target</Link>
          <Link to="/feeds" className="btn-secondary flex items-center gap-2"><Icon name="rss" />Manage Feeds</Link>
          <Link to="/threat-map" className="btn-secondary flex items-center gap-2"><Icon name="globe" />Threat Map</Link>
        </div>
      </div>
    </div>
  );
}
