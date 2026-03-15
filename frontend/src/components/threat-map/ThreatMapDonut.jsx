import { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

const TYPE_COLORS = {
  'C2': '#FF3B5C',
  'DDoS': '#FF3B5C',
  'Malware': '#FF3B5C',
  'Scanning': '#FFB020',
  'BEC': '#FFB020',
  'Phishing': '#7A44E4',
  'APT': '#7A44E4',
  'Recon': '#00E5FF',
  'Unknown': '#9AA0AD',
};

function getColor(type) {
  return TYPE_COLORS[type] || '#9AA0AD';
}

export default function ThreatMapDonut({ typeCounts }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const labels = Object.keys(typeCounts);
    const data = Object.values(typeCounts);
    const colors = labels.map(getColor);

    if (!chartRef.current) {
      chartRef.current = new Chart(canvasRef.current, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors.map(c => c + '40'),
            borderColor: colors,
            borderWidth: 1,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: { legend: { display: false } },
        },
      });
    } else {
      const chart = chartRef.current;
      chart.data.labels = labels;
      chart.data.datasets[0].data = data;
      chart.data.datasets[0].backgroundColor = colors.map(c => c + '40');
      chart.data.datasets[0].borderColor = colors;
      chart.update('none');
    }
  }, [typeCounts]);

  useEffect(() => {
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, []);

  return (
    <div className="glass-card-static p-4">
      <div className="text-xs text-text-muted uppercase tracking-wider font-semibold mb-3">
        Attack Distribution
      </div>
      <div style={{ height: '180px' }}>
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}
