import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { CHART_COLORS, ChartGradients, XAxisProps, YAxisProps, GridProps } from '../utils/chartConfig.jsx';
import SmartTooltip from './Charts/SmartTooltip';

const CostChart = ({ costs, chartType = 'bar', viewMode = 'daily' }) => {
  const [hoveredSeries, setHoveredSeries] = useState(null);

  // 1. Transform Data for Recharts
  // Input: { trends: [{ period: '2023-01-01', Breakdown: [...] }, ...] }
  // Output: [{ date: 'Jan 01', 'Service A': 100, 'Service B': 200 }, ...]

  const { chartData, serviceNames } = useMemo(() => {
    if (!costs || !costs.trends) return { chartData: [], serviceNames: [] };

    const services = new Set();
    let cumulativeTotals = {};

    const data = costs.trends.map(t => {
      const dateStr = new Date(t.date || t.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const point = { date: dateStr, _originalDate: t.period }; // Keep original date for actions

      if (t.breakdown) {
        t.breakdown.forEach(b => {
          services.add(b.service_name);
          // For cumulative, add to running total
          if (viewMode === 'cumulative') {
            cumulativeTotals[b.service_name] = (cumulativeTotals[b.service_name] || 0) + b.cost;
            point[b.service_name] = cumulativeTotals[b.service_name];
          } else {
            point[b.service_name] = b.cost;
          }
        });
      } else {
        // Fallback if no breakdown
        services.add('Total Cost');
        if (viewMode === 'cumulative') {
          cumulativeTotals['Total Cost'] = (cumulativeTotals['Total Cost'] || 0) + t.total_cost;
          point['Total Cost'] = cumulativeTotals['Total Cost'];
        } else {
          point['Total Cost'] = t.total_cost;
        }
      }
      return point;
    });

    return { chartData: data, serviceNames: Array.from(services) };
  }, [costs, viewMode]);

  // 2. Render Check
  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        No data available for this range.
      </div>
    );
  }

  // 3. Dynamic Series Generation
  const renderSeries = () => {
    const colorKeys = Object.keys(CHART_COLORS).filter(k => k !== 'grid' && k !== 'text' && k !== 'gray');

    return serviceNames.map((service, index) => {
      const color = CHART_COLORS[colorKeys[index % colorKeys.length]];
      const isDimmed = hoveredSeries && hoveredSeries !== service;
      const opacity = isDimmed ? 0.1 : 1;
      const strokeWidth = hoveredSeries === service ? 3 : 2;

      if (chartType === 'line') {
        return (
          <Line
            key={service}
            type="monotone"
            dataKey={service}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeOpacity={opacity}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        );
      }

      if (chartType === 'area') {
        return (
          <Area
            key={service}
            type="monotone"
            dataKey={service}
            stroke={color}
            strokeWidth={strokeWidth}
            fill={`url(#color${index % 2 === 0 ? 'Primary' : 'Secondary'})`} // Cycle gradients
            fillOpacity={isDimmed ? 0.05 : 0.3}
            strokeOpacity={opacity}
            stackId="1"
          />
        );
      }

      // Default Bar
      return (
        <Bar
          key={service}
          dataKey={service}
          fill={color}
          fillOpacity={isDimmed ? 0.2 : 0.9}
          radius={[4, 4, 0, 0]}
          stackId="a"
          maxBarSize={50}
        />
      );
    });
  };

  const ChartComponent = chartType === 'line' ? LineChart : (chartType === 'area' ? AreaChart : BarChart);

  return (
    <div className="w-full h-full relative" onMouseLeave={() => setHoveredSeries(null)}>
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {/* Gradients */}
          <ChartGradients />

          <CartesianGrid {...GridProps} />
          <XAxis dataKey="date" {...XAxisProps} />
          <YAxis {...YAxisProps} />
          <Tooltip content={<SmartTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.5 }} />

          <Legend
            onMouseEnter={(e) => setHoveredSeries(e.value)}
            onMouseLeave={() => setHoveredSeries(null)}
            iconType="circle"
            wrapperStyle={{ paddingTop: '20px' }}
          />

          {renderSeries()}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
};

export default CostChart;
