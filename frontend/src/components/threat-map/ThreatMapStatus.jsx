export default function ThreatMapStatus({ connected }) {
  if (connected) return null;

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1001] transition-all duration-300">
      <div className="bg-surface/80 border border-border text-text-secondary text-xs font-mono px-4 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2">
        <div className="w-3 h-3 border-2 border-violet border-t-transparent rounded-full animate-spin" />
        Fetching data...
      </div>
    </div>
  );
}
