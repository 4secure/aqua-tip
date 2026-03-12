import { useState } from 'react';
import { CVE_DETAIL } from '../data/mock-data';
import { Icon } from '../data/icons';

const TABS = ['summary', 'affected', 'exploits', 'patches', 'references', 'timeline'];
const TAB_LABELS = { summary: 'Summary', affected: 'Affected Products', exploits: 'Exploit Intel', patches: 'Patches', references: 'References', timeline: 'Timeline' };

export default function CveDetailPage() {
  const [activeTab, setActiveTab] = useState('summary');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-red/10 border border-red/20 flex items-center justify-center text-red"><Icon name="bug" /></div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xl font-bold text-text-primary">{CVE_DETAIL.id}</span>
              <span className="severity-critical">CRITICAL</span>
            </div>
            <div className="text-lg font-heading text-text-secondary mt-1">{CVE_DETAIL.name} — Apache Log4j Remote Code Execution</div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2"><span className="text-xs text-text-muted">CVSS</span><span className="text-xl font-heading font-bold text-red">{CVE_DETAIL.cvss}</span></div>
          <div className="flex items-center gap-2"><span className="text-xs text-text-muted">EPSS</span><span className="text-xl font-heading font-bold text-red">{(CVE_DETAIL.epss * 100).toFixed(1)}%</span></div>
          <div className="flex items-center gap-2"><span className="text-xs text-text-muted">Published</span><span className="text-sm font-mono">{CVE_DETAIL.published}</span></div>
          <div className="flex items-center gap-2"><span className="text-xs text-text-muted">Modified</span><span className="text-sm font-mono">{CVE_DETAIL.modified}</span></div>
          <div className="ml-auto flex gap-2">
            <span className="chip-red">Exploited in Wild</span>
            <span className="chip-amber">CISA KEV</span>
          </div>
        </div>
      </div>

      {/* CVSS Vector */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">CVSS Vector:</span>
          <code className="text-xs font-mono text-text-secondary bg-surface-2 px-3 py-1 rounded border border-border">{CVE_DETAIL.vector}</code>
          <span className="text-xs text-text-muted ml-2">CWE:</span>
          <code className="text-xs font-mono text-text-secondary bg-surface-2 px-3 py-1 rounded border border-border">{CVE_DETAIL.cwe}</code>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map(tab => (
          <button key={tab} className={`tab-item ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{TAB_LABELS[tab]}</button>
        ))}
      </div>

      {/* Tab: Summary */}
      {activeTab === 'summary' && (
        <>
          <div className="glass-card p-5">
            <h3 className="section-title">Description</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{CVE_DETAIL.description} An attacker who can control log messages or log message parameters can execute arbitrary code loaded from LDAP servers when message lookup substitution is enabled.</p>
          </div>
          <div className="glass-card p-5 mt-4">
            <h3 className="section-title">Impact Analysis</h3>
            <div className="grid grid-cols-3 gap-4">
              {['Confidentiality', 'Integrity', 'Availability'].map(label => (
                <div key={label} className="p-3 rounded-lg bg-red/5 border border-red/10 text-center">
                  <div className="text-xs text-text-muted mb-1">{label}</div>
                  <div className="text-lg font-heading font-bold text-red">HIGH</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Tab: Affected Products */}
      {activeTab === 'affected' && (
        <div className="glass-card p-5">
          <h3 className="section-title">Affected Products</h3>
          <table className="data-table">
            <thead><tr><th>Vendor</th><th>Product</th><th>Versions</th></tr></thead>
            <tbody>
              {CVE_DETAIL.affectedProducts.map((p, i) => (
                <tr key={i}><td className="font-medium">{p.vendor}</td><td>{p.product}</td><td className="font-mono text-xs">{p.versions}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Exploits */}
      {activeTab === 'exploits' && (
        <div className="glass-card p-5">
          <h3 className="section-title">Known Exploits</h3>
          <div className="space-y-3">
            {CVE_DETAIL.exploits.map((ex, i) => (
              <div key={i} className="p-4 rounded-lg bg-surface-2 border border-border">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`severity-${ex.type === 'Remote' ? 'critical' : 'high'}`}>{ex.type}</span>
                  <span className="font-medium text-sm">{ex.source} #{ex.id}</span>
                  {ex.verified && <span className="chip-green text-[10px] ml-auto">Verified</span>}
                </div>
                <p className="text-xs text-text-secondary">{ex.type === 'Remote' ? 'Remote code execution via JNDI lookup in log messages.' : 'Proof-of-concept exploit for Log4Shell vulnerability.'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Patches */}
      {activeTab === 'patches' && (
        <div className="glass-card p-5">
          <h3 className="section-title">Available Patches</h3>
          <div className="space-y-3">
            {CVE_DETAIL.patches.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-green/5 border border-green/10">
                <div>
                  <div className="font-medium text-sm">{p.vendor} Log4j {p.version}</div>
                  <div className="text-xs text-text-muted mt-0.5">Released {p.date} {i === 0 ? '— Final fix' : '— Java 7 backport'}</div>
                </div>
                <button className="btn-secondary text-xs">View</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: References */}
      {activeTab === 'references' && (
        <div className="glass-card p-5">
          <h3 className="section-title">References</h3>
          <div className="space-y-2">
            {CVE_DETAIL.references.map((ref, i) => (
              <a key={i} href="#" className="flex items-center gap-2 p-3 rounded-lg hover:bg-surface-2 transition-colors text-sm text-cyan hover:underline">
                <Icon name="externalLink" /> {ref.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Timeline */}
      {activeTab === 'timeline' && (
        <div className="glass-card p-5">
          <h3 className="section-title">Event Timeline</h3>
          <div className="relative pl-6 space-y-6">
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border"></div>
            {CVE_DETAIL.timeline.map((evt, i) => {
              const colors = ['bg-violet', 'bg-amber', 'bg-red', 'bg-red', 'bg-cyan', 'bg-green'];
              const isExploit = i === 3;
              return (
                <div key={i} className="relative">
                  <div className={`absolute left-[-18px] top-1 w-3 h-3 rounded-full ${colors[i]} border-2 border-surface ${isExploit ? 'animate-pulse-glow' : ''}`}></div>
                  <div className="text-xs font-mono text-text-muted mb-0.5">{evt.date}</div>
                  <div className={`text-sm ${isExploit ? 'text-red font-medium' : i === 5 ? 'text-green font-medium' : 'text-text-primary'}`}>{evt.event}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
