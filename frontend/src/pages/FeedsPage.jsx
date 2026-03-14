import { useState } from 'react';
import { FEEDS } from '../data/mock-data';
import { Icon } from '../data/icons';

export default function FeedsPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');

  const openDrawer = (name) => { setDrawerTitle(name); setDrawerOpen(true); };
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-xl font-bold">Threat Feeds</h1>
          <p className="text-sm text-text-muted mt-1">Manage and monitor your threat intelligence feeds</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Icon name="plus" />
          Add Feed
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center"><div className="live-dot live-dot-green"></div></div>
          <div><div className="text-xl font-heading font-bold">8</div><div className="text-xs text-text-muted">Active Feeds</div></div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet/10 flex items-center justify-center text-violet"><Icon name="rss" /></div>
          <div><div className="text-xl font-heading font-bold">419.7K</div><div className="text-xs text-text-muted">Total Indicators</div></div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber/10 flex items-center justify-center"><div className="live-dot live-dot-amber"></div></div>
          <div><div className="text-xl font-heading font-bold">1</div><div className="text-xs text-text-muted">Paused</div></div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red/10 flex items-center justify-center"><div className="live-dot live-dot-red"></div></div>
          <div><div className="text-xl font-heading font-bold">1</div><div className="text-xs text-text-muted">Errors</div></div>
        </div>
      </div>

      {/* Feed Table */}
      <div className="glass-card p-0 overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Feed Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Indicators</th>
              <th>Last Updated</th>
              <th>Category</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {FEEDS.map(feed => (
              <tr key={feed.id} className="cursor-pointer" onClick={() => openDrawer(feed.name)}>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">{feed.name}</span>
                    {feed.premium && <span className="premium-badge">PRO</span>}
                  </div>
                </td>
                <td className="font-mono text-xs text-text-secondary">{feed.type}</td>
                <td><span className={`feed-status ${feed.status}`}><span className="dot"></span>{feed.status.charAt(0).toUpperCase() + feed.status.slice(1)}</span></td>
                <td className="font-mono text-sm">{feed.indicators > 0 ? feed.indicators.toLocaleString() : '\u2014'}</td>
                <td className="text-xs text-text-muted">{feed.updated}</td>
                <td><span className="chip-violet text-[10px]">{feed.category}</span></td>
                <td className="text-right">
                  <button className="btn-ghost text-xs p-1" onClick={e => e.stopPropagation()}><Icon name="refresh" /></button>
                  <button className="btn-ghost text-xs p-1" onClick={e => e.stopPropagation()}><Icon name="settings" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Feed Detail Drawer */}
      <div className="drawer glass-panel border-l border-border" style={{width:'480px', right: drawerOpen ? 0 : '-480px'}}>
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="font-heading font-semibold text-lg">{drawerTitle}</h3>
            <button className="text-text-muted hover:text-text-primary" onClick={closeDrawer}><Icon name="close" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-text-muted">Type</span><span className="font-mono text-xs">STIX/TAXII</span></div>
              <div className="flex justify-between text-sm"><span className="text-text-muted">Status</span><span className="feed-status active"><span className="dot"></span>Active</span></div>
              <div className="flex justify-between text-sm"><span className="text-text-muted">Total Indicators</span><span className="font-heading font-semibold">45,200</span></div>
              <div className="flex justify-between text-sm"><span className="text-text-muted">Update Interval</span><span>5 minutes</span></div>
            </div>
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-3">API Configuration</div>
              <pre className="bg-primary rounded-lg p-3 text-xs font-mono text-text-secondary border border-border overflow-x-auto"><code>{`{
  "endpoint": "https://otx.alienvault.com/api/v1",
  "auth": "Bearer \u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
  "format": "STIX 2.1",
  "polling_interval": "5m",
  "filters": ["malware", "c2", "phishing"]
}`}</code></pre>
            </div>
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-3">Sample Indicators</div>
              <div className="space-y-1.5">
                <div className="copyable-field text-xs w-full">185.220.101.34</div>
                <div className="copyable-field text-xs w-full">malware-c2.evil.ru</div>
                <div className="copyable-field text-xs w-full">a1b2c3d4e5f6a1b2...</div>
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-border flex gap-2">
            <button className="flex-1 btn-primary">Sync Now</button>
            <button className="flex-1 btn-secondary">Edit</button>
            <button className="btn-danger px-4">Delete</button>
          </div>
        </div>
      </div>
      {drawerOpen && <div className="fixed inset-0 z-50 bg-black/30" onClick={closeDrawer}></div>}
    </div>
  );
}
