export function CreditBadge({ remaining, limit }) {
  const ratio = limit > 0 ? remaining / limit : 0;
  const colorClass =
    remaining === 0 ? 'chip-red' : ratio < 0.5 ? 'chip-amber' : 'chip-cyan';

  return (
    <span className={`chip ${colorClass}`}>
      {remaining}/{limit}
    </span>
  );
}
