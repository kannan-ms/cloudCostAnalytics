import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Cell,
  PieChart as RechartsPieChart,
  Pie,
  Treemap,
} from 'recharts';
import { CHART_COLORS, ChartGradients, XAxisProps, YAxisProps, GridProps } from '../utils/chartConfig.jsx';
import SmartTooltip from './Charts/SmartTooltip';

const SERIES_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.tertiary,
  CHART_COLORS.quaternary,
  CHART_COLORS.quinary,
  CHART_COLORS.gray,
];

// Fixed colors per infrastructure category for consistency
const CATEGORY_COLORS = {
  Compute: '#6366f1',
  Storage: '#14b8a6',
  Database: '#f43f5e',
  Networking: '#f59e0b',
  Management: '#8b5cf6',
  Security: '#64748b',
  Other: '#94a3b8',
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Category-mode Tooltip (shows % deviation from 7d avg)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CategoryTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  // payload[0].payload contains the full row
  const row = payload[0]?.payload || {};

  const formattedDate = (() => {
    try {
      return new Date(label).toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      });
    } catch {
      return label;
    }
  })();

  const total = payload.reduce((s, p) => s + (p.value || 0), 0);

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/30 min-w-[240px] overflow-hidden">
      <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-slate-50/50 border-b border-slate-100/60">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{formattedDate}</p>
      </div>
      <div className="px-4 py-3 space-y-2">
        {payload.map((entry, i) => {
          const cat = entry.name;
          const dev = row[`${cat}_dev`];
          const isAnomaly = dev !== undefined && dev > 40;
          return (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-[11.5px] font-medium text-slate-600 truncate">{cat}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[12px] font-bold text-slate-800 tabular-nums">
                  ${entry.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                {dev !== undefined && dev !== 0 && (
                  <span className={`text-[10px] font-semibold tabular-nums px-1 py-0.5 rounded ${
                    isAnomaly ? 'bg-rose-100 text-rose-600' : dev > 0 ? 'text-amber-600' : 'text-emerald-600'
                  }`}>
                    {dev > 0 ? '+' : ''}{dev}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {payload.length > 1 && (
        <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100/60 flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total</span>
          <span className="text-[12.5px] font-bold text-slate-900 tabular-nums">
            ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );
};

// Anomaly dot renderer
const AnomalyDot = (props) => {
  const { cx, cy } = props;
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill="rgba(244,63,94,0.15)" stroke="none" />
      <circle cx={cx} cy={cy} r={4} fill="#f43f5e" stroke="#fff" strokeWidth={2} />
    </g>
  );
};

const CostChart = ({
  costs,
  chartType = 'bar',
  viewMode = 'daily',
  hoveredSeries: externalHovered,
  onHoverChange,
  hideLegend = false,
  // ── Category time-series mode ──
  categoryMode = false,
  categoryData = null,    // { trends, categories, anomalies }
}) => {
  const [internalHovered, setInternalHovered] = useState(null);
  const hoveredSeries = externalHovered !== undefined ? externalHovered : internalHovered;

  const handleSetHovered = (val) => {
    setInternalHovered(val);
    onHoverChange?.(val);
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  CATEGORY MODE — multi-line time series by category
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (categoryMode && categoryData) {
    const { trends = [], categories = [], anomalies = [] } = categoryData;

    if (!trends.length) {
      return (
        <div className="flex items-center justify-center h-full text-slate-400 text-[13px]">
          No data available for this month.
        </div>
      );
    }

    // Format X-axis dates
    const formattedTrends = trends.map(t => ({
      ...t,
      displayDate: new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

    // Build a set of anomaly keys for quick lookup
    const anomalySet = new Set(anomalies.map(a => `${a.date}|${a.category}`));

    // Gradient defs for category areas
    const CategoryGradients = () => (
      <defs>
        {categories.map((cat) => (
          <linearGradient key={`catGrad-${cat}`} id={`catGrad-${cat}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CATEGORY_COLORS[cat] || '#94a3b8'} stopOpacity={0.15} />
            <stop offset="95%" stopColor={CATEGORY_COLORS[cat] || '#94a3b8'} stopOpacity={0.02} />
          </linearGradient>
        ))}
      </defs>
    );

    return (
      <div className="w-full h-full relative" onMouseLeave={() => handleSetHovered(null)}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formattedTrends} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
            <CategoryGradients />
            <CartesianGrid {...GridProps} />
            <XAxis
              dataKey="displayDate"
              {...XAxisProps}
              interval="preserveStartEnd"
            />
            <YAxis {...YAxisProps} />
            <Tooltip
              content={<CategoryTooltip />}
              cursor={{ stroke: '#e2e8f0', strokeWidth: 1, strokeDasharray: '4 4' }}
            />

            {/* Area fills under lines */}
            {categories.map((cat) => {
              const color = CATEGORY_COLORS[cat] || '#94a3b8';
              const isDimmed = hoveredSeries && hoveredSeries !== cat;
              return (
                <Area
                  key={`area-${cat}`}
                  type="monotone"
                  dataKey={cat}
                  stroke="none"
                  fill={`url(#catGrad-${cat})`}
                  fillOpacity={isDimmed ? 0.02 : 1}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              );
            })}

            {/* Lines */}
            {categories.map((cat) => {
              const color = CATEGORY_COLORS[cat] || '#94a3b8';
              const isDimmed = hoveredSeries && hoveredSeries !== cat;
              return (
                <Line
                  key={`line-${cat}`}
                  type="monotone"
                  dataKey={cat}
                  stroke={color}
                  strokeWidth={hoveredSeries === cat ? 3 : 2}
                  strokeOpacity={isDimmed ? 0.15 : 1}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0, fill: color }}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              );
            })}

            {/* Anomaly markers */}
            {anomalies.map((a, i) => {
              const idx = formattedTrends.findIndex(t => t.date === a.date);
              if (idx === -1) return null;
              return (
                <ReferenceDot
                  key={`anomaly-${i}`}
                  x={formattedTrends[idx].displayDate}
                  y={a.cost}
                  shape={<AnomalyDot />}
                  isFront
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  DEFAULT MODE — service breakdown (bar / line / area)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const { chartData, serviceNames } = useMemo(() => {
    if (!costs || !costs.trends) return { chartData: [], serviceNames: [] };

    const services = new Set();
    let cumulativeTotals = {};

    const data = costs.trends.map(t => {
      const dateStr = new Date(t.date || t.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const point = { date: dateStr, _originalDate: t.period };

      if (t.breakdown) {
        t.breakdown.forEach(b => {
          services.add(b.service_name);
          if (viewMode === 'cumulative') {
            cumulativeTotals[b.service_name] = (cumulativeTotals[b.service_name] || 0) + b.cost;
            point[b.service_name] = cumulativeTotals[b.service_name];
          } else {
            point[b.service_name] = b.cost;
          }
        });
      } else {
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

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-[13px]">
        No data available for this range.
      </div>
    );
  }

  // Bar gradient defs
  const BarGradientDefs = () => (
    <defs>
      {SERIES_COLORS.map((color, i) => (
        <linearGradient key={`barGrad${i}`} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.95} />
          <stop offset="100%" stopColor={color} stopOpacity={0.6} />
        </linearGradient>
      ))}
    </defs>
  );

  const renderSeries = () => {
    // ── Aggregate service totals (shared by hbar, donut, treemap) ──
    const getServiceTotals = () => {
      const serviceTotals = {};
      chartData.forEach(point => {
        serviceNames.forEach(sn => {
          serviceTotals[sn] = (serviceTotals[sn] || 0) + (point[sn] || 0);
        });
      });
      return serviceNames
        .map(sn => ({ name: sn, cost: Math.round(serviceTotals[sn] * 100) / 100 }))
        .sort((a, b) => b.cost - a.cost);
    };

    // ── Donut Chart ──
    if (chartType === 'donut') {
      const donutData = getServiceTotals();
      const total = donutData.reduce((s, d) => s + d.cost, 0);

      const DonutTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const d = payload[0].payload;
        const pct = total > 0 ? ((d.cost / total) * 100).toFixed(1) : 0;
        return (
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-200/30 px-4 py-3 min-w-[160px]">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: payload[0].payload.fill }} />
              <span className="text-[12px] font-semibold text-slate-700">{d.name}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-bold text-slate-900">${d.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-[11px] font-medium text-slate-400">{pct}%</span>
            </div>
          </div>
        );
      };

      const dataWithFill = donutData.map((d, i) => ({ ...d, fill: SERIES_COLORS[i % SERIES_COLORS.length] }));

      return (
        <div className="w-full h-full relative flex items-center justify-center" onMouseLeave={() => handleSetHovered(null)}>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={dataWithFill}
                dataKey="cost"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                animationDuration={900}
                animationEasing="ease-out"
                stroke="#fff"
                strokeWidth={2}
              >
                {dataWithFill.map((entry, i) => {
                  const isDimmed = hoveredSeries && hoveredSeries !== entry.name;
                  return <Cell key={entry.name} fill={entry.fill} fillOpacity={isDimmed ? 0.2 : 1} />;
                })}
              </Pie>
              <Tooltip content={<DonutTooltip />} />
              {/* Center label */}
              <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" className="fill-slate-400 text-[11px] font-medium">Total</text>
              <text x="50%" y="56%" textAnchor="middle" dominantBaseline="central" className="fill-slate-900 text-[18px] font-bold">
                ${total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(0)}
              </text>
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      );
    }

    // ── Treemap Chart ──
    if (chartType === 'treemap') {
      const treemapData = getServiceTotals()
        .filter(d => d.cost > 0)
        .map((d, i) => ({ ...d, index: i }));
      if (!treemapData.length) {
        return (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">No data to display</div>
        );
      }
      const total = treemapData.reduce((s, d) => s + d.cost, 0);

      const TreemapContent = (props) => {
        const { x, y, width, height, name, cost, index, depth } = props;
        // Skip root node (depth 0) and tiny rects
        if (depth === 0 || width < 4 || height < 4 || cost == null) return null;
        const color = SERIES_COLORS[(index ?? 0) % SERIES_COLORS.length];
        const isDimmed = hoveredSeries && hoveredSeries !== name;
        const pct = total > 0 ? ((cost / total) * 100).toFixed(1) : 0;
        const showLabel = width > 60 && height > 40;
        const showCost = width > 50 && height > 55;

        return (
          <g>
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              rx={6}
              fill={color}
              fillOpacity={isDimmed ? 0.15 : 0.85}
              stroke="#fff"
              strokeWidth={2}
              style={{ transition: 'fill-opacity 0.2s ease' }}
            />
            {showLabel && (
              <text
                x={x + width / 2}
                y={y + height / 2 - (showCost ? 10 : 0)}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff"
                fontSize={width > 100 ? 13 : 11}
                fontWeight={600}
                style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
              >
                {name.length > (width > 100 ? 18 : 10) ? name.slice(0, width > 100 ? 16 : 8) + '…' : name}
              </text>
            )}
            {showCost && (
              <text
                x={x + width / 2}
                y={y + height / 2 + 14}
                textAnchor="middle"
                dominantBaseline="central"
                fill="rgba(255,255,255,0.85)"
                fontSize={11}
                fontWeight={500}
              >
                ${cost.toFixed(0)} ({pct}%)
              </text>
            )}
          </g>
        );
      };

      const TreemapTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const d = payload[0].payload;
        if (!d || d.cost == null) return null;
        const idx = d.index ?? 0;
        const pct = total > 0 ? ((d.cost / total) * 100).toFixed(1) : 0;
        return (
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-200/30 px-4 py-3 min-w-[160px]">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: SERIES_COLORS[idx % SERIES_COLORS.length] }} />
              <span className="text-[12px] font-semibold text-slate-700">{d.name}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[15px] font-bold text-slate-900">${d.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-[11px] font-medium text-slate-400">{pct}%</span>
            </div>
          </div>
        );
      };

      return (
        <div className="w-full h-full relative" onMouseLeave={() => handleSetHovered(null)}>
          <ResponsiveContainer width="100%" height="100%">
            <Treemap
              data={treemapData}
              dataKey="cost"
              nameKey="name"
              content={<TreemapContent />}
              animationDuration={800}
              animationEasing="ease-out"
            >
              <Tooltip content={<TreemapTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        </div>
      );
    }

    if (chartType === 'hbar') {
      // Horizontal bar — aggregate per service, one bar each
      const serviceTotals = {};
      chartData.forEach(point => {
        serviceNames.forEach(sn => {
          serviceTotals[sn] = (serviceTotals[sn] || 0) + (point[sn] || 0);
        });
      });
      const hbarData = serviceNames
        .map(sn => ({ name: sn, cost: Math.round(serviceTotals[sn] * 100) / 100 }))
        .sort((a, b) => b.cost - a.cost);

      return (
        <div className="w-full h-full relative" onMouseLeave={() => handleSetHovered(null)}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hbarData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
              <CartesianGrid {...GridProps} horizontal={false} />
              <XAxis
                type="number"
                {...YAxisProps}
                tickFormatter={v => `$${v}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 12, fill: '#64748b' }}
              />
              <Tooltip
                content={<SmartTooltip />}
                cursor={{ fill: 'rgba(241,245,249,0.5)', radius: 4 }}
              />
              <Bar dataKey="cost" radius={[0, 6, 6, 0]} maxBarSize={28} animationDuration={900} animationEasing="ease-out">
                {hbarData.map((entry, i) => {
                  const colorIndex = i % SERIES_COLORS.length;
                  const isDimmed = hoveredSeries && hoveredSeries !== entry.name;
                  return <Cell key={entry.name} fill={SERIES_COLORS[colorIndex]} fillOpacity={isDimmed ? 0.15 : 0.9} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return serviceNames.map((service, index) => {
      const colorIndex = index % SERIES_COLORS.length;
      const color = SERIES_COLORS[colorIndex];
      const isDimmed = hoveredSeries && hoveredSeries !== service;
      const opacity = isDimmed ? 0.12 : 1;

      if (chartType === 'stackedArea') {
        return (
          <Area
            key={service}
            type="monotone"
            dataKey={service}
            stroke={color}
            strokeWidth={hoveredSeries === service ? 2.5 : 1.5}
            fill={color}
            fillOpacity={isDimmed ? 0.04 : 0.35}
            strokeOpacity={opacity}
            stackId="1"
            animationDuration={800}
            animationEasing="ease-out"
          />
        );
      }

      return (
        <Bar
          key={service}
          dataKey={service}
          fill={`url(#barGrad${colorIndex})`}
          fillOpacity={isDimmed ? 0.15 : 1}
          radius={[4, 4, 0, 0]}
          stackId="a"
          maxBarSize={42}
          animationDuration={900}
          animationEasing="ease-out"
        />
      );
    });
  };

  const ChartComponent = chartType === 'stackedArea' ? AreaChart : BarChart;

  // Donut and Treemap are rendered directly inside renderSeries
  if (chartType === 'hbar' || chartType === 'donut' || chartType === 'treemap') {
    return renderSeries();
  }

  return (
    <div className="w-full h-full relative" onMouseLeave={() => handleSetHovered(null)}>
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={chartData} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
          <ChartGradients />
          <BarGradientDefs />

          <CartesianGrid {...GridProps} />
          <XAxis dataKey="date" {...XAxisProps} />
          <YAxis {...YAxisProps} />
          <Tooltip
            content={<SmartTooltip />}
            cursor={{ fill: 'rgba(241,245,249,0.5)', radius: 4 }}
          />

          {renderSeries()}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
};

// Export color arrays / maps for external legend use
export { SERIES_COLORS, CATEGORY_COLORS };
export default CostChart;
