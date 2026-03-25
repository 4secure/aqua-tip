function formatCount(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export default function ThreatMapCounters({ counters, connected }) {
  return (
    <div className="glass-card-static p-4">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="font-sans font-semibold">Global Threats</h2>
        <div className={`live-dot ${connected ? 'live-dot-red' : 'live-dot-amber'}`}></div>
        <span className={`text-xs ${connected ? 'text-red' : 'text-amber'}`}>
          {connected ? 'LIVE' : 'OFFLINE'}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-lg font-sans font-bold text-red">
            {formatCount(counters.threats)}
          </div>
          <div className="text-[10px] text-text-muted">Active Threats</div>
        </div>
        <div>
          <div className="text-lg font-sans font-bold text-amber">
            {formatCount(counters.countries)}
          </div>
          <div className="text-[10px] text-text-muted">Countries</div>
        </div>
        <div>
          <div className="text-lg font-sans font-bold text-cyan">
            {formatCount(counters.types)}
          </div>
          <div className="text-[10px] text-text-muted">Attack Types</div>
        </div>
      </div>
    </div>
  );
}
