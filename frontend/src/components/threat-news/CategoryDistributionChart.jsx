import { useMemo } from 'react';
import { useChartJs } from '../../hooks/useChartJs';

const CHART_HEX_COLORS = [
  '#FF3B5C',  // red (slot 0)
  '#7A44E4',  // violet (slot 1)
  '#00E5FF',  // cyan (slot 2)
  '#FFB020',  // amber (slot 3)
  '#00C48C',  // green (slot 4)
  '#9B6BF7',  // violet-light (slot 5)
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

function bucketByHourAndCategory(items, timezone) {
  const buckets = {};

  for (const item of items) {
    const labels = item.labels || [];
    if (labels.length === 0) continue;

    const hourStr = new Date(item.published).toLocaleString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    const h = Math.min(parseInt(hourStr, 10), 23);

    for (const label of labels) {
      if (!buckets[label.value]) {
        buckets[label.value] = new Array(24).fill(0);
      }
      buckets[label.value][h] += 1;
    }
  }

  return buckets;
}

function ChartLegend({ datasets }) {
  return (
    <div className="flex flex-wrap gap-4 mt-3">
      {datasets.map((ds) => (
        <div key={ds.label} className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: chartColorForCategory(ds.label) }}
          />
          <span className="font-sans text-xs text-text-muted">{ds.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function CategoryDistributionChart({
  items,
  categories,
  activeLabel,
  onCategoryClick,
  timezone,
}) {
  const chartData = useMemo(() => {
    const buckets = bucketByHourAndCategory(items, timezone);
    const categoryNames = Object.keys(buckets)
      .filter((name) => buckets[name].some((v) => v > 0))
      .sort();

    if (categoryNames.length === 0) return null;

    const activeCategoryValue = activeLabel
      ? (categories.find((c) => c.id === activeLabel)?.value || '')
      : '';

    const labels = Array.from({ length: 24 }, (_, i) => `${i}h`);

    const datasets = categoryNames.map((name) => {
      const hex = chartColorForCategory(name);
      const isActive = activeCategoryValue && name === activeCategoryValue;
      const fillAlpha = !activeLabel ? 0.35 : isActive ? 0.6 : 0.15;

      return {
        label: name,
        data: buckets[name],
        borderColor: hex,
        backgroundColor: hexToRgba(hex, fillAlpha),
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2,
      };
    });

    return { labels, datasets };
  }, [items, timezone, activeLabel, categories]);

  const config = useMemo(() => {
    if (!chartData) return null;

    return {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#161822',
            borderColor: '#2A2D3E',
            borderWidth: 1,
            titleColor: '#E8EAED',
            bodyColor: '#9AA0AD',
            padding: 8,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} reports`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(30, 32, 48, 0.125)', drawBorder: false },
            ticks: { color: '#5A6173', font: { size: 12, family: 'Outfit' } },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: { color: 'rgba(30, 32, 48, 0.125)', drawBorder: false },
            ticks: {
              color: '#5A6173',
              font: { size: 12, family: 'Outfit' },
              stepSize: 1,
              precision: 0,
            },
          },
        },
        onClick: (_event, elements, chart) => {
          if (elements.length > 0) {
            const datasetIndex = elements[0].datasetIndex;
            const categoryName = chart.data.datasets[datasetIndex].label;
            const cat = categories.find((c) => c.value === categoryName);
            if (cat) {
              onCategoryClick(
                cat.id === activeLabel ? '' : cat.id,
                categoryName,
              );
            }
          }
        },
      },
    };
  }, [chartData, activeLabel, onCategoryClick, categories]);

  const canvasRef = useChartJs(config);

  if (!config) return null;

  return (
    <div className="bg-surface/60 border border-border backdrop-blur-sm rounded-xl p-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4 font-sans">
        Category Distribution
      </h3>
      <div className="h-[180px]">
        <canvas ref={canvasRef} />
      </div>
      <ChartLegend datasets={chartData.datasets} />
    </div>
  );
}
