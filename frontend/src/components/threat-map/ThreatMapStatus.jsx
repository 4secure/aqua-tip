export default function ThreatMapStatus({ connected }) {
  if (connected) return null;

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1001] transition-all duration-300">
      <div className="bg-amber/20 border border-amber text-amber text-xs font-mono px-4 py-2 rounded-lg backdrop-blur-sm">
        Connection lost &mdash; reconnecting...
      </div>
    </div>
  );
}
