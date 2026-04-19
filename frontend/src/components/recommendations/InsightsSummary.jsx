import React from 'react';
import { TrendingUp, AlertTriangle, Activity, BarChart3 } from 'lucide-react';

const InsightsSummary = ({ summary }) => {
    if (!summary) return null;

    const SummaryMetric = ({ value, label, icon: Icon, bgColor, borderColor }) => (
        <div className={`rounded-lg border ${borderColor} ${bgColor} p-4 shadow-sm`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-xs font-medium text-slate-600 mb-2">{label}</p>
                    <p className="text-2xl font-bold text-slate-900">{value}</p>
                </div>
                <div className="flex-shrink-0">
                    <Icon size={20} className="text-slate-500" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-4 gap-4 mb-8">
            <SummaryMetric
                value={summary.total_insights || 0}
                label="Total Insights"
                icon={BarChart3}
                bgColor="bg-slate-50"
                borderColor="border border-slate-200"
            />
            <SummaryMetric
                value={summary.high_severity || 0}
                label="High Severity"
                icon={AlertTriangle}
                bgColor="bg-red-50"
                borderColor="border border-red-200"
            />
            <SummaryMetric
                value={summary.medium_severity || 0}
                label="Medium Severity"
                icon={TrendingUp}
                bgColor="bg-yellow-50"
                borderColor="border border-yellow-200"
            />
            <SummaryMetric
                value={summary.low_severity || 0}
                label="Low Severity"
                icon={Activity}
                bgColor="bg-blue-50"
                borderColor="border border-blue-200"
            />
        </div>
    );
};

export default InsightsSummary;
