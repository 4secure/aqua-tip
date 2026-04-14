function stopPropagation(e) {
  e.stopPropagation();
}

export default function PanelToggle({ collapsed, onToggle }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      onPointerDown={stopPropagation}
      onWheel={stopPropagation}
      onDoubleClick={stopPropagation}
      onTouchStart={stopPropagation}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] glass-card-static px-4 py-2 rounded-full cursor-pointer hover:border-violet/30 transition-colors"
    >
      <span className="text-xs font-semibold text-text-secondary">
        {collapsed ? 'Show Widgets' : 'Hide Widgets'}
      </span>
    </button>
  );
}
