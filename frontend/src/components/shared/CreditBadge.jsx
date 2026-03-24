export function CreditBadge({ remaining, limit, planName, compact = false }) {
  const ratio = limit > 0 ? remaining / limit : 0;
  const colorClass =
    remaining === 0 ? 'chip-red' : ratio < 0.5 ? 'chip-amber' : 'chip-cyan';
  const sizeClass = compact ? 'text-[10px] px-1.5 py-0.5' : '';

  return (
    <span className={`chip ${colorClass} ${sizeClass}`}>
      {!compact && planName && <span className="font-semibold">{planName}: </span>}
      {remaining}/{limit}
    </span>
  );
}
