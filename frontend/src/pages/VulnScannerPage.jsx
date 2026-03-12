import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../data/icons';

const VULN_ROWS = [
  { severity: 'critical', label: 'CRITICAL', name: 'Log4Shell RCE', cve: 'CVE-2021-44228', cvss: '10.0', cvssColor: 'text-red', epss: '97.4%', epssColor: 'text-red', status: 'Exploited', statusChip: 'chip-red', hasLink: true, expandable: true, desc: 'Apache Log4j2 JNDI features do not protect against attacker controlled LDAP and other JNDI related endpoints.', affected: 'Apache Log4j 2.0-beta9 through 2.14.1', fix: 'Upgrade to Log4j 2.17.0 or later.' },
  { severity: 'critical', label: 'CRITICAL', name: 'XZ Backdoor', cve: 'CVE-2024-3094', cvss: '10.0', cvssColor: 'text-red', epss: '89.1%', epssColor: 'text-red', status: 'Exploited', statusChip: 'chip-red', expandable: true, desc: 'Malicious code was discovered in XZ Utils versions 5.6.0 and 5.6.1, allowing unauthorized remote access.' },
  { severity: 'high', label: 'HIGH', name: 'HTTP/2 Rapid Reset', cve: 'CVE-2023-44487', cvss: '7.5', cvssColor: 'text-[#FF873B]', epss: '82.3%', epssColor: 'text-amber', status: 'Exploited', statusChip: 'chip-red', expandable: true, desc: 'The HTTP/2 protocol allows denial of service via rapid stream resets.' },
  { severity: 'medium', label: 'MEDIUM', name: 'TLS 1.0 Supported', cve: 'N/A', cvss: '5.3', cvssColor: 'text-amber', epss: '\u2014', epssColor: 'text-text-muted', status: 'Open', statusChip: 'chip-amber' },
  { severity: 'medium', label: 'MEDIUM', name: 'Missing Security Headers', cve: 'N/A', cvss: '4.7', cvssColor: 'text-amber', epss: '\u2014', epssColor: 'text-text-muted', status: 'Open', statusChip: 'chip-amber' },
  { severity: 'low', label: 'LOW', name: 'Server Banner Disclosed', cve: 'N/A', cvss: '2.1', cvssColor: 'text-green', epss: '\u2014', epssColor: 'text-text-muted', status: 'Info', statusChip: 'chip-green' },
];

export default function VulnScannerPage() {
  const [expanded, setExpanded] = useState(new Set());

  const toggleRow = (i) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Scan Input */}
      <div className="glass-card p-6">
        <h1 className="font-heading text-xl font-bold mb-4">Vulnerability Scanner</h1>
        <div className="flex gap-3 mb-4">
          <input type="text" placeholder="Enter target (domain, IP, or URL)" className="input-mono flex-1 py-3" defaultValue="api.company.com" />
          <div className="flex items-center gap-3 px-4 border border-border rounded-lg bg-surface-2">
            <span className="text-xs text-text-muted">Depth</span>
            <button className="px-3 py-1 text-xs rounded bg-violet/20 text-violet-light border border-violet/30 font-medium">Quick</button>
            <button className="px-3 py-1 text-xs rounded text-text-muted hover:bg-surface-3 transition-colors">Standard</button>
            <button className="px-3 py-1 text-xs rounded text-text-muted hover:bg-surface-3 transition-colors">Deep</button>
          </div>
          <button className="btn-primary px-8 flex items-center gap-2"><Icon name="shield" />Start Scan</button>
        </div>
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-text-muted">Scan Progress</span>
            <span className="text-xs font-mono text-violet-light">100% — Complete</span>
          </div>
          <div className="progress-bar" style={{height:'6px'}}><div className="progress-fill" style={{width:'100%'}}></div></div>
        </div>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span>Duration: 2m 34s</span><span>&bull;</span><span>Checks: 847 / 847</span><span>&bull;</span><span>Findings: 6</span>
        </div>
      </div>

      {/* Severity Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass-card p-4 border-l-2 border-l-red"><div className="text-2xl font-heading font-bold text-red">2</div><div className="text-xs text-text-muted">Critical</div></div>
        <div className="glass-card p-4 border-l-2 border-l-[#FF873B]"><div className="text-2xl font-heading font-bold text-[#FF873B]">1</div><div className="text-xs text-text-muted">High</div></div>
        <div className="glass-card p-4 border-l-2 border-l-amber"><div className="text-2xl font-heading font-bold text-amber">2</div><div className="text-xs text-text-muted">Medium</div></div>
        <div className="glass-card p-4 border-l-2 border-l-green"><div className="text-2xl font-heading font-bold text-green">1</div><div className="text-xs text-text-muted">Low</div></div>
      </div>

      {/* Results Table */}
      <div className="glass-card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="font-heading font-semibold text-sm">Scan Results</h3>
          <div className="flex gap-2">
            <button className="btn-ghost text-xs"><Icon name="download" /> Export CSV</button>
            <button className="btn-ghost text-xs"><Icon name="filter" /> Filter</button>
          </div>
        </div>
        <table className="data-table">
          <thead><tr><th>Severity</th><th>Vulnerability</th><th>CVE</th><th>CVSS</th><th>EPSS</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {VULN_ROWS.map((row, i) => (
              <Fragment key={i}>
                <tr className={row.expandable ? 'cursor-pointer' : ''} onClick={() => row.expandable && toggleRow(i)}>
                  <td><span className={`severity-${row.severity}`}>{row.label}</span></td>
                  <td className="text-text-primary font-medium">{row.name}</td>
                  <td className="font-mono text-xs">{row.hasLink ? <Link to="/cve-detail" className="text-cyan hover:underline">{row.cve}</Link> : <span className={row.cve === 'N/A' ? 'text-text-muted' : 'text-cyan'}>{row.cve}</span>}</td>
                  <td><span className={`font-mono ${row.cvssColor} font-semibold`}>{row.cvss}</span></td>
                  <td><span className={`font-mono ${row.epssColor}`}>{row.epss}</span></td>
                  <td><span className={`${row.statusChip} text-[10px]`}>{row.status}</span></td>
                  <td className="text-text-muted">{row.expandable ? '\u25BC' : ''}</td>
                </tr>
                {row.expandable && expanded.has(i) && (
                  <tr className="bg-surface-2/30">
                    <td colSpan="7" className="px-6 py-4">
                      <div className="text-xs text-text-secondary mb-2"><strong className="text-text-primary">Description:</strong> {row.desc}</div>
                      {row.affected && <div className="text-xs text-text-secondary mb-2"><strong className="text-text-primary">Affected:</strong> {row.affected}</div>}
                      {row.fix && <div className="text-xs text-text-secondary"><strong className="text-text-primary">Remediation:</strong> {row.fix}</div>}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
