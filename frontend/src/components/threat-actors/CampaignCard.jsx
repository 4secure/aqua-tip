import { useFormatDate } from '../../hooks/useFormatDate';

/**
 * CampaignCard — Phase 65 (D-15, D-16, D-17, D-21, D-22, D-23).
 *
 * Renders a single OpenCTI Campaign as a clickable card. Conditional sections:
 *  - Objective paragraph: rendered only when `campaign.objective` is truthy (D-22)
 *  - Attributed-to chip row: rendered only when `campaign.attributed_to.length > 0` (D-21)
 *  - Date range: 'Unknown date range' when both first_seen + last_seen null,
 *    otherwise '<first_seen || ?> — <last_seen || ongoing>' (D-23)
 *
 * Outer container className per D-16. Chip className per D-15 (matches Phase 64 D-08).
 * Card height is content-driven (no fixed height) per D-17.
 */
export default function CampaignCard({ campaign, onClick }) {
  const { formatDate } = useFormatDate();

  const firstSeen = campaign?.first_seen;
  const lastSeen = campaign?.last_seen;
  const attributedTo = campaign?.attributed_to ?? [];

  let dateRange;
  if (!firstSeen && !lastSeen) {
    dateRange = 'Unknown date range';
  } else {
    const left = firstSeen ? formatDate(firstSeen) : '?';
    const right = lastSeen ? formatDate(lastSeen) : 'ongoing';
    dateRange = `${left} \u2014 ${right}`;
  }

  return (
    <div
      onClick={onClick}
      className="bg-surface border border-border rounded-xl p-5 hover:border-violet/40 transition-colors cursor-pointer"
    >
      <h3 className="font-sans text-base font-semibold text-text-primary">
        {campaign?.name}
      </h3>

      <p className="font-mono text-xs text-text-muted mt-1">
        {dateRange}
      </p>

      {campaign?.objective && (
        <p className="font-sans text-sm text-text-muted line-clamp-2 mt-2">
          {campaign.objective}
        </p>
      )}

      {attributedTo.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {attributedTo.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-2 border border-border text-xs font-sans text-text-primary"
            >
              {a.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
