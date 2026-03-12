import { useState } from 'react';
import { DOMAIN_REPORT } from '../data/mock-data';
import { Icon } from '../data/icons';

const TABS = ['overview', 'whois', 'dns', 'ssl', 'subdomains', 'headers', 'blocklists'];
const TAB_LABELS = { overview: 'Overview', whois: 'WHOIS', dns: 'DNS Records', ssl: 'SSL', subdomains: 'Subdomains', headers: 'HTTP Headers', blocklists: 'Blocklists' };

const DNS_CHIP_COLORS = { A: 'chip-violet', AAAA: 'chip-cyan', MX: 'chip-amber', NS: 'chip-green', TXT: 'chip-red' };

export default function DomainReportPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="flex gap-6">
      {/* Main */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green/10 border border-green/20 flex items-center justify-center text-green"><Icon name="domain" /></div>
            <div>
              <div className="font-mono text-2xl font-bold text-text-primary">{DOMAIN_REPORT.domain}</div>
              <div className="flex items-center gap-3 mt-1">
                <span className="severity-low">Clean</span>
                <span className="text-sm text-text-muted">{DOMAIN_REPORT.registrar} · Since 1995</span>
                <span className="text-sm text-text-muted">🇺🇸 United States</span>
              </div>
            </div>
          </div>
        </div>

        <div className="tab-bar">
          {TABS.map(tab => (
            <button key={tab} className={`tab-item ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{TAB_LABELS[tab]}</button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="glass-card p-4"><div className="text-xs text-text-muted mb-1">Registrar</div><div className="text-lg font-heading font-semibold">{DOMAIN_REPORT.registrar}</div></div>
              <div className="glass-card p-4"><div className="text-xs text-text-muted mb-1">Created</div><div className="text-lg font-heading font-semibold">{DOMAIN_REPORT.created}</div></div>
              <div className="glass-card p-4"><div className="text-xs text-text-muted mb-1">Expires</div><div className="text-lg font-heading font-semibold text-green">{DOMAIN_REPORT.expires}</div></div>
            </div>
            <div className="glass-card p-5">
              <h3 className="section-title">Nameservers</h3>
              <div className="space-y-2">{DOMAIN_REPORT.nameservers.map(ns => <div key={ns} className="copyable-field text-xs">{ns}</div>)}</div>
            </div>
          </>
        )}

        {activeTab === 'whois' && (
          <div className="glass-card p-5">
            <h3 className="section-title">WHOIS Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between p-2 rounded bg-surface-2"><span className="text-text-muted">Registrant</span><span>{DOMAIN_REPORT.whois.registrant}</span></div>
              <div className="flex justify-between p-2 rounded bg-surface-2"><span className="text-text-muted">Organization</span><span>{DOMAIN_REPORT.whois.org}</span></div>
              <div className="flex justify-between p-2 rounded bg-surface-2"><span className="text-text-muted">Country</span><span>{DOMAIN_REPORT.whois.country}</span></div>
              <div className="flex justify-between p-2 rounded bg-surface-2"><span className="text-text-muted">State</span><span>{DOMAIN_REPORT.whois.state}</span></div>
              <div className="flex justify-between p-2 rounded bg-surface-2"><span className="text-text-muted">Created</span><span className="font-mono text-xs">{DOMAIN_REPORT.created}</span></div>
              <div className="flex justify-between p-2 rounded bg-surface-2"><span className="text-text-muted">Expires</span><span className="font-mono text-xs">{DOMAIN_REPORT.expires}</span></div>
            </div>
          </div>
        )}

        {activeTab === 'dns' && (
          <div className="glass-card p-5">
            <h3 className="section-title">DNS Records</h3>
            <table className="data-table">
              <thead><tr><th>Type</th><th>Name</th><th>Value</th><th>TTL</th></tr></thead>
              <tbody>
                {DOMAIN_REPORT.dnsRecords.map((r, i) => (
                  <tr key={i}>
                    <td><span className={`${DNS_CHIP_COLORS[r.type]} text-[10px]`}>{r.type}</span></td>
                    <td className="font-mono text-xs">{r.name}</td>
                    <td className="font-mono text-xs">{r.value}</td>
                    <td className="font-mono text-xs text-text-muted">{r.ttl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'ssl' && (
          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="section-title mb-0">SSL Certificate</h3>
              <span className="chip-green text-[10px]">Grade {DOMAIN_REPORT.ssl.grade}</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between p-2 rounded bg-surface-2"><span className="text-text-muted">Issuer</span><span>{DOMAIN_REPORT.ssl.issuer}</span></div>
              <div className="flex justify-between p-2 rounded bg-surface-2"><span className="text-text-muted">Subject</span><span className="font-mono text-xs">{DOMAIN_REPORT.ssl.subject}</span></div>
              <div className="flex justify-between p-2 rounded bg-surface-2"><span className="text-text-muted">Valid From</span><span className="font-mono text-xs">{DOMAIN_REPORT.ssl.validFrom}</span></div>
              <div className="flex justify-between p-2 rounded bg-surface-2"><span className="text-text-muted">Valid To</span><span className="font-mono text-xs">{DOMAIN_REPORT.ssl.validTo}</span></div>
              <div className="flex justify-between p-2 rounded bg-surface-2"><span className="text-text-muted">Protocol</span><span className="font-mono text-xs text-green">{DOMAIN_REPORT.ssl.protocol}</span></div>
            </div>
          </div>
        )}

        {activeTab === 'subdomains' && (
          <div className="glass-card p-5">
            <h3 className="section-title">Discovered Subdomains</h3>
            <div className="space-y-2">
              {DOMAIN_REPORT.subdomains.map((sd, i) => (
                <div key={sd} className="flex items-center justify-between p-3 rounded bg-surface-2">
                  <span className="font-mono text-sm">{sd}</span>
                  <span className={i < 2 ? 'severity-low' : 'severity-info'}>{i < 2 ? 'Clean' : 'Info'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="glass-card p-5">
            <h3 className="section-title">HTTP Response Headers</h3>
            <pre className="bg-primary rounded-lg p-4 text-xs font-mono text-text-secondary border border-border overflow-auto"><code>{`HTTP/2 200 OK
content-type: text/html; charset=UTF-8
content-length: 1256
cache-control: max-age=604800
etag: "3147526947+gzip+ident"
expires: Tue, 18 Mar 2026 12:00:00 GMT
last-modified: Thu, 17 Oct 2019 07:18:26 GMT
server: ECS (dcb/7F83)
strict-transport-security: max-age=31536000
x-content-type-options: nosniff
x-frame-options: DENY`}</code></pre>
          </div>
        )}

        {activeTab === 'blocklists' && (
          <div className="glass-card p-5">
            <h3 className="section-title">Blocklist Status</h3>
            <div className="space-y-3">
              {['Spamhaus DBL', 'Google Safe Browsing', 'PhishTank'].map(name => (
                <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-green/5 border border-green/10">
                  <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-green"></div><span className="text-sm">{name}</span></div>
                  <span className="severity-low">Clean</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar */}
      <div className="w-[300px] shrink-0 space-y-4 sticky top-[84px] self-start">
        <div className="glass-card p-6 flex flex-col items-center">
          <div className="score-ring mb-3">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle className="score-track" cx="60" cy="60" r="52"/>
              <circle className="score-fill" cx="60" cy="60" r="52" stroke="#00C48C" strokeDasharray="326.7" strokeDashoffset="287.5"/>
            </svg>
            <div className="score-value text-3xl text-green">{DOMAIN_REPORT.score}</div>
          </div>
          <div className="text-sm font-heading font-semibold text-green mb-0.5">Low Risk</div>
          <div className="text-xs text-text-muted">Domain Score</div>
        </div>
        <div className="glass-card p-4 space-y-2">
          <button className="w-full btn-primary text-sm py-2.5">Monitor Domain</button>
          <button className="w-full btn-secondary text-sm py-2.5">WHOIS Lookup</button>
          <button className="w-full btn-ghost text-sm py-2">Export Report</button>
        </div>
        <div className="glass-card p-4">
          <div className="text-xs text-text-muted mb-3 uppercase tracking-wider font-semibold">Quick Info</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-text-muted">Age</span><span>30+ years</span></div>
            <div className="flex justify-between"><span className="text-text-muted">SSL</span><span className="text-green">A+</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Subdomains</span><span>4</span></div>
            <div className="flex justify-between"><span className="text-text-muted">DNS Records</span><span>5</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Blocklists</span><span className="text-green">0/3</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
