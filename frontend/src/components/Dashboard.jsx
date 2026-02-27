import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart2,
  ChevronDown,
  Layers,
  AlignLeft,
  CircleDot,
  LayoutGrid,
  TrendingUp,
  TrendingDown,
  Calendar,
  Loader2,
  DollarSign,
  Database,
  AlertTriangle,
  Zap,
  PieChart,
  Info,
  ExternalLink
} from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import CostChart, { SERIES_COLORS, CATEGORY_COLORS } from './CostChart';
import FilterBar from './FilterBar';
import EmptyState from './EmptyState';
import FileUpload from './FileUpload';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const Dashboard = ({ showUpload, setShowUpload, globalFilters = {} }) => {
  const navigate = useNavigate();
  const [costs, setCosts] = useState({ trends: [], summary: {} });
  const [insights, setInsights] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [loading, setLoading] = useState(true);

  // View State
  const [hasData, setHasData] = useState(false);
  const [chartType, setChartType] = useState('bar');
  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'cumulative'
  const [granularity, setGranularity] = useState('daily'); // 'daily' | 'monthly'
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [breakdownBy, setBreakdownBy] = useState('service');
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [filters, setFilters] = useState({});

  // Hover state for chart <-> sidebar legend sync
  const [legendHovered, setLegendHovered] = useState(null);

  // Track whether we've auto-set the initial month to the last available month
  const hasSetInitialMonth = useRef(false);
  // Skip the next useEffect re-fetch when we're just syncing the month selector
  const skipNextRefresh = useRef(false);

  const chartTypes = [
    { id: 'bar', label: 'Stacked Bar', icon: BarChart2 },
    { id: 'stackedArea', label: 'Stacked Area', icon: Layers },
    { id: 'hbar', label: 'Horizontal Bar', icon: AlignLeft },
    { id: 'donut', label: 'Donut', icon: CircleDot },
    { id: 'treemap', label: 'Treemap', icon: LayoutGrid },
  ];

  const breakdownOptions = [
    { id: 'service', label: 'Service' },
    { id: 'region', label: 'Region' },
    { id: 'account', label: 'Account' },
    { id: 'provider', label: 'Provider' },
  ];

  const handleBreakdownSelect = (optionId) => {
    setBreakdownBy(optionId);
    setIsBreakdownOpen(false);
  };

  const refreshData = async () => {
    setLoading(true);
    setCosts({ trends: [], summary: {} });
    setCategoryData(null);

    try {
      const timestamp = new Date().getTime();
      const allFilters = { ...globalFilters, ...filters };
      const queryParams = new URLSearchParams({
        _t: timestamp,
        breakdown: breakdownBy,
        granularity: granularity,
        month: selectedMonth,
        ...allFilters
      });

      // On first load, ask the backend to auto-detect the latest month
      // This avoids a double-fetch (fetch all → detect month → re-fetch)
      if (!hasSetInitialMonth.current && selectedMonth === 'all') {
        queryParams.set('latest_month', 'true');
      }

      const [trendRes, insightRes] = await Promise.all([
        api.get(`/costs/trends/auto?${queryParams}`),
        api.getDashboardInsights().catch(() => ({ data: null }))
      ]);

      if (insightRes.data?.success && insightRes.data?.has_data) {
        setInsights(insightRes.data);
      }

      if (trendRes.data && trendRes.data.summary && trendRes.data.summary.total_cost > 0) {
        // If backend detected the latest month, sync the frontend month selector
        if (!hasSetInitialMonth.current && trendRes.data.detected_month) {
          hasSetInitialMonth.current = true;
          skipNextRefresh.current = true; // Prevent useEffect re-fetch
          setSelectedMonth(trendRes.data.detected_month);
          // Don't return — the data is already filtered to this month, just use it
        } else if (!hasSetInitialMonth.current && selectedMonth === 'all') {
          // Fallback: detect from the response date range
          const dateRange = trendRes.data.summary?.date_range;
          if (dateRange?.end) {
            const d = new Date(dateRange.end);
            const lastMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            hasSetInitialMonth.current = true;
            skipNextRefresh.current = true; // Prevent useEffect re-fetch
            setSelectedMonth(lastMonth);
            // Don't return — data should already be filtered
          }
        }

        const trends = trendRes.data.trends.map(t => ({
          ...t,
          date: t.period,
        }));

        setCosts({
          trends: trends,
          summary: {
            ...trendRes.data.summary,
            // Use full_date_range for month picker if backend provided it (latest_month optimization)
            ...(trendRes.data.full_date_range ? { date_range: trendRes.data.full_date_range } : {})
          }
        });
        setHasData(true);

        // ── Monthly category time-series ──
        if (granularity === 'monthly') {
          let targetMonth = selectedMonth;
          if (!targetMonth || targetMonth === 'all') {
            const dateRange = trendRes.data.summary?.date_range;
            if (dateRange?.end) {
              const d = new Date(dateRange.end);
              targetMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            } else {
              const now = new Date();
              targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            }
          }
          try {
            const catRes = await api.getCategoryDailyTrends(targetMonth);
            if (catRes.data?.success && catRes.data.trends?.length) {
              setCategoryData(catRes.data);
            }
          } catch (catErr) {
            console.error('Category daily trends error:', catErr);
          }
        }
      } else {
        setHasData(false);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setHasData(false);
    } finally {
      setLoading(false);
      setShowUpload(false);
    }
  };

  useEffect(() => {
    // Skip re-fetch when we're just syncing the month selector after initial load
    if (skipNextRefresh.current) {
      skipNextRefresh.current = false;
      return;
    }
    refreshData();
  }, [breakdownBy, granularity, selectedMonth, filters, globalFilters]);

  // Generate month options from the data's date range
  const monthOptions = useMemo(() => {
    const options = [{ value: 'all', label: 'All Months' }];
    const range = costs.summary?.date_range;
    if (!range?.start || !range?.end) return options;

    const start = new Date(range.start);
    const end = new Date(range.end);
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);

    while (cursor <= endMonth) {
      const value = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const label = cursor.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      options.push({ value, label });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return options;
  }, [costs.summary?.date_range]);

  // --- Derived Data ---

  // Compute month-over-month change for insight badge
  const monthOverMonth = useMemo(() => {
    if (!costs.trends || costs.trends.length < 2) return null;

    const monthTotals = {};
    costs.trends.forEach(t => {
      const d = new Date(t.date || t.period);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthTotals[key] = (monthTotals[key] || 0) + (t.total_cost || 0);
    });

    const months = Object.keys(monthTotals).sort();
    if (months.length < 2) return null;

    const current = monthTotals[months[months.length - 1]];
    const previous = monthTotals[months[months.length - 2]];
    if (!previous || previous === 0) return null;

    const change = ((current - previous) / previous) * 100;
    return { change: change.toFixed(1), isUp: change >= 0 };
  }, [costs]);

  const serviceList = useMemo(() => {
    if (!costs.trends) return [];

    const totals = {};
    costs.trends.forEach(t => {
      if (t.breakdown) {
        t.breakdown.forEach(b => {
          totals[b.service_name] = (totals[b.service_name] || 0) + b.cost;
        });
      }
    });

    return Object.entries(totals)
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost);
  }, [costs]);

  // --- Render Helpers ---

  if (showUpload) {
    return (
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-[1000] p-4">
        <div className="bg-white rounded-xl border border-slate-200/60 w-full max-w-2xl relative overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100/60 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800">Upload Cost Data</h3>
            <button
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
              onClick={() => setShowUpload(false)}
            >
              <ChevronDown className="rotate-45" size={18} />
            </button>
          </div>
          <div className="p-6">
            <FileUpload onUploadSuccess={refreshData} onSwitchToOverview={refreshData} />
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400 gap-3">
        <Loader2 size={28} className="animate-spin text-blue-400" />
        <p className="text-sm text-slate-400">Loading data…</p>
      </div>
    );
  }

  if (!hasData) {
    return <EmptyState onUploadClick={() => setShowUpload(true)} />;
  }

  // ====================================================================
  //  Dashboard Layout
  // ====================================================================

  const totalCost = costs.summary?.total_cost || 0;
  const dateStart = costs.summary?.date_range?.start;
  const dateEnd = costs.summary?.date_range?.end;

  // Donut chart colors
  const DONUT_COLORS = ['#6366f1', '#14b8a6', '#f43f5e', '#f59e0b', '#8b5cf6', '#64748b'];

  const DonutTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-lg shadow-lg px-3 py-2 text-[12px]">
        <span className="font-semibold text-slate-700">{d.name}</span>
        <span className="ml-2 tabular-nums text-slate-600">${Number(d.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
      </div>
    );
  };

  // Determine summary card data from insights
  const spendChange = insights?.spend_change;
  const topDriver = insights?.top_driver;
  const anomalyCount = insights?.anomaly_count ?? 0;
  const fastestGrowing = insights?.fastest_growing;

  const summaryCards = [
    {
      label: 'Spend Change (7d)',
      value: spendChange ? `${spendChange.change_pct > 0 ? '+' : ''}${spendChange.change_pct}%` : '—',
      sub: spendChange ? `$${spendChange.current_week.toLocaleString(undefined, { maximumFractionDigits: 0 })} this week` : '',
      icon: DollarSign,
      iconColor: 'text-slate-400',
      trend: spendChange?.change_pct ?? null,
      accent: 'border-l-blue-400',
    },
    {
      label: 'Top Cost Driver',
      value: topDriver?.service ?? '—',
      sub: topDriver ? `${topDriver.percentage}% of total` : '',
      icon: Zap,
      iconColor: 'text-slate-400',
      trend: null,
      accent: 'border-l-amber-400',
      link: '/service-analysis',
    },
    {
      label: 'Active Anomalies',
      value: String(anomalyCount),
      sub: anomalyCount > 0 ? 'Review recommended' : 'No issues detected',
      icon: AlertTriangle,
      iconColor: 'text-slate-400',
      trend: null,
      accent: anomalyCount > 0 ? 'border-l-rose-400' : 'border-l-emerald-400',
      link: '/anomalies',
    },
    {
      label: 'Fastest Growing',
      value: fastestGrowing?.service ?? '—',
      sub: fastestGrowing ? `+${fastestGrowing.growth_pct}% growth` : '',
      icon: TrendingUp,
      iconColor: 'text-slate-400',
      trend: fastestGrowing?.growth_pct ?? null,
      accent: 'border-l-violet-400',
      link: '/service-analysis',
    },
  ];

  return (
    <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-6 space-y-6">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Cost Overview</h1>
          <p className="text-[12px] text-slate-400 mt-1">
            {dateStart ? new Date(dateStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''} – {dateEnd ? new Date(dateEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Total Spend</p>
          <p className="text-xl font-semibold text-slate-800 tabular-nums">
            ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <FilterBar filters={filters} onFilterChange={setFilters} />

      {/* ====== 1. FINANCIAL SUMMARY CARDS ====== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => card.link && navigate(card.link)}
              className={`relative bg-white rounded-xl border border-slate-200/70 border-l-[3px] ${card.accent} p-4 transition-shadow duration-150 hover:shadow-sm ${card.link ? 'cursor-pointer' : ''}`}
            >
              {card.link && (
                <ExternalLink size={11} className="text-slate-300 absolute top-3.5 right-3" />
              )}
              <p className="text-[17px] font-semibold text-slate-800 leading-snug truncate">{card.value}</p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Icon size={12} className={card.iconColor} />
                <p className="text-[11px] text-slate-400">{card.label}</p>
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-[10px] text-slate-400/80">{card.sub}</p>
                {card.trend !== null && card.trend !== undefined && (
                  <span className={`text-[10px] font-medium tabular-nums ${card.trend > 0 ? 'text-red-500' : card.trend < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {card.trend > 0 ? '↑' : card.trend < 0 ? '↓' : '—'} {Math.abs(card.trend)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ====== 2. COST DISTRIBUTION + QUICK INSIGHTS (side-by-side) ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Donut Chart — 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/60 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-0.5">Cost Distribution</h3>
          <p className="text-[11px] text-slate-400 mb-4">Spend by service category</p>

          {insights?.distribution && insights.distribution.length > 0 ? (
            <div className="flex flex-col items-center">
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={insights.distribution}
                      dataKey="cost"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={82}
                      paddingAngle={3}
                      strokeWidth={0}
                      animationDuration={800}
                      animationEasing="ease-out"
                    >
                      {insights.distribution.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-2">
                {insights.distribution.map((d, i) => (
                  <div key={d.category} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="text-[11px] text-slate-600">{d.category}</span>
                    <span className="text-[11px] font-semibold text-slate-800 tabular-nums">${d.cost >= 1000 ? (d.cost / 1000).toFixed(1) + 'k' : d.cost.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-52 text-slate-400 text-sm">No category data</div>
          )}
        </div>

        {/* Quick Insights — 3 cols */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200/60 p-5">
          <div className="flex items-center justify-between mb-0.5">
            <h3 className="text-sm font-semibold text-slate-700">Quick Insights</h3>
            <button
              onClick={() => navigate('/service-analysis')}
              className="text-[11px] font-medium text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
            >
              View Details <ExternalLink size={11} />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mb-4">Recent cost trend observations</p>

          {insights?.insights && insights.insights.length > 0 ? (
            <div className="space-y-2">
              {insights.insights.map((insight, idx) => {
                const borderColor = {
                  warning: 'border-l-amber-400',
                  success: 'border-l-emerald-400',
                  info: 'border-l-slate-300',
                };
                const bdr = borderColor[insight.type] || borderColor.info;

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-slate-50/50 border border-slate-100 border-l-[3px] ${bdr}`}
                  >
                    <p className="text-[12px] text-slate-600">{insight.message}</p>
                    {insight.change_pct !== 0 && (
                      <span className={`text-[11px] font-medium shrink-0 tabular-nums ml-3 ${insight.change_pct > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                        {insight.change_pct > 0 ? '+' : ''}{insight.change_pct}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
              <Info size={24} className="text-slate-300" />
              <p className="text-[12px]">No notable changes detected</p>
            </div>
          )}
        </div>
      </div>

      {/* ====== 3. COST TRENDS CHART (below the fold) ====== */}
      <div className="bg-white rounded-xl border border-slate-200/60 p-6 lg:p-7">

        {/* Panel Header */}
        <div className="flex flex-wrap items-start justify-between mb-6 gap-4">
          <div className="flex items-start gap-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Cost Trends</h3>
              <p className="text-[12px] text-slate-400 mt-1">
                {granularity === 'monthly' && categoryData
                  ? `Daily category trends for ${new Date(categoryData.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
                  : `${granularity === 'daily' ? 'Daily' : 'Monthly'} spending breakdown`}
              </p>
            </div>

            {monthOverMonth && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold mt-0.5 ${
                monthOverMonth.isUp
                  ? 'bg-rose-50/80 text-rose-600 border border-rose-100/60'
                  : 'bg-emerald-50/80 text-emerald-600 border border-emerald-100/60'
              }`}>
                {monthOverMonth.isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {monthOverMonth.isUp ? '↑' : '↓'} {Math.abs(monthOverMonth.change)}% {monthOverMonth.isUp ? 'increase' : 'decrease'} this month
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Group by */}
            <div className="relative">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/70 border border-slate-200/60 rounded-lg text-[12px] font-medium text-slate-600 hover:border-slate-300 transition-colors"
                onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
              >
                <span className="text-slate-400">Group:</span>
                <span className="text-slate-800">{breakdownOptions.find(o => o.id === breakdownBy)?.label}</span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform ${isBreakdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isBreakdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-36 bg-white border border-slate-200 rounded-xl shadow-lg z-10 py-1">
                  {breakdownOptions.map(option => (
                    <button
                      key={option.id}
                      className={`w-full text-left px-3.5 py-2 text-[12px] transition-colors ${breakdownBy === option.id
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      onClick={() => handleBreakdownSelect(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-5 w-px bg-slate-200/50" />

            {/* Granularity Toggle */}
            <div className="flex bg-white/50 p-0.5 rounded-lg border border-slate-200/40">
              <button
                onClick={() => setGranularity('daily')}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${granularity === 'daily'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Daily
              </button>
              <button
                onClick={() => setGranularity('monthly')}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${granularity === 'monthly'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Monthly
              </button>
            </div>

            {/* Month Selector */}
            <div className="relative">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/70 border border-slate-200/60 rounded-lg text-[12px] font-medium text-slate-600 hover:border-slate-300 transition-colors"
                onClick={() => setIsMonthOpen(!isMonthOpen)}
              >
                <Calendar size={12} className="text-slate-400" />
                <span className="text-slate-800">{monthOptions.find(o => o.value === selectedMonth)?.label || 'All Months'}</span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform ${isMonthOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMonthOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-10 py-1 max-h-52 overflow-y-auto scrollbar-thin">
                  {monthOptions.map(option => (
                    <button
                      key={option.value}
                      className={`w-full text-left px-3.5 py-2 text-[12px] transition-colors ${
                        selectedMonth === option.value
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                      onClick={() => { setSelectedMonth(option.value); setIsMonthOpen(false); }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="h-5 w-px bg-slate-200/50" />

            {/* Stacked / Cumulative */}
            <div className="flex bg-white/50 p-0.5 rounded-lg border border-slate-200/40">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${viewMode === 'daily'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Stacked
              </button>
              <button
                onClick={() => setViewMode('cumulative')}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${viewMode === 'cumulative'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Cumulative
              </button>
            </div>

            <div className="h-5 w-px bg-slate-200/50" />

            {/* Chart type icons */}
            <div className="flex bg-white/50 p-0.5 rounded-lg border border-slate-200/40">
              {chartTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setChartType(type.id)}
                  className={`p-1.5 rounded-md transition-all ${chartType === type.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                    }`}
                  title={type.label}
                >
                  <type.icon size={15} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart + Sidebar Legend */}
        <div className="flex flex-col lg:flex-row gap-0">
          <div className="flex-1 min-w-0">
            <div className="h-[420px] w-full">
              <CostChart
                costs={costs}
                chartType={chartType}
                viewMode={viewMode}
                hoveredSeries={legendHovered}
                onHoverChange={setLegendHovered}
                hideLegend
                categoryMode={granularity === 'monthly' && !!categoryData}
                categoryData={categoryData}
              />
            </div>
          </div>

          <div className="lg:w-52 lg:border-l border-t lg:border-t-0 border-slate-200/40 lg:pl-5 pt-4 lg:pt-0 lg:ml-5 shrink-0">
            {granularity === 'monthly' && categoryData ? (
              <>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Categories</p>
                <div className="space-y-1 max-h-[370px] overflow-y-auto scrollbar-thin pr-1">
                  {categoryData.categories.map((cat) => {
                    const color = CATEGORY_COLORS[cat] || '#94a3b8';
                    const total = categoryData.trends.reduce((s, t) => s + (t[cat] || 0), 0);
                    const isActive = !legendHovered || legendHovered === cat;
                    return (
                      <div
                        key={cat}
                        className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                          legendHovered === cat ? 'bg-slate-100/80' : 'hover:bg-slate-50/60'
                        } ${!isActive ? 'opacity-30' : ''}`}
                        onMouseEnter={() => setLegendHovered(cat)}
                        onMouseLeave={() => setLegendHovered(null)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-[11px] font-medium text-slate-600 truncate">{cat}</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 tabular-nums shrink-0">
                          ${total >= 1000 ? (total / 1000).toFixed(1) + 'k' : total.toFixed(0)}
                        </span>
                      </div>
                    );
                  })}
                  {categoryData.anomalies.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200/40">
                      <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <AlertTriangle size={10} /> Anomalies ({categoryData.anomalies.length})
                      </p>
                      {categoryData.anomalies.slice(0, 5).map((a, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 px-2 py-1.5 text-[10px]">
                          <span className="text-slate-500 truncate">{new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <span className="font-semibold text-rose-600">+{a.deviation}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Services</p>
                <div className="space-y-1 max-h-[370px] overflow-y-auto scrollbar-thin pr-1">
                  {serviceList.map((service, idx) => {
                    const color = SERIES_COLORS[idx % SERIES_COLORS.length];
                    const isActive = !legendHovered || legendHovered === service.name;
                    return (
                      <div
                        key={service.name}
                        className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                          legendHovered === service.name ? 'bg-slate-100/80' : 'hover:bg-slate-50/60'
                        } ${!isActive ? 'opacity-30' : ''}`}
                        onMouseEnter={() => setLegendHovered(service.name)}
                        onMouseLeave={() => setLegendHovered(null)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-[11px] font-medium text-slate-600 truncate">{service.name}</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 tabular-nums shrink-0">
                          ${service.cost >= 1000 ? (service.cost / 1000).toFixed(1) + 'k' : service.cost.toFixed(0)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
