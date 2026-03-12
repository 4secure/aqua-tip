import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../data/icons';

export default function SearchModal({ open, onClose }) {
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const quickActions = [
    { icon: 'search', color: 'text-violet', label: 'IP Lookup', desc: 'Search threat intelligence', path: '/cti' },
    { icon: 'fingerprint', color: 'text-cyan', label: 'IOC Search', desc: 'Multi-type indicator search', path: '/ioc-search' },
    { icon: 'shield', color: 'text-green', label: 'Vulnerability Scanner', desc: 'Scan targets for vulns', path: '/vuln-scanner' },
  ];

  return (
    <div className="fixed inset-0 z-50 overlay-backdrop flex items-start justify-center pt-[15vh]" onClick={handleBackdropClick}>
      <div className="w-[640px] glass-panel rounded-2xl overflow-hidden animate-slide-in-up" onClick={e => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <span className="text-text-muted"><Icon name="search" /></span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search IPs, domains, hashes, CVEs, actors..."
            className="flex-1 bg-transparent text-text-primary placeholder-text-muted outline-none text-sm font-mono"
          />
          <kbd className="px-2 py-0.5 bg-surface-3 rounded text-[10px] font-mono text-text-muted border border-border">ESC</kbd>
        </div>

        {/* Recent searches */}
        <div className="px-5 py-3 border-b border-border/50">
          <div className="text-[10px] uppercase tracking-wider text-text-muted mb-2">Recent Searches</div>
          <div className="flex flex-wrap gap-2">
            <span className="chip-violet cursor-pointer">185.220.101.34</span>
            <span className="chip-cyan cursor-pointer">CVE-2021-44228</span>
            <span className="chip-violet cursor-pointer">malware-c2.evil.ru</span>
            <span className="chip-amber cursor-pointer">APT-29</span>
          </div>
        </div>

        {/* Categories */}
        <div className="px-5 py-3 max-h-[400px] overflow-y-auto">
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-wider text-text-muted mb-2">Quick Actions</div>
            <div className="space-y-1">
              {quickActions.map(action => (
                <div
                  key={action.path}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-2 cursor-pointer transition-colors"
                  onClick={() => { navigate(action.path); onClose(); }}
                >
                  <span className={action.color}><Icon name={action.icon} /></span>
                  <span className="text-sm text-text-primary">{action.label}</span>
                  <span className="ml-auto text-xs text-text-muted">{action.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted mb-2">Keyboard Shortcuts</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-text-muted">
              <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-surface-3 rounded border border-border font-mono">↵</kbd> Select</div>
              <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-surface-3 rounded border border-border font-mono">↑↓</kbd> Navigate</div>
              <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-surface-3 rounded border border-border font-mono">ESC</kbd> Close</div>
              <div className="flex items-center gap-2"><kbd className="px-1.5 py-0.5 bg-surface-3 rounded border border-border font-mono">⌘K</kbd> Open</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
