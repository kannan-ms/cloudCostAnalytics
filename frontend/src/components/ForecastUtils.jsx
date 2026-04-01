import React from 'react';
import { TrendingUp, TrendingDown, Minus, Gauge, DollarSign, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const RISK_CONFIG = {
    Critical: { color: 'text-red-700', bg: 'bg-red-50 border-red-200', Icon: AlertTriangle },
    Warning: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', Icon: TrendingUp },
    Good: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', Icon: TrendingDown },
    default: { color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', Icon: Minus },
};

const STATUS_COLOR = {
    Increasing: 'text-red-600 bg-red-50',
    Decreasing: 'text-emerald-600 bg-emerald-50',
    default: 'text-slate-600 bg-slate-50',
};

export const CARD_CONFIG = [
    {
        key: 'projected',
        label: 'Projected Spend',
        icon: DollarSign,
        iconColor: 'text-slate-400',
        accent: 'border-l-blue-400',
    },
    {
        key: 'confidence',
        label: 'Forecast Confidence',
        icon: Gauge,
        iconColor: 'text-slate-400',
        accent: 'border-l-emerald-400',
    },
];

export function computeCardValues(summary, days) {
    const { total_predicted_cost, growth_percentage, status_badge, confidence_score, predicted_daily_avg } = summary;
    const projectedMonthly = predicted_daily_avg ? predicted_daily_avg * 30 : (total_predicted_cost / days) * 30;

    let exhaustionLabel = '—';
    if (growth_percentage > 0 && predicted_daily_avg > 0) {
        const daysUntilExhaust = Math.round(30 / (1 + growth_percentage / 100));
        exhaustionLabel = `~${daysUntilExhaust} days`;
    } else {
        exhaustionLabel = 'No breach expected';
    }

    return {
        projected: {
            value: `$${projectedMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            sub: `over ${days}-day window`,
            trend: growth_percentage,
        },
        growth: {
            value: `${growth_percentage > 0 ? '+' : ''}${growth_percentage}%`,
            sub: 'period-over-period',
            trend: growth_percentage,
        },
        confidence: {
            value: `${confidence_score ?? 0}%`,
            sub: summary.period_label,
            trend: null,
        },
        risk: {
            value: status_badge,
            sub: growth_percentage > 20 ? 'Immediate attention needed' : growth_percentage > 5 ? 'Monitor closely' : 'Within normal range',
            trend: growth_percentage,
        },
        exhaustion: {
            value: exhaustionLabel,
            sub: 'at current growth rate',
            trend: growth_percentage,
        },
    };
}

export const InsightCard = ({ config, data }) => {
    const { label, icon: Icon, iconColor, accent } = config;
    const { value, sub, trend } = data;

    return (
        <div className={`relative bg-white rounded-xl border border-slate-200/70 border-l-[3px] ${accent} p-4 transition-shadow duration-150 hover:shadow-sm`}>
            <p className="text-[17px] font-semibold text-slate-800 leading-snug">{value}</p>
            <div className="flex items-center gap-1.5 mt-1.5">
                <Icon size={12} className={iconColor} />
                <p className="text-[11px] text-slate-400">{label}</p>
            </div>
            <div className="flex items-center justify-between mt-1">
                <p className="text-[10px] text-slate-400/80">{sub}</p>
                {trend !== null && trend !== undefined && (
                    <span className={`text-[10px] font-medium tabular-nums ${trend > 0 ? 'text-red-500' : trend < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {trend > 0 ? '↑' : trend < 0 ? '↓' : '—'} {trend !== 0 ? `${Math.abs(trend)}%` : '0%'}
                    </span>
                )}
            </div>
        </div>
    );
};

export const ForecastTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const date = new Date(label);
    const formatted = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const predicted = payload.find(p => p.dataKey === 'predicted_cost');
    const lower = payload.find(p => p.dataKey === 'lower_bound');
    const upper = payload.find(p => p.dataKey === 'upper_bound');
    const actual = payload.find(p => p.dataKey === 'actual_cost');

    return (
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-xl shadow-lg p-3 min-w-[180px]">
            <div className="text-[11px] font-semibold text-slate-500 mb-2 pb-1.5 border-b border-slate-100">{formatted}</div>
            {actual && <div className="flex justify-between items-center mb-1"><span className="text-[12px] text-slate-600 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />Actual</span><span className="text-[12px] font-semibold text-slate-800 tabular-nums">${Number(actual.value).toFixed(2)}</span></div>}
            {predicted && <div className="flex justify-between items-center mb-1"><span className="text-[12px] text-slate-600 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />Predicted</span><span className="text-[12px] font-semibold text-indigo-700 tabular-nums">${Number(predicted.value).toFixed(2)}</span></div>}
            {lower && upper && <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-100"><span className="text-[11px] text-slate-400">95% interval</span><span className="text-[11px] text-slate-500 tabular-nums">${Number(lower.value).toFixed(0)} – ${Number(upper.value).toFixed(0)}</span></div>}
        </div>
    );
};

export const PredictedDot = ({ cx, cy, payload }) => {
    if (!payload?.is_forecast || cx == null || cy == null) return null;
    const isKeyPoint = payload.forecast_index === 1 || (payload.forecast_index % 7 === 0);
    const isLastPoint = payload.is_forecast && payload.is_forecast_end;
    if (!isKeyPoint && !isLastPoint) return null;
    return isLastPoint ? (
        <g>
            <circle cx={cx} cy={cy} r={9} fill="rgba(99,102,241,0.15)" />
            <circle cx={cx} cy={cy} r={5} fill="#6366f1" stroke="#ffffff" strokeWidth={2} />
        </g>
    ) : (
        <circle cx={cx} cy={cy} r={2.8} fill="#6366f1" stroke="#ffffff" strokeWidth={1} />
    );
};

export const RiskBadge = ({ status, growth }) => {
    const config = RISK_CONFIG[status] || RISK_CONFIG.default;
    const { color, bg, Icon } = config;

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[12px] font-semibold ${bg} ${color}`}>
            <Icon size={14} />
            {status}
            {growth !== undefined && <span className="text-[11px] font-normal opacity-70">({growth > 0 ? '+' : ''}{growth}%)</span>}
        </span>
    );
};

export const ServiceBreakdownTable = ({ services }) => {
    if (!services?.length) return null;

    return (
        <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
            <div className="p-5 pb-3">
                <h3 className="text-sm font-semibold text-slate-700">Service Forecast Breakdown</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Predicted spend per service with growth indicators</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                    <thead>
                        <tr className="border-t border-b border-slate-100">
                            <th className="text-left py-2.5 px-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Service</th>
                            <th className="text-right py-2.5 px-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Current Avg/Day</th>
                            <th className="text-right py-2.5 px-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Predicted Total</th>
                            <th className="text-right py-2.5 px-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Growth</th>
                            <th className="text-left py-2.5 px-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="text-left py-2.5 px-5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.map((svc, idx) => {
                            const currentAvg = svc.history_points?.length ? (svc.history_points.reduce((s, h) => s + h.actual_cost, 0) / svc.history_points.length) : 0;
                            const growthVal = svc.growth_pct ?? 0;
                            const statusColor = STATUS_COLOR[svc.status] || STATUS_COLOR.default;
                            const growthColor = growthVal > 0 ? 'text-red-600' : growthVal < 0 ? 'text-emerald-600' : 'text-slate-600';

                            return (
                                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3 px-5 font-medium text-slate-700">{svc.service_name}</td>
                                    <td className="py-3 px-5 text-right tabular-nums text-slate-600">${currentAvg.toFixed(2)}</td>
                                    <td className="py-3 px-5 text-right tabular-nums font-semibold text-slate-800">${svc.total_predicted_cost?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td className={`py-3 px-5 text-right tabular-nums font-semibold ${growthColor}`}>
                                        <span className="flex items-center justify-end gap-0.5">
                                            {growthVal > 0 ? <ArrowUpRight size={13} /> : growthVal < 0 ? <ArrowDownRight size={13} /> : null}
                                            {growthVal > 0 ? '+' : ''}{growthVal}%
                                        </span>
                                    </td>
                                    <td className="py-3 px-5"><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${statusColor}`}>{svc.status}</span></td>
                                    <td className="py-3 px-5 text-[12px] text-slate-500 max-w-[200px]">{svc.action_item}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
