import { useState, useMemo } from 'react';
import { IP_REPORT } from '../data/mock-data';
import { Icon } from '../data/icons';
import { useChartJs } from '../hooks/useChartJs';

function ActivityChart() {
  const config = useMemo(() => ({
    type: 'line',
    data: {
      labels: Array.from({length: 30}, (_, i) => `Day ${i+1}`),
      datasets: [{
        label: 'Events',
        data: Array.from({length: 30}, () => Math.floor(Math.random() * 200 + 20)),
        borderColor: '#FF3B5C',
        backgroundColor: 'rgba(255,59,92,0.1)',
        fill: true, pointRadius: 0, tension: 0.4, borderWidth: 2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#1E203020' }, ticks: { color: '#5A6173', maxTicksLimit: 8, font: { size: 10 } } },
        y: { grid: { color: '#1E203020' }, ticks: { color: '#5A6173', font: { size: 10 } } },
      },
    },
  }), []);
  const ref = useChartJs(config);
  return <canvas ref={ref}></canvas>;
}

function AttackPatternChart() {
  const config = useMemo(() => ({
    type: 'doughnut',
    data: {
      labels: ['C2 Comms', 'Port Scan', 'Brute Force', 'Malware Dist'],
      datasets: [{
        data: [145, 2340, 890, 56],
        backgroundColor: ['#FF3B5C40', '#7A44E440', '#FFB02040', '#00E5FF40'],
        borderColor: ['#FF3B5C', '#7A44E4', '#FFB020', '#00E5FF'],
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#9AA0AD', padding: 16, usePointStyle: true } } },
    },
  }), []);
  const ref = useChartJs(config);
  return <canvas ref={ref}></canvas>;
}

const TABS = ['overview', 'activity', 'blocklists', 'classifications', 'attack', 'raw'];
const TAB_LABELS = { overview: 'Overview', activity: 'Activity', blocklists: 'Blocklists', classifications: 'Classifications', attack: 'Attack Details', raw: 'Raw JSON' };

export default function CtiReportPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-red/10 border border-red/20 flex items-center justify-center text-red"><Icon name="server" /></div>
            <div>
              <div className="font-mono text-2xl font-bold text-text-primary">{IP_REPORT.ip}</div>
              <div className="flex items-center gap-3 mt-1">
                <span className="severity-critical">Malicious</span>
                <span className="text-sm text-text-muted">{IP_REPORT.asn} · {IP_REPORT.org}</span>
                <span className="text-sm text-text-muted">🇷🇺 {IP_REPORT.city}, {IP_REPORT.country}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="chip-red">C2 Server</span>
            <span className="chip-red">Botnet Node</span>
            <span className="chip-amber">Scanner</span>
          </div>
        </div>

        <div className="tab-bar" id="report-tabs">
          {TABS.map(tab => (
            <button key={tab} className={`tab-item ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{TAB_LABELS[tab]}</button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="glass-card p-4"><div className="text-xs text-text-muted mb-1">Total Reports</div><div className="text-xl font-heading font-bold text-red">{IP_REPORT.totalReports.toLocaleString()}</div></div>
              <div className="glass-card p-4"><div className="text-xs text-text-muted mb-1">First Seen</div><div className="text-xl font-heading font-bold">{IP_REPORT.firstSeen}</div></div>
              <div className="glass-card p-4"><div className="text-xs text-text-muted mb-1">Last Seen</div><div className="text-xl font-heading font-bold text-green">{IP_REPORT.lastSeen}</div></div>
            </div>
            <div className="glass-card p-5 mb-6">
              <h3 className="section-title">Activity Timeline (30 days)</h3>
              <div style={{height:'200px'}}><ActivityChart /></div>
            </div>
            <div className="glass-card p-5">
              <h3 className="section-title">Open Ports</h3>
              <div className="flex gap-2 flex-wrap">
                <span className="copyable-field">22 <span className="text-text-muted text-xs">SSH</span></span>
                <span className="copyable-field">80 <span className="text-text-muted text-xs">HTTP</span></span>
                <span className="copyable-field">443 <span className="text-text-muted text-xs">HTTPS</span></span>
                <span className="copyable-field text-red">4444 <span className="text-text-muted text-xs">Metasploit</span></span>
                <span className="copyable-field">8080 <span className="text-text-muted text-xs">HTTP-Alt</span></span>
                <span className="copyable-field">8443 <span className="text-text-muted text-xs">HTTPS-Alt</span></span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="glass-card p-5">
            <h3 className="section-title">Recent Activity</h3>
            <table className="data-table">
              <thead><tr><th>Date</th><th>Type</th><th>Target</th><th>Count</th></tr></thead>
              <tbody>
                {IP_REPORT.activity.map((a, i) => {
                  const sev = i === 0 ? 'critical' : i <= 2 ? 'high' : 'medium';
                  return (
                    <tr key={i}>
                      <td className="font-mono text-xs">{a.date}</td>
                      <td><span className={`severity-${sev}`}>{a.type}</span></td>
                      <td className="font-mono text-xs text-text-secondary">{a.target}</td>
                      <td className="font-mono">{a.count.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'blocklists' && (
          <div className="glass-card p-5">
            <h3 className="section-title">Blocklist Status</h3>
            <div className="space-y-3">
              {IP_REPORT.blocklists.map((bl, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${bl.listed ? 'bg-red/5 border border-red/10' : 'bg-green/5 border border-green/10'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${bl.listed ? 'bg-red' : 'bg-green'}`}></div>
                    <span className="text-sm font-medium">{bl.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {bl.reports && <span className="text-xs text-text-muted">{bl.reports} reports</span>}
                    {bl.pulses && <span className="text-xs text-text-muted">{bl.pulses} pulses</span>}
                    <span className={bl.listed ? 'severity-critical' : 'severity-low'}>{bl.listed ? 'Listed' : 'Clean'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'classifications' && (
          <div className="glass-card p-5">
            <h3 className="section-title">Threat Classifications</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-surface-2 border border-border">
                <div className="text-xs text-text-muted mb-1">Primary Classification</div>
                <div className="text-lg font-heading font-semibold text-red">C2 Server</div>
                <div className="text-xs text-text-secondary mt-1">Command & Control infrastructure used by threat actors to manage compromised systems.</div>
              </div>
              <div className="p-4 rounded-lg bg-surface-2 border border-border">
                <div className="text-xs text-text-muted mb-1">Secondary Classification</div>
                <div className="text-lg font-heading font-semibold text-amber">Botnet Node</div>
                <div className="text-xs text-text-secondary mt-1">Part of a distributed botnet network used for various malicious activities.</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'attack' && (
          <div className="glass-card p-5">
            <h3 className="section-title">Attack Pattern Analysis</h3>
            <div style={{height:'250px'}}><AttackPatternChart /></div>
          </div>
        )}

        {activeTab === 'raw' && (
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="section-title mb-0">Raw API Response</h3>
              <button className="btn-ghost text-xs">Copy JSON</button>
            </div>
            <pre className="bg-primary rounded-lg p-4 text-xs font-mono text-text-secondary overflow-auto max-h-[500px] border border-border"><code>{JSON.stringify(IP_REPORT, null, 2)}</code></pre>
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="w-[300px] shrink-0 space-y-4 sticky top-[84px] self-start">
        <div className="glass-card p-6 flex flex-col items-center">
          <div className="score-ring mb-3">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle className="score-track" cx="60" cy="60" r="52"/>
              <circle className="score-fill" cx="60" cy="60" r="52" stroke="#FF3B5C" strokeDasharray="326.7" strokeDashoffset="42.5"/>
            </svg>
            <div className="score-value text-3xl text-red">{IP_REPORT.score}</div>
          </div>
          <div className="text-sm font-heading font-semibold text-red mb-0.5">High Risk</div>
          <div className="text-xs text-text-muted">Threat Score</div>
        </div>
        <div className="glass-card p-4 space-y-2">
          <button className="w-full btn-primary text-sm py-2.5">Block IP</button>
          <button className="w-full btn-secondary text-sm py-2.5">Add to Watchlist</button>
          <button className="w-full btn-ghost text-sm py-2">Export Report</button>
          <button className="w-full btn-ghost text-sm py-2">Share</button>
        </div>
        <div className="glass-card p-4">
          <div className="text-xs text-text-muted mb-3 uppercase tracking-wider font-semibold">Geolocation</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-text-muted">Country</span><span className="text-text-primary">🇷🇺 Russia</span></div>
            <div className="flex justify-between"><span className="text-text-muted">City</span><span className="text-text-primary">{IP_REPORT.city}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">ASN</span><span className="font-mono text-xs text-text-primary">{IP_REPORT.asn}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">ISP</span><span className="text-text-primary">{IP_REPORT.isp}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Org</span><span className="text-text-primary">{IP_REPORT.org}</span></div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="text-xs text-text-muted mb-3 uppercase tracking-wider font-semibold">Related IOCs</div>
          <div className="space-y-2">
            <div className="copyable-field text-xs w-full">malware-c2.evil.ru</div>
            <div className="copyable-field text-xs w-full">api-update.download</div>
            <div className="copyable-field text-xs w-full">a1b2c3d4e5f6...</div>
          </div>
        </div>
      </div>
    </div>
  );
}
