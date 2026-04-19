import React, { useState, useEffect } from 'react';
import { Loader2, Activity, AlertTriangle, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import api from '../../services/api';
import InsightsCard from './InsightsCard';
import InsightsSummary from './InsightsSummary';
import MainLayout from '../layout/MainLayout';

const InsightsPageContent = () => {
    const [insights, setInsights] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [days, setDays] = useState(30);
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        fetchInsights();
    }, [days]);

    const fetchInsights = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.getInsights(days);
            
            if (response.data && response.data.success) {
                setInsights(response.data.insights || []);
                setSummary(response.data.summary || {});
                setError(null);
            } else if (response.data && response.data.error) {
                setError(response.data.error);
                setInsights([]);
                setSummary(null);
            } else {
                setError('Failed to load insights. Invalid response format.');
                setInsights([]);
                setSummary(null);
            }
        } catch (err) {
            console.error('Error fetching insights:', err);
            
            // Determine error message
            let errorMsg = 'Failed to load insights. Please try again.';
            if (err.response?.status === 401) {
                errorMsg = 'Authentication failed. Please login again.';
            } else if (err.response?.status === 403) {
                errorMsg = 'You do not have permission to view insights.';
            } else if (err.response?.data?.error) {
                errorMsg = err.response.data.error;
            } else if (err.message) {
                errorMsg = err.message;
            }
            
            setError(errorMsg);
            setInsights([]);
            setSummary(null);
        } finally {
            setLoading(false);
        }
    };

    const filteredInsights = filterType === 'all' 
        ? insights 
        : insights.filter(i => i.type === filterType);

    const TypeBadge = ({ type }) => {
        const typeConfig = {
            increase: { icon: <TrendingUp size={14} />, bg: 'bg-red-100', text: 'text-red-800', label: 'Increase' },
            decrease: { icon: <TrendingDown size={14} />, bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Decrease' },
            anomaly: { icon: <AlertTriangle size={14} />, bg: 'bg-orange-100', text: 'text-orange-800', label: 'Anomaly' },
            spike: { icon: <Zap size={14} />, bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Spike' },
        };

        const config = typeConfig[type] || typeConfig.increase;

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                {config.icon}
                {config.label}
            </span>
        );
    };

    return (
        <div className="flex-1 overflow-auto bg-white">
            <div className="w-full mx-auto px-8 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        Smart Cost Insights
                    </h1>
                    <p className="text-slate-600 text-base">
                        AI-powered analysis of your cloud spending patterns and anomalies
                    </p>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-slate-700">Time Period:</label>
                        <select
                            value={days}
                            onChange={(e) => setDays(parseInt(e.target.value))}
                            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value={7}>Last 7 days</option>
                            <option value={14}>Last 14 days</option>
                            <option value={30}>Last 30 days</option>
                            <option value={60}>Last 60 days</option>
                            <option value={90}>Last 90 days</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-slate-700">Filter:</label>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Types</option>
                            <option value="increase">Increases</option>
                            <option value="decrease">Decreases</option>
                            <option value="anomaly">Anomalies</option>
                            <option value="spike">Spikes</option>
                        </select>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-32">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                        <p className="text-slate-600">Analyzing cost patterns...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-900 font-medium">{error}</p>
                    </div>
                )}

                {/* Summary Section */}
                {!loading && !error && summary && (
                    <InsightsSummary summary={summary} />
                )}

                {/* Insights Grid */}
                {!loading && !error && filteredInsights.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-900">
                                Insights ({filteredInsights.length})
                            </h2>
                            <div className="flex gap-2">
                                {['increase', 'decrease', 'anomaly', 'spike'].map(type => {
                                    const count = insights.filter(i => i.type === type).length;
                                    return count > 0 ? (
                                        <button
                                            key={type}
                                            onClick={() => setFilterType(filterType === type ? 'all' : type)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                filterType === type
                                                    ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                                    : 'bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <TypeBadge type={type} />
                                        </button>
                                    ) : null;
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {filteredInsights.map((insight, index) => (
                                <InsightsCard key={index} insight={insight} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && insights.length === 0 && (
                    <div className="text-center py-16 px-8">
                        <div className="flex justify-center mb-6">
                            <div className="bg-emerald-100 p-3 rounded-lg">
                                <Activity size={32} className="text-emerald-600" />
                            </div>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                            No Insights Found
                        </h3>
                        <p className="text-slate-600 max-w-md mx-auto text-sm">
                            Your cloud spending appears stable. No significant patterns or anomalies were detected in the selected time period.
                        </p>
                    </div>
                )}

                {/* No results after filter */}
                {!loading && !error && insights.length > 0 && filteredInsights.length === 0 && (
                    <div className="text-center py-16 px-8">
                        <Activity size={32} className="mx-auto text-slate-300 mb-3" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            No {filterType} Insights
                        </h3>
                        <p className="text-slate-600 max-w-sm mx-auto">
                            Try selecting a different filter to see other types of insights.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

const InsightsPage = () => {
    return (
        <MainLayout currentView="insights">
            <InsightsPageContent />
        </MainLayout>
    );
};

export default InsightsPage;
