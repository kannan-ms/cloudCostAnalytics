import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart2,
  Activity,
  ChevronDown,
  PieChart,
  LineChart,
  AreaChart,
  TrendingUp,
  Calendar,
  Layers,
  Loader2,
  LayoutDashboard,
  Search,
  ArrowLeft
} from 'lucide-react';
import CostChart from './CostChart';
import FilterBar from './FilterBar';
import AnomalyList from './AnomalyList';
import EmptyState from './EmptyState';
import FileUpload from './FileUpload';
import Forecasts from './Forecasts'; // Integrated Forecasts
import api from '../services/api';

const Dashboard = ({ showUpload, setShowUpload, globalFilters = {} }) => {
  const [costs, setCosts] = useState({ trends: [], summary: {} });
  const [anomalies, setAnomalies] = useState({ anomalies: [] });
  const [loading, setLoading] = useState(true);

  // Navigation State
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'service_analysis' | 'forecasting' | 'anomalies'

  // View State
  const [hasData, setHasData] = useState(false);
  const [chartType, setChartType] = useState('bar');
  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'cumulative'
  const [breakdownBy, setBreakdownBy] = useState('service');
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [filters, setFilters] = useState({});

  // Drill-down State
  const [selectedService, setSelectedService] = useState(null);

  const chartTypes = [
    { id: 'bar', label: 'Bar', icon: BarChart2 },
    { id: 'line', label: 'Line', icon: LineChart },
    { id: 'area', label: 'Area', icon: AreaChart },
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
    setAnomalies({ anomalies: [] });

    try {
      const timestamp = new Date().getTime();
      const allFilters = { ...globalFilters, ...filters };
      const queryParams = new URLSearchParams({
        _t: timestamp,
        breakdown: breakdownBy,
        ...allFilters
      });
      const trendRes = await api.get(`/costs/trends/auto?${queryParams}`);
      const anomalyRes = await api.get(`/anomalies?_t=${timestamp}`);

      if (trendRes.data && trendRes.data.summary && trendRes.data.summary.total_cost > 0) {
        const trends = trendRes.data.trends.map(t => ({
          ...t,
          date: t.period,
        }));

        setCosts({
          trends: trends,
          summary: trendRes.data.summary
        });

        setAnomalies(anomalyRes.data);
        setHasData(true);
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
    refreshData();
  }, [breakdownBy, filters, globalFilters]);

  // --- Derived Data for Service Analysis ---
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
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
        <div className="bg-white rounded-xl w-full max-w-2xl relative shadow-2xl border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-semibold text-slate-800">Upload Cost Data</h3>
            <button
              className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
              onClick={() => setShowUpload(false)}
            >
              <ChevronDown className="rotate-45" size={20} />
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
      <div className="flex flex-col items-center justify-center h-96 text-slate-400 gap-4">
        <Loader2 size={40} className="animate-spin text-blue-500" />
        <p className="font-medium text-slate-500">Analyzing cost patterns...</p>
      </div>
    );
  }

  if (!hasData) {
    return <EmptyState onUploadClick={() => setShowUpload(true)} />;
  }

  // --- New Tabbed Content Renderers ---

  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-100 transition-colors">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">+2.4%</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Total Spend</p>
            <h3 className="text-3xl font-bold text-slate-900">
              ${costs.summary?.total_cost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
              <Calendar size={20} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Date Range</p>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              {costs.summary?.date_range?.start ? new Date(costs.summary?.date_range?.start).toLocaleDateString() : '-'}
              <span className="text-slate-300">→</span>
              {costs.summary?.date_range?.end ? new Date(costs.summary.date_range.end).toLocaleDateString() : '-'}
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors">
              <Layers size={20} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Data Points Used</p>
            <h3 className="text-3xl font-bold text-slate-900">
              {costs.summary?.periods_count || 0}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Chart Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 min-h-[500px]">
        {/* Chart Header Controls */}
        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
          <h3 className="text-lg font-bold text-slate-800">
            Cost Trends <span className="text-slate-400 font-normal">by {breakdownBy}</span>
          </h3>

          <div className="flex items-center gap-3">
            {/* Breakdown Dropdown */}
            <div className="relative">
              <button
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-blue-100"
                onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
              >
                <span className="text-slate-400">Group by:</span>
                <span className="text-slate-900">{breakdownOptions.find(o => o.id === breakdownBy)?.label}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isBreakdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isBreakdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-xl z-10 py-1 animate-in fade-in zoom-in-95 duration-100">
                  {breakdownOptions.map(option => (
                    <button
                      key={option.id}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${breakdownBy === option.id
                        ? 'bg-blue-50 text-blue-700 font-medium'
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

            <div className="h-6 w-px bg-slate-200" />

            {/* View Mode Toggle (Daily/Cumulative) */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'daily'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Daily
              </button>
              <button
                onClick={() => setViewMode('cumulative')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'cumulative'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Cumulative
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200" />

            {/* Chart Type Toggle */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              {chartTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setChartType(type.id)}
                  className={`p-1.5 rounded-md transition-all ${chartType === type.id
                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                    : 'text-slate-400 hover:text-slate-600'
                    }`}
                  title={type.label}
                >
                  <type.icon size={16} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="h-[400px] w-full">
          <CostChart costs={costs} chartType={chartType} viewMode={viewMode} />
        </div>
      </div>
    </div>
  );

  const renderServiceAnalysis = () => {
    if (selectedService) {
      // Drill Down View
      // Filter costs for just this service to pass to chart (simplistic for now)
      // Ideally backend would support filtering, but effectively we can filter the breakdown here for display
      const serviceTrends = costs.trends.map(t => {
        const serviceCost = t.breakdown?.find(b => b.service_name === selectedService.name)?.cost || 0;
        return {
          ...t,
          breakdown: [{ service_name: selectedService.name, cost: serviceCost }],
          total_cost: serviceCost
        };
      });

      const filteredCosts = { ...costs, trends: serviceTrends };

      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
          <button
            onClick={() => setSelectedService(null)}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to All Services
          </button>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedService.name}</h2>
                <p className="text-slate-500">Service Spend Analysis</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Total Period Spend</p>
                <p className="text-2xl font-bold text-slate-900">${selectedService.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>

            <div className="h-[350px]">
              <CostChart costs={filteredCosts} chartType="area" viewMode="daily" />
            </div>
          </div>
        </div>
      );
    }

    // List View
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">Top Services by Spend</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Filter services..."
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none w-64 transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Service Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Total Spend</th>
                <th className="px-6 py-4 text-right">% of Total</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {serviceList.map((service, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 font-medium text-slate-900">{service.name}</td>
                  <td className="px-6 py-4">Compute</td>
                  <td className="px-6 py-4 text-right">${service.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-right">
                    {costs.summary.total_cost ? ((service.cost / costs.summary.total_cost) * 100).toFixed(1) + '%' : '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setSelectedService(service)}
                      className="text-blue-600 hover:text-blue-800 font-medium text-xs border border-blue-200 hover:border-blue-400 bg-blue-50 px-3 py-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100"
                    >
                      Analyze
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1600px] mx-auto p-8 space-y-8">

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cost Overview</h1>
          <p className="text-slate-500 mt-1">Track spend, detect anomalies, and forecast trends.</p>
        </div>
      </div>

      <FilterBar filters={filters} onFilterChange={setFilters} />

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'service_analysis', label: 'Service Analysis', icon: Layers },
            { id: 'forecasting', label: 'Forecasting', icon: TrendingUp },
            { id: 'anomalies', label: 'Anomalies', icon: Activity },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-all
                ${activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }
              `}
            >
              <tab.icon className={`
                -ml-0.5 mr-2 h-5 w-5
                ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-500'}
              `} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content Area */}
      <div className="min-h-[500px]">
        {activeTab === 'overview' && renderOverview()}

        {activeTab === 'service_analysis' && renderServiceAnalysis()}

        {activeTab === 'forecasting' && (
          <div className="animate-in fade-in duration-500">
            <Forecasts globalFilters={globalFilters} />
          </div>
        )}

        {activeTab === 'anomalies' && (
          <div className="animate-in fade-in duration-500">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Detected Anomalies</h3>
              <AnomalyList anomalies={anomalies?.anomalies || []} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
