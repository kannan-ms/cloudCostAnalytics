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

  // 3. Assign Colors dynamically
  const colors = [
      '#0b1136', // Navy
      '#00c853', // Green
      '#ff3d00', // Red/Orange
      '#80d8ff', // Light Blue
      '#D500F9', // Purple
      '#FFD600', // Yellow
      '#2962FF', // Blue
      '#6200EA'  // Deep Purple
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
          barThickness: 16,
          borderRadius: 2,
          // For Line/Area charts
          pointRadius: 2,
          tension: 0.3,
          fill: chartType === 'area' ? true : false, 
      };
  });

  const finalTimeSeriesDatasets = timeSeriesDatasets.length > 0 ? timeSeriesDatasets : [
      {
          label: 'Total Cost',
          data: chartTrends.map(t => t.total_cost),
          backgroundColor: '#0b1136',
          borderColor: '#0b1136',
          borderWidth: 1,
          barThickness: 16,
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
        labels: { boxWidth: 10, font: { size: 10 } }
      },
      tooltip: {
        backgroundColor: 'rgba(11, 17, 54, 0.9)',
        titleFont: { family: 'Inter', size: 13 },
        bodyFont: { family: 'Inter', size: 12 },
        padding: 10,
        cornerRadius: 4,
        callbacks: {
          label: (context) => ` ${context.dataset.label || context.label}: $${context.raw.toFixed(2)}`
        }
      },
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
          ticks: { font: { family: 'Inter', size: 10 }, color: '#8b9bb4', maxRotation: 90, minRotation: 90 }
        },
        y: {
          stacked: chartType === 'bar' || chartType === 'area',
          grid: { color: '#f0f0f0', borderDash: [4, 4], drawBorder: false },
          ticks: { font: { family: 'Inter', size: 10 }, color: '#8b9bb4', callback: (value) => `$${value}` },
          beginAtZero: true,
        },
      },
  };

  const pieOptions = {
      ...commonOptions,
      plugins: {
          ...commonOptions.plugins,
          legend: { position: 'right' }
      }
  };

  // --- Render Chart based on Type ---
  if (chartType === 'line' || chartType === 'area') {
      return (
        <div style={{ height: '100%', width: '100%' }}>
          <Line data={timeSeriesData} options={scaleOptions} />
        </div>
      );
  }
  
  if (chartType === 'doughnut') {
      return (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
             <Doughnut data={distributionData} options={pieOptions} />
        </div>
      );
  }

  if (chartType === 'pie') {
      return (
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
             <Pie data={distributionData} options={pieOptions} />
        </div>
      );
  }

  // Default to Bar (Stacked)
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Bar data={timeSeriesData} options={scaleOptions} />
    </div>
  );
};

export default CostChart;
