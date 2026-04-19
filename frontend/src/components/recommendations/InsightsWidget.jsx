import React, { useState, useEffect } from 'react';
import { AlertCircle, TrendingUp, DollarSign, Zap, Loader2, Activity, BarChart3 } from 'lucide-react';
import api from '../../services/api';
import InsightsCard from '../recommendations/InsightsCard';

const InsightsWidget = ({ compact = false, limit = 5 }) => {
    const [insights, setInsights] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchInsights();
    }, []);

    const fetchInsights = async () => {
        try {
            setLoading(true);
            const response = await api.getInsights(30);
            if (response.data.success) {
                const allInsights = response.data.insights || [];
                setInsights(allInsights.slice(0, limit));
                setSummary(response.data.summary || {});
            }
        } catch (err) {
            console.error('Failed to load insights:', err);
            setError('Failed to load insights');
        } finally {
            setLoading(false);
        }
    };

    if (compact) {
        return (
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Cost Insights</h3>
                    <Activity size={20} className="text-blue-500" />
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
                )}

                {error && (
                    <div className="text-sm text-red-600">{error}</div>
                )}

                {!loading && insights.length === 0 && (
                    <p className="text-sm text-slate-600">No significant insights at this time</p>
                )}

                {!loading && insights.length > 0 && (
                    <div className="space-y-3">
                        {insights.map((insight, index) => (
                            <div key={index} className="text-sm p-3 rounded-lg bg-slate-50 border border-slate-200">
                                <div className="flex items-start justify-between mb-2">
                                    <span className="font-medium text-slate-900">{insight.service}</span>
                                    <span className={`text-xs px-2 py-1 rounded ${
                                        insight.severity === 'high' 
                                            ? 'bg-red-100 text-red-800'
                                            : insight.severity === 'medium'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-blue-100 text-blue-800'
                                    }`}>
                                        {insight.severity}
                                    </span>
                                </div>
                                <p className="text-slate-600 text-xs line-clamp-2">{insight.message}</p>
                                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                    <span>{insight.percentage_change > 0 ? '+' : ''}{insight.percentage_change.toFixed(1)}%</span>
                                    <span>Confidence: {insight.confidence}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && insights.length > 0 && (
                    <div className="mt-4">
                        <a href="/recommendations" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                            View All Insights →
                        </a>
                    </div>
                )}
            </div>
        );
    }

    // Full view
    return (
        <div>
            {/* Summary Metrics */}
            {summary && !loading && (
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-medium text-slate-600 mb-2">Total Insights</p>
                        <p className="text-2xl font-bold text-slate-900">{summary.total_insights || 0}</p>
                    </div>
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <p className="text-xs font-medium text-red-600 mb-2">High Severity</p>
                        <p className="text-2xl font-bold text-red-900">{summary.high_severity || 0}</p>
                    </div>
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                        <p className="text-xs font-medium text-yellow-600 mb-2">Medium Severity</p>
                        <p className="text-2xl font-bold text-yellow-900">{summary.medium_severity || 0}</p>
                    </div>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <p className="text-xs font-medium text-blue-600 mb-2">Low Severity</p>
                        <p className="text-2xl font-bold text-blue-900">{summary.low_severity || 0}</p>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                    <p className="text-slate-600">Analyzing cost patterns...</p>
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-900 font-medium">{error}</p>
                </div>
            )}

            {/* Insights List */}
            {!loading && insights.length > 0 && (
                <div className="grid grid-cols-1 gap-4">
                    {insights.map((insight, index) => (
                        <InsightsCard key={index} insight={insight} />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && insights.length === 0 && (
                <div className="text-center py-12 px-8">
                    <Activity size={32} className="mx-auto text-slate-300 mb-3" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Insights Available</h3>
                    <p className="text-slate-600 max-w-sm mx-auto">
                        Your spending patterns appear normal. Insights will appear when significant changes are detected.
                    </p>
                </div>
            )}
        </div>
    );
};

export default InsightsWidget;
