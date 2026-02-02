import React, { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';
import CostChart from './CostChart';
import FilterBar from './FilterBar';
import AnomalyList from './AnomalyList';
import EmptyState from './EmptyState';
import FileUpload from './FileUpload';
import api from '../services/api';

const Dashboard = ({ showUpload, setShowUpload, globalFilters = {} }) => {
  const [costs, setCosts] = useState({ trends: [], summary: {} });
  const [anomalies, setAnomalies] = useState({ anomalies: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cost_timeline');
  const [hasData, setHasData] = useState(false);
  const [chartType, setChartType] = useState('bar');
  const [breakdownBy, setBreakdownBy] = useState('service');
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [filters, setFilters] = useState({});

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

  return (
    <div className="max-w-[1600px] mx-auto p-8 space-y-8">
      
      {/* Top Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cost Overview</h1>
            <p className="text-slate-500 mt-1">Track spend, detect anomalies, and forecast trends.</p>
         </div>

         <div className="flex items-center gap-3 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
             <button
                onClick={() => setActiveTab('cost_timeline')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'cost_timeline' 
                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
             >
                <BarChart2 size={16} />
                Cost Timeline
             </button>
             <button
                onClick={() => setActiveTab('anomaly_monitor')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'anomaly_monitor' 
                    ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-200' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
             >
                <Activity size={16} />
                Anomalies
             </button>
         </div>
      </div>

      <FilterBar filters={filters} onFilterChange={setFilters} />

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

      {/* Main Content Area */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 min-h-[500px]">
        
        {/* Chart Header Controls */}
        {activeTab === 'cost_timeline' && (
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
                                        className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                            breakdownBy === option.id
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

                    {/* Chart Type Toggle */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        {chartTypes.map(type => (
                             <button
                                key={type.id}
                                onClick={() => setChartType(type.id)}
                                className={`p-1.5 rounded-md transition-all ${
                                    chartType === type.id
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
        )}

        {/* Content */}
        <div className="h-[400px] w-full">
            {activeTab === 'cost_timeline' && (
            <CostChart costs={costs} chartType={chartType} />
            )}
            {activeTab === 'anomaly_monitor' && (
            <AnomalyList anomalies={anomalies?.anomalies || []} />
            )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
