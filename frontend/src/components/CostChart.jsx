import { useState } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function CostChart({ trends }) {
  const [chartType, setChartType] = useState('line');

  if (!trends || trends.length === 0) {
    return (
      <div className="chart-empty">
        <p>No cost data available</p>
      </div>
    );
  }

  // Support multiple formats: period, month, or date
  const labels = trends.map(t => t.period || t.month || t.date);
  const costs = trends.map(t => t.total_cost);

  const lineData = {
    labels: labels,
    datasets: [
      {
        label: 'Total Cost ($)',
        data: costs,
        borderColor: '#0056b3',
        backgroundColor: 'rgba(0, 86, 179, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: '#0056b3',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }
    ]
  };

  const barData = {
    labels: labels,
    datasets: [
      {
        label: 'Total Cost ($)',
        data: costs,
        backgroundColor: [
          'rgba(0, 86, 179, 0.8)',
          'rgba(0, 61, 122, 0.8)',
          'rgba(0, 31, 63, 0.8)',
          'rgba(0, 86, 179, 0.6)',
          'rgba(0, 61, 122, 0.6)',
          'rgba(0, 31, 63, 0.6)',
        ],
        borderColor: '#0056b3',
        borderWidth: 1,
        borderRadius: 8
      }
    ]
  };

  const doughnutData = {
    labels: labels,
    datasets: [
      {
        label: 'Cost Distribution ($)',
        data: costs,
        backgroundColor: [
          'rgba(0, 86, 179, 0.9)',
          'rgba(0, 61, 122, 0.9)',
          'rgba(0, 31, 63, 0.9)',
          'rgba(92, 140, 229, 0.9)',
          'rgba(68, 114, 196, 0.9)',
          'rgba(45, 87, 163, 0.9)',
        ],
        borderColor: '#fff',
        borderWidth: 2
      }
    ]
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#333',
          font: {
            size: 14,
            weight: '500'
          }
        }
      },
      title: {
        display: false
      },
      tooltip: {
        backgroundColor: '#001f3f',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#0056b3',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: function(context) {
            return `Cost: $${context.parsed.y.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString();
          },
          color: '#666',
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        ticks: {
          color: '#666',
          font: {
            size: 12
          }
        },
        grid: {
          display: false
        }
      }
    }
  };

  const barOptions = {
    ...lineOptions,
    plugins: {
      ...lineOptions.plugins,
      tooltip: {
        ...lineOptions.plugins.tooltip,
        callbacks: {
          label: function(context) {
            return `Cost: $${context.parsed.y.toLocaleString()}`;
          }
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right',
        labels: {
          color: '#333',
          font: {
            size: 12
          },
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: '#001f3f',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#0056b3',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: $${context.parsed.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    }
  };

  const renderChart = () => {
    switch(chartType) {
      case 'bar':
        return <Bar data={barData} options={barOptions} />;
      case 'doughnut':
        return <Doughnut data={doughnutData} options={doughnutOptions} />;
      case 'line':
      default:
        return <Line data={lineData} options={lineOptions} />;
    }
  };

  return (
    <div className="chart-container">
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        marginBottom: '20px',
        gap: '10px'
      }}>
        <button
          onClick={() => setChartType('line')}
          style={{
            padding: '8px 16px',
            border: chartType === 'line' ? '2px solid #0056b3' : '1px solid #e2e8f0',
            borderRadius: '6px',
            background: chartType === 'line' ? '#0056b3' : '#fff',
            color: chartType === 'line' ? '#fff' : '#334155',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: chartType === 'line' ? '600' : '500',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            if (chartType !== 'line') {
              e.target.style.background = '#f1f5f9';
            }
          }}
          onMouseOut={(e) => {
            if (chartType !== 'line') {
              e.target.style.background = '#fff';
            }
          }}
        >
          📈 Line Chart
        </button>
        <button
          onClick={() => setChartType('bar')}
          style={{
            padding: '8px 16px',
            border: chartType === 'bar' ? '2px solid #0056b3' : '1px solid #e2e8f0',
            borderRadius: '6px',
            background: chartType === 'bar' ? '#0056b3' : '#fff',
            color: chartType === 'bar' ? '#fff' : '#334155',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: chartType === 'bar' ? '600' : '500',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            if (chartType !== 'bar') {
              e.target.style.background = '#f1f5f9';
            }
          }}
          onMouseOut={(e) => {
            if (chartType !== 'bar') {
              e.target.style.background = '#fff';
            }
          }}
        >
          📊 Bar Chart
        </button>
        <button
          onClick={() => setChartType('doughnut')}
          style={{
            padding: '8px 16px',
            border: chartType === 'doughnut' ? '2px solid #0056b3' : '1px solid #e2e8f0',
            borderRadius: '6px',
            background: chartType === 'doughnut' ? '#0056b3' : '#fff',
            color: chartType === 'doughnut' ? '#fff' : '#334155',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: chartType === 'doughnut' ? '600' : '500',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            if (chartType !== 'doughnut') {
              e.target.style.background = '#f1f5f9';
            }
          }}
          onMouseOut={(e) => {
            if (chartType !== 'doughnut') {
              e.target.style.background = '#fff';
            }
          }}
        >
          🍩 Doughnut Chart
        </button>
      </div>
      {renderChart()}
    </div>
  );
}

export default CostChart;
