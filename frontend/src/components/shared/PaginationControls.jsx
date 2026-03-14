import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PaginationControls({
  pagination,
  onNext,
  onPrevious,
  pageSize = 20,
  currentOffset = 0,
}) {
  if (!pagination) return null;

  const { has_next, has_previous, total } = pagination;
  const from = currentOffset + 1;
  const to = has_next ? currentOffset + pageSize : (total ?? currentOffset + pageSize);

  const countLabel =
    total != null
      ? `Showing ${from}\u2013${Math.min(to, total)} of ${total}`
      : `Showing ${from}\u2013${to} of many`;

  return (
    <div className="flex items-center justify-between pt-6">
      <p className="font-mono text-sm text-text-muted">{countLabel}</p>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevious}
          disabled={!has_previous}
          className="flex items-center gap-1 px-3 py-2 text-sm font-display bg-surface/60 border border-border backdrop-blur-sm rounded-lg text-text-primary hover:bg-surface-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
          Prev
        </button>
        <button
          onClick={onNext}
          disabled={!has_next}
          className="flex items-center gap-1 px-3 py-2 text-sm font-display bg-surface/60 border border-border backdrop-blur-sm rounded-lg text-text-primary hover:bg-surface-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
