import { useMemo } from 'react';
import { THREAT_MAP_POINTS } from '../data/mock-data';
import { Icon } from '../data/icons';
import { useChartJs } from '../hooks/useChartJs';
import { useLeaflet } from '../hooks/useLeaflet';

function AttackDonut() {
  const config = useMemo(() => ({
    type: 'doughnut',
    data: {
      labels: ['C2', 'Phishing', 'DDoS', 'APT', 'Scanning', 'Malware', 'BEC', 'Brute Force'],
      datasets: [{ data: [25, 20, 15, 12, 10, 8, 5, 5], backgroundColor: ['#FF3B5C40','#7A44E440','#00E5FF40','#FFB02040','#00C48C40','#9B6BF740','#FF873B40','#66F0FF40'], borderColor: ['#FF3B5C','#7A44E4','#00E5FF','#FFB020','#00C48C','#9B6BF7','#FF873B','#66F0FF'], borderWidth: 1 }],
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false } } },
  }), []);
  const ref = useChartJs(config);
  return <canvas ref={ref}></canvas>;
}

export default function ThreatMapPage() {
  const markers = useMemo(() => THREAT_MAP_POINTS.map(p => {
    const size = Math.min(Math.max(p.attacks / 50, 8), 24);
    return {
      lat: p.lat, lng: p.lng, size,
      html: `<div style="width:${size}px;height:${size}px;background:rgba(255,59,92,0.6);border-radius:50%;border:2px solid rgba(255,59,92,0.8);box-shadow:0 0 ${size}px rgba(255,59,92,0.4);"></div>`,
      popup: `<div style="font-family:'Space Grotesk',sans-serif;color:#E8EAED;background:#161822;padding:10px 14px;border-radius:8px;border:1px solid #2A2D3E;min-width:160px;"><div style="font-weight:600;font-size:14px;margin-bottom:4px;">${p.city}</div><div style="font-size:11px;color:#9AA0AD;">${p.type}</div><div style="font-size:13px;color:#FF3B5C;font-weight:600;margin-top:4px;">${p.attacks} attacks</div></div>`,
    };
  }), []);

  const mapRef = useLeaflet({ center: [25, 10], zoom: 2.5, markers });

  return (
    <div className="relative -m-6" style={{height:'calc(100vh - 60px)'}}>
      <div ref={mapRef} style={{width:'100%', height:'100%'}}></div>

      {/* Left sidebar overlay */}
      <div className="absolute top-4 left-4 z-[1000] w-[340px] space-y-4">
        <div className="glass-card-static p-4">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="font-heading font-semibold">Global Threats</h2>
            <div className="live-dot live-dot-red"></div>
            <span className="text-xs text-red">LIVE</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><div className="text-lg font-heading font-bold text-red">15.2K</div><div className="text-[10px] text-text-muted">Active Attacks</div></div>
            <div><div className="text-lg font-heading font-bold text-amber">42</div><div className="text-[10px] text-text-muted">Countries</div></div>
            <div><div className="text-lg font-heading font-bold text-cyan">8</div><div className="text-[10px] text-text-muted">Attack Types</div></div>
          </div>
        </div>

        <div className="glass-card-static p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-3">Top Source Countries</div>
          <div className="space-y-2">
            {[
              { flag: '🇷🇺', name: 'Russia', pct: 85, count: '1.2K' },
              { flag: '🇨🇳', name: 'China', pct: 72, count: '987' },
              { flag: '🇰🇷', name: 'South Korea', pct: 58, count: '876', color: 'bg-amber' },
              { flag: '🇺🇸', name: 'United States', pct: 52, count: '789', color: 'bg-amber' },
              { flag: '🇮🇳', name: 'India', pct: 48, count: '745', color: 'bg-cyan' },
            ].map(c => (
              <div key={c.name} className="flex items-center gap-2">
                <span className="text-sm">{c.flag}</span>
                <span className="text-xs text-text-primary flex-1">{c.name}</span>
                <div className="w-20 h-1.5 bg-surface-3 rounded-full overflow-hidden"><div className={`h-full rounded-full ${c.color || 'bg-red'}`} style={{width:`${c.pct}%`}}></div></div>
                <span className="text-xs text-text-muted w-8 text-right">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card-static p-4">
          <div className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-3">Attack Distribution</div>
          <div style={{height:'180px'}}><AttackDonut /></div>
        </div>

        <div className="glass-card-static p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-xs text-text-muted uppercase tracking-wider font-semibold">Live Feed</div>
            <div className="live-dot live-dot-green"></div>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto text-xs">
            {[
              { ip: '185.220.101.34', type: 'C2', color: 'bg-red', time: '2s ago' },
              { ip: '103.224.182.251', type: 'Scan', color: 'bg-amber', time: '5s ago' },
              { ip: '45.33.32.156', type: 'Phishing', color: 'bg-violet', time: '8s ago' },
              { ip: '91.121.87.12', type: 'DDoS', color: 'bg-red', time: '12s ago' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-surface-2/50">
                <div className={`w-1.5 h-1.5 rounded-full ${item.color}`}></div>
                <span className="font-mono text-text-primary">{item.ip}</span>
                <span className="text-text-muted">→</span>
                <span className="text-text-secondary">{item.type}</span>
                <span className="text-text-muted ml-auto">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom time controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000]">
        <div className="glass-card-static px-6 py-3 flex items-center gap-4">
          <button className="btn-ghost text-xs active text-violet-light">1H</button>
          <button className="btn-ghost text-xs">6H</button>
          <button className="btn-ghost text-xs">24H</button>
          <button className="btn-ghost text-xs">7D</button>
          <button className="btn-ghost text-xs">30D</button>
          <div className="w-px h-5 bg-border mx-2"></div>
          <button className="btn-ghost text-xs flex items-center gap-1"><Icon name="play" />Auto-refresh</button>
        </div>
      </div>
    </div>
  );
}
