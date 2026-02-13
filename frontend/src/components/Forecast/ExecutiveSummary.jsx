import React from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

const ExecutiveSummary = ({ summary }) => {
    if (!summary) return null;

    const { total_predicted_cost, growth_percentage, status_badge, risks, period_label } = summary;

    // Determine color based on badge
    let badgeColor = 'bg-gray-100 text-gray-800';
    let Icon = MinusIcon;

    if (status_badge === 'Critical' || status_badge === 'Warning') {
        badgeColor = 'bg-red-100 text-red-800';
        Icon = ArrowTrendingUpIcon;
    } else if (status_badge === 'Good') {
        badgeColor = 'bg-green-100 text-green-800';
        Icon = ArrowTrendingDownIcon;
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Executive Forecast Summary</h2>
                    <p className="text-sm text-gray-500">{period_label}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${badgeColor}`}>
                    <Icon className="h-4 w-4" />
                    {status_badge}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Metric 1: Projected Cost */}
                <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Projected Spend</p>
                    <p className="text-3xl font-bold text-gray-900">
                        ${total_predicted_cost?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        vs. previous period avg.
                    </p>
                </div>

                {/* Metric 2: Growth */}
                <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Expected Variance</p>
                    <div className="flex items-baseline gap-2">
                        <p className={`text-3xl font-bold ${growth_percentage > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {growth_percentage > 0 ? '+' : ''}{growth_percentage}%
                        </p>
                        <span className="text-xs text-gray-500">period-over-period</span>
                    </div>
                </div>

                {/* Metric 3: Top Risk / Insight */}
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                    <div className="flex items-start gap-2">
                        <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-amber-900 mb-1">Risk Assessment</p>
                            {risks && risks.length > 0 ? (
                                <ul className="text-sm text-amber-800 space-y-1">
                                    {risks.map((risk, idx) => (
                                        <li key={idx}>• {risk}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-amber-800">No significant risks detected.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExecutiveSummary;
