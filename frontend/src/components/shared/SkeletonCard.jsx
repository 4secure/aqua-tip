export default function SkeletonCard({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="bg-surface/60 border border-border backdrop-blur-sm rounded-xl p-5 animate-pulse"
        >
          {/* Title bar */}
          <div className="h-5 bg-surface-2 rounded w-3/5 mb-4" />
          {/* Description lines */}
          <div className="space-y-2 mb-4">
            <div className="h-3 bg-surface-2 rounded w-full" />
            <div className="h-3 bg-surface-2 rounded w-4/5" />
            <div className="h-3 bg-surface-2 rounded w-2/3" />
          </div>
          {/* Badge row */}
          <div className="flex gap-2">
            <div className="h-5 bg-surface-2 rounded w-16" />
            <div className="h-5 bg-surface-2 rounded w-20" />
            <div className="h-5 bg-surface-2 rounded w-14" />
          </div>
        </div>
      ))}
    </>
  );
}
