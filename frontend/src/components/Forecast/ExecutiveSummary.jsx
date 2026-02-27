import React from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';

const ExecutiveSummary = ({ summary }) => {
    if (!summary) return null;

    const { total_predicted_cost, growth_percentage, status_badge, risks, period_label } = summary;

    let badgeColor = 'bg-slate-100 text-slate-700';
    let Icon = Minus;

    if (status_badge === 'Critical' || status_badge === 'Warning') {
        badgeColor = 'bg-red-50 text-red-700';
        Icon = TrendingUp;
    } else if (status_badge === 'Good') {
        badgeColor = 'bg-emerald-50 text-emerald-700';
        Icon = TrendingDown;
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200/60 p-5 mb-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5">
                <div>
                    <h2 className="text-[15px] font-bold text-slate-800">Executive Forecast Summary</h2>
                    <p className="text-[12px] text-slate-500 mt-0.5">{period_label}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-[12px] font-semibold flex items-center gap-1 ${badgeColor}`}>
                    <Icon size={14} />
                    {status_badge}
                </span>
            </div>

            <div className="border-t border-slate-100/60 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3.5 bg-slate-50/80 rounded-xl">
                    <p className="text-[12px] text-slate-500 mb-1">Projected Spend</p>
                    <p className="text-2xl font-bold text-slate-800">
                        ${total_predicted_cost?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                        vs. previous period avg.
                    </p>
                </div>

                <div className="p-3.5 bg-slate-50/80 rounded-xl">
                    <p className="text-[12px] text-slate-500 mb-1">Expected Variance</p>
                    <div className="flex items-baseline gap-2">
                        <p className={`text-2xl font-bold ${growth_percentage > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {growth_percentage > 0 ? '+' : ''}{growth_percentage}%
                        </p>
                        <span className="text-[11px] text-slate-400">period-over-period</span>
                    </div>
                </div>

                <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-100/60">
                    <div className="flex items-start gap-2">
                        <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                            <AlertTriangle size={14} className="text-amber-600" />
                        </div>
                        <div>
                            <p className="text-[12px] font-semibold text-amber-800 mb-1">Risk Assessment</p>
                            {risks && risks.length > 0 ? (
                                <ul className="text-[12px] text-amber-700 space-y-0.5">
                                    {risks.map((risk, idx) => (
                                        <li key={idx}>• {risk}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-[12px] text-amber-700">No significant risks detected.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
};

export default ExecutiveSummary;
