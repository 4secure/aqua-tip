import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import * as d3 from 'd3';

const CHART_HEX_COLORS = [
  '#FF3B5C',  // red
  '#7A44E4',  // violet
  '#00E5FF',  // cyan
  '#FFB020',  // amber
  '#00C48C',  // green
  '#9B6BF7',  // violet-light
];

function chartColorForCategory(labelValue) {
  let hash = 0;
  for (let i = 0; i < labelValue.length; i++) {
    hash = ((hash << 5) - hash) + labelValue.charCodeAt(i);
    hash |= 0;
  }
  return CHART_HEX_COLORS[Math.abs(hash) % CHART_HEX_COLORS.length];
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function CategoryTreemap({
  items,
  categories,
  activeLabel,
  onCategoryClick,
}) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 400, height: 120 });
  const [hoveredCategory, setHoveredCategory] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      if (width > 0) {
        setSize({ width, height: 120 });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const item of items) {
      const labels = item.labels || [];
      for (const label of labels) {
        counts[label.value] = (counts[label.value] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  const treemapData = useMemo(() => {
    if (categoryCounts.length === 0) return [];

    const root = d3.hierarchy({ children: categoryCounts })
      .sum((d) => d.count);

    d3.treemap()
      .size([size.width, size.height])
      .padding(3)
      .round(true)(root);

    return root.leaves();
  }, [categoryCounts, size]);

  const activeCategoryValue = activeLabel
    ? (categories.find((c) => c.id === activeLabel)?.value || '')
    : '';

  const handleClick = useCallback((categoryName) => {
    const cat = categories.find((c) => c.value === categoryName);
    if (cat) {
      onCategoryClick(
        cat.id === activeLabel ? '' : cat.id,
        categoryName,
      );
    }
  }, [categories, activeLabel, onCategoryClick]);

  if (categoryCounts.length === 0) return null;

  return (
    <div ref={containerRef} className="w-full min-w-[200px] max-w-[480px]">
      <svg
        width={size.width}
        height={size.height}
        className="overflow-visible"
      >
        {treemapData.map((leaf) => {
          const name = leaf.data.name;
          const count = leaf.data.count;
          const hex = chartColorForCategory(name);
          const isActive = activeCategoryValue === name;
          const isHovered = hoveredCategory === name;
          const isDimmed = activeCategoryValue && !isActive;

          const w = leaf.x1 - leaf.x0;
          const h = leaf.y1 - leaf.y0;
          const showText = w > 40 && h > 24;
          const showCount = w > 50 && h > 38;

          return (
            <g
              key={name}
              onClick={() => handleClick(name)}
              onMouseEnter={() => setHoveredCategory(name)}
              onMouseLeave={() => setHoveredCategory(null)}
              className="cursor-pointer"
            >
              <rect
                x={leaf.x0}
                y={leaf.y0}
                width={w}
                height={h}
                rx={4}
                fill={hexToRgba(hex, isActive ? 0.5 : isDimmed ? 0.15 : 0.3)}
                stroke={hex}
                strokeWidth={isActive ? 2 : isHovered ? 1.5 : 1}
                opacity={isDimmed ? 0.6 : 1}
              />
              {showText && (
                <text
                  x={leaf.x0 + w / 2}
                  y={leaf.y0 + (showCount ? h / 2 - 4 : h / 2 + 1)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-sans text-[11px] fill-white pointer-events-none select-none"
                  opacity={isDimmed ? 0.5 : 0.9}
                >
                  {name.length > Math.floor(w / 7) ? name.slice(0, Math.floor(w / 7) - 1) + '\u2026' : name}
                </text>
              )}
              {showCount && (
                <text
                  x={leaf.x0 + w / 2}
                  y={leaf.y0 + h / 2 + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-mono text-[10px] fill-white/50 pointer-events-none select-none"
                >
                  {count}
                </text>
              )}
              {/* Tooltip on hover */}
              {isHovered && (
                <title>{`${name}: ${count} report${count !== 1 ? 's' : ''}`}</title>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
