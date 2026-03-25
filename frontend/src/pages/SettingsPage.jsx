import { useState, useMemo } from 'react';
import { API_KEYS } from '../data/mock-data';
import { Icon } from '../data/icons';
import { useChartJs } from '../hooks/useChartJs';

function UsageChart() {
  const config = useMemo(() => ({
    type: 'line',
    data: {
      labels: Array.from({length: 30}, (_, i) => `Mar ${i+1}`),
      datasets: [{
        label: 'API Calls',
        data: Array.from({length: 30}, () => Math.floor(Math.random() * 15000 + 18000)),
        borderColor: '#7A44E4',
        backgroundColor: 'rgba(122,68,228,0.1)',
        fill: true,
        pointRadius: 0,
        tension: 0.4,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: '#1E203020' }, ticks: { color: '#5A6173', maxTicksLimit: 8, font: { size: 10 } } },
        y: { grid: { color: '#1E203020' }, ticks: { color: '#5A6173', font: { size: 10 } } },
      },
    },
  }), []);
  const canvasRef = useChartJs(config);
  return <canvas ref={canvasRef}></canvas>;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('api-keys');
  const [modalOpen, setModalOpen] = useState(false);

  const TABS = [
    { id: 'api-keys', label: 'API Keys' },
    { id: 'webhooks', label: 'Webhooks' },
    { id: 'usage', label: 'Usage' },
    { id: 'account', label: 'Account' },
  ];

  const scopeColors = { read: 'chip-violet', write: 'chip-cyan', feeds: 'chip-green' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sans text-xl font-bold">Settings</h1>
          <p className="text-sm text-text-muted mt-1">Manage API keys, webhooks, and account settings</p>
        </div>
      </div>

      <div className="tab-bar">
        {TABS.map(tab => (
          <button key={tab.id} className={`tab-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
        ))}
      </div>

      {/* Tab: API Keys */}
      {activeTab === 'api-keys' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-text-muted">3 active keys, 1 revoked</div>
            <button className="btn-primary flex items-center gap-2" onClick={() => setModalOpen(true)}>
              <Icon name="plus" /> Create New Key
            </button>
          </div>
          <div className="glass-card p-0 overflow-hidden">
            <table className="data-table">
              <thead><tr><th>Name</th><th>Key</th><th>Scopes</th><th>Created</th><th>Last Used</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {API_KEYS.map(k => (
                  <tr key={k.id} className={k.status === 'revoked' ? 'opacity-50' : ''}>
                    <td className="font-medium text-text-primary">{k.name}</td>
                    <td className="font-mono text-xs">{k.key}</td>
                    <td><div className="flex gap-1">{k.scopes.map(s => <span key={s} className={`${scopeColors[s]} text-[10px]`}>{s}</span>)}</div></td>
                    <td className="text-xs text-text-muted">{k.created}</td>
                    <td className="text-xs text-text-muted">{k.lastUsed}</td>
                    <td><span className={`${k.status === 'active' ? 'chip-green' : 'chip-red'} text-[10px]`}>{k.status === 'active' ? 'Active' : 'Revoked'}</span></td>
                    <td className="text-right">{k.status === 'active' && <button className="btn-ghost text-xs">Revoke</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Webhooks */}
      {activeTab === 'webhooks' && (
        <div className="glass-card p-5">
          <h3 className="section-title">Webhook Endpoints</h3>
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-surface-2 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3"><div className="live-dot live-dot-green"></div><span className="font-medium text-sm">Slack Notifications</span></div>
                <span className="chip-green text-[10px]">Active</span>
              </div>
              <code className="text-xs font-mono text-text-muted">https://hooks.slack.com/services/T00/B00/xxxx</code>
              <div className="flex gap-2 mt-2"><span className="chip-violet text-[10px]">critical_alerts</span><span className="chip-amber text-[10px]">new_cves</span></div>
            </div>
            <div className="p-4 rounded-lg bg-surface-2 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3"><div className="live-dot live-dot-green"></div><span className="font-medium text-sm">SIEM Integration</span></div>
                <span className="chip-green text-[10px]">Active</span>
              </div>
              <code className="text-xs font-mono text-text-muted">https://siem.company.com/api/webhooks/aquasecure</code>
              <div className="flex gap-2 mt-2"><span className="chip-violet text-[10px]">all_events</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Usage */}
      {activeTab === 'usage' && (
        <>
          <div className="glass-card p-5">
            <h3 className="section-title">API Usage (Last 30 Days)</h3>
            <div style={{height:'300px'}}><UsageChart /></div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="glass-card p-4"><div className="text-xs text-text-muted mb-1">Total Requests</div><div className="text-2xl font-sans font-bold">742.3K</div></div>
            <div className="glass-card p-4"><div className="text-xs text-text-muted mb-1">Daily Average</div><div className="text-2xl font-sans font-bold">24.7K</div></div>
            <div className="glass-card p-4"><div className="text-xs text-text-muted mb-1">Rate Limit</div><div className="text-2xl font-sans font-bold text-green">35%</div></div>
          </div>
        </>
      )}

      {/* Tab: Account */}
      {activeTab === 'account' && (
        <div className="glass-card p-5">
          <h3 className="section-title">Account Settings</h3>
          <div className="space-y-4 max-w-lg">
            <div><label className="text-xs text-text-muted mb-1 block">Organization</label><input type="text" className="input-field" defaultValue="Acme Corp" readOnly /></div>
            <div><label className="text-xs text-text-muted mb-1 block">Email</label><input type="email" className="input-field" defaultValue="john.doe@acme.com" readOnly /></div>
            <div><label className="text-xs text-text-muted mb-1 block">Plan</label><div className="flex items-center gap-3"><input type="text" className="input-field flex-1" defaultValue="Enterprise" readOnly /><span className="premium-badge">PRO</span></div></div>
            <div><label className="text-xs text-text-muted mb-1 block">Two-Factor Authentication</label><div className="flex items-center gap-3"><div className="toggle active"></div><span className="text-sm text-green">Enabled</span></div></div>
          </div>
        </div>
      )}

      {/* Create Key Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 overlay-backdrop flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div className="glass-panel rounded-2xl w-[480px] p-6 animate-slide-in-up" onClick={e => e.stopPropagation()}>
            <h3 className="font-sans font-semibold text-lg mb-4">Create API Key</h3>
            <div className="space-y-4">
              <div><label className="text-xs text-text-muted mb-1 block">Key Name</label><input type="text" className="input-field" placeholder="e.g., Production API Key" /></div>
              <div>
                <label className="text-xs text-text-muted mb-1 block">Scopes</label>
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 border border-border cursor-pointer hover:border-violet/30"><input type="checkbox" className="accent-violet" defaultChecked /> <span className="text-sm">Read</span></label>
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 border border-border cursor-pointer hover:border-violet/30"><input type="checkbox" className="accent-violet" /> <span className="text-sm">Write</span></label>
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 border border-border cursor-pointer hover:border-violet/30"><input type="checkbox" className="accent-violet" /> <span className="text-sm">Feeds</span></label>
                </div>
              </div>
              <div><label className="text-xs text-text-muted mb-1 block">Expiration</label><select className="input-field"><option>30 days</option><option>90 days</option><option selected>1 year</option><option>Never</option></select></div>
            </div>
            <div className="flex gap-2 mt-6">
              <button className="flex-1 btn-primary">Create Key</button>
              <button className="flex-1 btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
