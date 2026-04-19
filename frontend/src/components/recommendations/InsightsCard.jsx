import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Activity, Zap } from 'lucide-react';

const InsightsCard = ({ insight }) => {
    if (!insight) return null;

    // Get icon based on type
    const getInsightIcon = (type) => {
        switch (type) {
            case 'increase':
                return <TrendingUp size={24} className="text-red-500" />;
            case 'decrease':
                return <TrendingDown size={24} className="text-emerald-500" />;
            case 'anomaly':
                return <AlertTriangle size={24} className="text-orange-500" />;
            case 'spike':
                return <Zap size={24} className="text-yellow-500" />;
            default:
                return <Activity size={24} className="text-blue-500" />;
        }
    };

    // Get severity badge color
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'high':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'medium':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'low':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    // Get background color based on severity
    const getBackgroundColor = (severity) => {
        switch (severity) {
            case 'high':
                return 'bg-red-50 border-l-4 border-red-500';
            case 'medium':
                return 'bg-yellow-50 border-l-4 border-yellow-500';
            case 'low':
                return 'bg-blue-50 border-l-4 border-blue-500';
            default:
                return 'bg-gray-50 border-l-4 border-gray-500';
        }
    };

    const costDiff = insight.cost_difference || 0;
    const percentChange = insight.percentage_change || 0;

    return (
        <div className={`rounded-lg border border-slate-200 p-5 shadow-sm transition-all duration-150 hover:shadow-md ${getBackgroundColor(insight.severity)}`}>
            <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 pt-1">
                    {getInsightIcon(insight.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-1">
                                {insight.service}
                            </h3>
                            <p className="text-sm text-slate-700 line-clamp-2">
                                {insight.message}
                            </p>
                        </div>
                        <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border ${getSeverityColor(insight.severity)}`}>
                            {insight.severity.charAt(0).toUpperCase() + insight.severity.slice(1)}
                        </span>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200">
                        <div>
                            <p className="text-xs text-slate-600 mb-1">Current Cost</p>
                            <p className="text-sm font-semibold text-slate-900">
                                ₹{(insight.current_cost || 0).toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-600 mb-1">Previous Cost</p>
                            <p className="text-sm font-semibold text-slate-900">
                                ₹{(insight.previous_cost || 0).toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-600 mb-1">Change Amount</p>
                            <p className={`text-sm font-semibold ${costDiff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {costDiff > 0 ? '+' : ''}₹{costDiff.toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-600 mb-1">% Change</p>
                            <p className={`text-sm font-semibold ${percentChange > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
                            </p>
                        </div>
                    </div>

                    {/* Confidence Score */}
                    <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-slate-600">Confidence Level</span>
                            <span className="text-xs font-semibold text-slate-900">{insight.confidence}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${insight.confidence}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InsightsCard;
