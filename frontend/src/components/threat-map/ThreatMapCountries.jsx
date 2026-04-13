const COUNTRY_FLAG_OFFSET = 0x1F1E6 - 65; // 'A' = 65

function countryFlag(code) {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(
    code.charCodeAt(0) + COUNTRY_FLAG_OFFSET,
    code.charCodeAt(1) + COUNTRY_FLAG_OFFSET
  );
}

const ROW_COLORS = ['bg-red', 'bg-red', 'bg-amber', 'bg-amber', 'bg-cyan'];

export default function ThreatMapCountries({ countryCounts }) {
  const maxCount = countryCounts.length > 0 ? countryCounts[0].count : 1;

  return (
    <div className="glass-card-static p-4 h-full flex flex-col min-h-0">
      <div className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-3 flex-shrink-0">
        Top Source Countries
      </div>
      {countryCounts.length === 0 ? (
        <div className="text-xs text-text-muted text-center py-2">No data yet</div>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
          {countryCounts.map((c, i) => (
            <div key={c.code} className="flex items-center gap-2">
              <span className="text-sm">{countryFlag(c.code.toUpperCase())}</span>
              <span className="text-xs text-text-primary flex-1">{c.name}</span>
              <div className="w-20 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${ROW_COLORS[i] || 'bg-cyan'}`}
                  style={{ width: `${Math.round((c.count / maxCount) * 100)}%` }}
                ></div>
              </div>
              <span className="text-xs text-text-muted w-8 text-right">{c.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
