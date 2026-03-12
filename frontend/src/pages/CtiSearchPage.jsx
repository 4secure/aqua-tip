import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function CtiSearchPage() {
  const [ip, setIp] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => navigate('/cti-report');

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] grid-bg">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl font-bold mb-3 text-gradient">IP Threat Intelligence</h1>
        <p className="text-text-secondary text-base max-w-md">Search any IP address to get threat intelligence, geolocation, blocklist status, and historical activity data.</p>
      </div>

      {/* Search */}
      <div className="w-full max-w-2xl mb-8">
        <div className="relative">
          <input
            type="text"
            placeholder="Enter IP address (e.g., 185.220.101.34)"
            className="w-full px-6 py-4 bg-surface border border-border rounded-2xl text-text-primary placeholder-text-muted font-mono text-lg tracking-wider focus:outline-none focus:border-violet/50 focus:ring-2 focus:ring-violet/20 transition-all"
            value={ip}
            onChange={e => setIp(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold">
            Analyze
          </button>
        </div>
      </div>

      {/* Recent searches */}
      <div className="mb-8">
        <div className="text-xs text-text-muted mb-2 text-center">Recent Searches</div>
        <div className="flex gap-2">
          <Link to="/cti-report" className="chip-violet cursor-pointer hover:bg-violet/20 transition-colors font-mono text-xs">185.220.101.34</Link>
          <span className="chip-violet cursor-pointer hover:bg-violet/20 transition-colors font-mono text-xs">103.224.182.251</span>
          <span className="chip-violet cursor-pointer hover:bg-violet/20 transition-colors font-mono text-xs">45.33.32.156</span>
          <span className="chip-violet cursor-pointer hover:bg-violet/20 transition-colors font-mono text-xs">8.8.8.8</span>
        </div>
      </div>

      {/* Example IPs */}
      <div className="glass-card p-6 w-full max-w-2xl">
        <div className="text-xs text-text-muted mb-3 uppercase tracking-wider font-semibold">Example Lookups</div>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/cti-report" className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer group">
            <div className="w-2 h-2 rounded-full bg-red"></div>
            <div>
              <div className="font-mono text-sm text-text-primary group-hover:text-violet-light transition-colors">185.220.101.34</div>
              <div className="text-xs text-text-muted">C2 Server — Russia</div>
            </div>
            <span className="ml-auto severity-critical">87/100</span>
          </Link>
          <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer group">
            <div className="w-2 h-2 rounded-full bg-amber"></div>
            <div>
              <div className="font-mono text-sm text-text-primary group-hover:text-violet-light transition-colors">103.224.182.251</div>
              <div className="text-xs text-text-muted">Scanner — China</div>
            </div>
            <span className="ml-auto severity-medium">54/100</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer group">
            <div className="w-2 h-2 rounded-full bg-green"></div>
            <div>
              <div className="font-mono text-sm text-text-primary group-hover:text-violet-light transition-colors">8.8.8.8</div>
              <div className="text-xs text-text-muted">Google DNS — United States</div>
            </div>
            <span className="ml-auto severity-low">2/100</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer group">
            <div className="w-2 h-2 rounded-full bg-red"></div>
            <div>
              <div className="font-mono text-sm text-text-primary group-hover:text-violet-light transition-colors">45.33.32.156</div>
              <div className="text-xs text-text-muted">Brute Force — United States</div>
            </div>
            <span className="ml-auto severity-high">72/100</span>
          </div>
        </div>
      </div>
    </div>
  );
}
