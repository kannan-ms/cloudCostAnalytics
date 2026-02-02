import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const CostChart = ({ costs, chartType = 'bar', onBarClick }) => {
  const chartTrends = costs.trends || [];
  
  // 1. Prepare Labels (Dates)
  const labels = chartTrends.map(t => {
      // Use 'date' if available (from dashboard mapping) or 'period' directly
      const d = t.date || t.period;
      return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  });

  // 2. Identify Unique Services across all time periods
  const allServices = new Set();
  chartTrends.forEach(t => {
      if (t.breakdown) {
          t.breakdown.forEach(b => allServices.add(b.service_name));
      }
  });
  const serviceList = Array.from(allServices);

  // 3. Assign Colors dynamically (Slate/Blue Theme Palette)
  const colors = [
      '#3b82f6', // blue-500
      '#10b981', // emerald-500
      '#f59e0b', // amber-500
      '#ef4444', // red-500
      '#8b5cf6', // violet-500
      '#ec4899', // pink-500
      '#6366f1', // indigo-500
      '#06b6d4', // cyan-500
  ];

  // --- Data Preparation for Time Series (Bar, Line, Area) ---
  const timeSeriesDatasets = serviceList.map((serviceName, index) => {
      return {
          label: serviceName,
          data: chartTrends.map(t => {
              const item = t.breakdown?.find(b => b.service_name === serviceName);
              return item ? item.cost : 0;
          }),
          backgroundColor: colors[index % colors.length],
          borderColor: colors[index % colors.length],
          borderWidth: 1,
          barThickness: 'flex', // Adaptive bar thickness
          maxBarThickness: 32,
          borderRadius: 4,
          // For Line/Area charts
          pointRadius: 3,
          pointBackgroundColor: '#fff',
          pointBorderColor: colors[index % colors.length],
          pointBorderWidth: 2,
          tension: 0.4,
          fill: chartType === 'area' ? 'origin' : false, 
      };
  });

  const finalTimeSeriesDatasets = timeSeriesDatasets.length > 0 ? timeSeriesDatasets : [
      {
          label: 'Total Cost',
          data: chartTrends.map(t => t.total_cost),
          backgroundColor: '#3b82f6',
          borderColor: '#3b82f6',
          borderWidth: 1,
          barThickness: 'flex',
          maxBarThickness: 32,
          fill: chartType === 'area',
      }
  ];

  const timeSeriesData = {
    labels,
    datasets: finalTimeSeriesDatasets,
  };

  // --- Data Preparation for Aggregated Distribution (Doughnut, Pie) ---
  // Sum up costs per service across ALL time periods
  const aggregatedData = serviceList.map(serviceName => {
      let total = 0;
      chartTrends.forEach(t => {
          const item = t.breakdown?.find(b => b.service_name === serviceName);
          if (item) total += item.cost;
      });
      return total;
  });

  const distributionData = {
      labels: serviceList,
      datasets: [{
          data: aggregatedData,
          backgroundColor: colors.slice(0, serviceList.length),
          borderColor: '#ffffff',
          borderWidth: 2,
      }]
  };


  // --- Options Configuration ---
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: { 
            usePointStyle: true,
            boxWidth: 8, 
            padding: 20,
            font: { family: "'Inter', sans-serif", size: 11 },
            color: '#64748b' // slate-500
        }
      },
      tooltip: {
        backgroundColor: '#1e293b', // slate-800
        padding: 12,
        titleFont: { family: "'Inter', sans-serif", size: 13, weight: '600' },
        bodyFont: { family: "'Inter', sans-serif", size: 12 },
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 4,
        callbacks: {
          label: (context) => ` ${context.dataset.label || context.label}: $${context.raw.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
        }
      },
      title: {
          display: false
      }
    },
    onClick: (event, elements) => {
      if (elements && elements.length > 0 && (chartType === 'bar' || chartType === 'line' || chartType === 'area')) {
        const index = elements[0].index;
        const rawDate = chartTrends[index]?.date || chartTrends[index]?.period;
        if (onBarClick && rawDate) onBarClick(rawDate);
      }
    }
  };

  const scaleOptions = {
      ...commonOptions,
      scales: {
        x: {
          stacked: chartType === 'bar' || chartType === 'area', 
          grid: { display: false, drawBorder: false },
          ticks: { 
              font: { family: "'Inter', sans-serif", size: 11 }, 
              color: '#94a3b8', // slate-400
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 12
          },
          border: { display: false }
        },
        y: {
          stacked: chartType === 'bar' || chartType === 'area',
          grid: { color: '#f1f5f9', borderDash: [4, 4], drawBorder: false }, // slate-100
          ticks: { 
              font: { family: "'Inter', sans-serif", size: 11 }, 
              color: '#94a3b8', // slate-400
              callback: (value) => `$${value}` 
            },
          beginAtZero: true,
          border: { display: false }
        },
      },
  };

  const pieOptions = {
      ...commonOptions,
      plugins: {
          ...commonOptions.plugins,
          legend: { 
              position: 'right',
              labels: {
                  usePointStyle: true,
                  boxWidth: 8,
                  padding: 15,
                  font: { family: "'Inter', sans-serif", size: 11 },
                  color: '#64748b'
              }
          }
      },
      cutout: chartType === 'doughnut' ? '70%' : undefined
  };

  // --- Render Chart based on Type ---
  if (chartType === 'line' || chartType === 'area') {
      return (
        <div className="w-full h-full">
          <Line data={timeSeriesData} options={scaleOptions} />
        </div>
      );
  }
  
  if (chartType === 'doughnut') {
      return (
        <div className="w-full h-full relative">
             <Doughnut data={distributionData} options={pieOptions} />
        </div>
      );
  }

  if (chartType === 'pie') {
      return (
        <div className="w-full h-full relative">
             <Pie data={distributionData} options={pieOptions} />
        </div>
      );
  }

  // Default to Bar (Stacked)
  return (
    <div className="w-full h-full">
      <Bar data={timeSeriesData} options={scaleOptions} />
    </div>
  );
};

export default CostChart;
