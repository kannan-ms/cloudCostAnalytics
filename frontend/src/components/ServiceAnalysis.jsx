import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Search, Loader2, Layers, BarChart2, LineChart, AreaChart,
  TrendingUp, TrendingDown, DollarSign, Database
} from 'lucide-react';
import CostChart, { SERIES_COLORS } from './CostChart';
import api from '../services/api';

const ServiceAnalysis = ({ globalFilters = {} }) => {
  const [costs, setCosts] = useState({ trends: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const timestamp = Date.now();
      const queryParams = new URLSearchParams({
        _t: timestamp,
        breakdown: 'service',
        ...globalFilters
      });
      const trendRes = await api.get(`/costs/trends/auto?${queryParams}`);

      if (trendRes.data?.summary?.total_cost > 0) {
        const trends = trendRes.data.trends.map(t => ({ ...t, date: t.period }));
        setCosts({ trends, summary: trendRes.data.summary });
        setHasData(true);
      } else {
        setHasData(false);
      }
    } catch (err) {
      console.error('Error fetching service data:', err);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [globalFilters]);

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

  const filteredServices = useMemo(() => {
    if (!searchTerm) return serviceList;
    return serviceList.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [serviceList, searchTerm]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400 gap-4">
        <Loader2 size={32} className="animate-spin text-blue-500" />
        <p className="text-sm text-slate-500">Loading service data...</p>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400 gap-4">
        <Database size={32} className="text-slate-300" />
        <p className="text-sm text-slate-500">No cost data available. Upload data to begin analysis.</p>
      </div>
    );
  }

  // Drilled-down view for a single service
  if (selectedService) {
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
      <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-6 space-y-6">
        <button
          onClick={() => setSelectedService(null)}
          className="flex items-center gap-2 text-[13px] font-medium text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to All Services
        </button>

        <div className="bg-white rounded-xl border border-slate-200/60 p-6 lg:p-7">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">{selectedService.name}</h2>
              <p className="text-[13px] text-slate-400 mt-0.5">Service Spend Analysis</p>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">Total Period Spend</p>
              <p className="text-xl font-bold text-slate-900 mt-1">
                ${selectedService.cost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          <div className="h-[350px]">
            <CostChart costs={filteredCosts} chartType="area" viewMode="daily" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Service Analysis</h1>
        <p className="text-[12px] text-slate-400 mt-1">Breakdown of spend across cloud services.</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100/60 flex justify-between items-center">
          <h3 className="text-base font-semibold text-slate-700">Top Services by Spend</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Filter services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200/80 rounded-lg text-[12px] bg-white/70 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none w-56 transition-colors"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] text-slate-600">
            <thead className="bg-slate-50/60 text-slate-500 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Service Name</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5 text-right">Total Spend</th>
                <th className="px-6 py-3.5 text-right">% of Total</th>
                <th className="px-6 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/60">
              {filteredServices.map((service, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-slate-800">{service.name}</td>
                  <td className="px-6 py-4 text-slate-500">Compute</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-800">
                    ${service.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500">
                    {costs.summary.total_cost ? ((service.cost / costs.summary.total_cost) * 100).toFixed(1) + '%' : '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setSelectedService(service)}
                      className="text-blue-600 hover:text-blue-700 font-medium text-[11px] border border-blue-200/80 hover:border-blue-300 bg-blue-50/60 px-3 py-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
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
    </div>
  );
};

export default ServiceAnalysis;
