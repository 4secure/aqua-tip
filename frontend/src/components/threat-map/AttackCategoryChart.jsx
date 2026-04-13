import { useMemo } from 'react';
import { useChartJs } from '../../hooks/useChartJs';

const CATEGORY_COLORS = ['#FF3B5C', '#7A44E4', '#00E5FF', '#FFB020', '#00C48C', '#9B6BF7'];

export default function AttackCategoryChart({ categories }) {
  const config = useMemo(() => {
    if (!categories || categories.length === 0) return null;

    const labels = categories.map((c) => c.label);
    const data = categories.map((c) => c.count);

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: categories.map((_, i) => CATEGORY_COLORS[i % 6] + '40'),
            borderColor: categories.map((_, i) => CATEGORY_COLORS[i % 6]),
            borderWidth: 1,
            borderRadius: 6,
            barThickness: 22,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#161822',
            borderColor: '#2A2D3E',
            borderWidth: 1,
            titleColor: '#E8EAED',
            bodyColor: '#9AA0AD',
            padding: 10,
            cornerRadius: 8,
            titleFont: { family: 'Outfit' },
            bodyFont: { family: 'Outfit' },
          },
        },
        scales: {
          x: {
            grid: {
              color: '#1E203020',
              drawBorder: false,
            },
            ticks: {
              color: '#5A6173',
              font: { size: 11, family: 'Outfit' },
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              color: '#9AA0AD',
              font: { size: 12, family: 'Outfit' },
              callback: function (value) {
                const label = this.getLabelForValue(value);
                return label.length > 18 ? label.slice(0, 18) + '...' : label;
              },
            },
          },
        },
      },
    };
  }, [categories]);

  const canvasRef = useChartJs(config);

  if (!config) return null;

  return <canvas ref={canvasRef} />;
}
