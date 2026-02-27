import React, { useState, useEffect, useMemo } from 'react';
import {
    Loader, BarChart3, UserCheck, TrendingUp, TrendingDown, Minus,
    DollarSign, ShieldCheck, Activity, Gauge, CalendarClock,
    AlertTriangle, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import api from '../services/api';
import AdvancedForecast from './AdvancedForecast';
import {
    ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine
} from 'recharts';
import { CHART_COLORS, ChartGradients, XAxisProps, YAxisProps, GridProps } from '../utils/chartConfig.jsx';

/* ------------------------------------------------------------------ */
/*  Predictive Insight Cards                                          */
/* ------------------------------------------------------------------ */
const CARD_CONFIG = [
    {
        key: 'projected',
        label: 'Projected Spend',
        icon: DollarSign,
        iconColor: 'text-slate-400',
        accent: 'border-l-blue-400',
    },
    {
        key: 'growth',
        label: 'Cost Growth Rate',
        icon: Activity,
        iconColor: 'text-slate-400',
        accent: 'border-l-amber-400',
    },
    {
        key: 'confidence',
        label: 'Forecast Confidence',
        icon: Gauge,
        iconColor: 'text-slate-400',
        accent: 'border-l-emerald-400',
    },
    {
        key: 'risk',
        label: 'Risk Level',
        icon: ShieldCheck,
        iconColor: 'text-slate-400',
        accent: 'border-l-rose-400',
    },
    {
        key: 'exhaustion',
        label: 'Est. Budget Exhaustion',
        icon: CalendarClock,
        iconColor: 'text-slate-400',
        accent: 'border-l-violet-400',
    },
];

function computeCardValues(summary, days) {
    const { total_predicted_cost, growth_percentage, status_badge, confidence_score, predicted_daily_avg } = summary;

    const projectedMonthly = predicted_daily_avg ? predicted_daily_avg * 30 : (total_predicted_cost / days) * 30;

    // Estimated budget exhaustion — assume a rough monthly budget of current monthly × 1.0
    // If costs are growing, estimate when a hypothetical monthly budget is breached
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

const InsightCard = ({ config, data }) => {
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

/* ------------------------------------------------------------------ */
/*  Enhanced Forecast Chart Tooltip                                   */
/* ------------------------------------------------------------------ */
const ForecastTooltip = ({ active, payload, label }) => {
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
            {actual && (
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[12px] text-slate-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                        Actual
                    </span>
                    <span className="text-[12px] font-semibold text-slate-800 tabular-nums">${Number(actual.value).toFixed(2)}</span>
                </div>
            )}
            {predicted && (
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[12px] text-slate-600 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                        Predicted
                    </span>
                    <span className="text-[12px] font-semibold text-indigo-700 tabular-nums">${Number(predicted.value).toFixed(2)}</span>
                </div>
            )}
            {lower && upper && (
                <div className="flex justify-between items-center mt-1 pt-1 border-t border-slate-100">
                    <span className="text-[11px] text-slate-400">95% interval</span>
                    <span className="text-[11px] text-slate-500 tabular-nums">${Number(lower.value).toFixed(0)} – ${Number(upper.value).toFixed(0)}</span>
                </div>
            )}
        </div>
    );
};

/* ------------------------------------------------------------------ */
/*  Risk Indicator Badge                                              */
/* ------------------------------------------------------------------ */
const RiskBadge = ({ status, growth }) => {
    let color, bg, Icon;
    if (status === 'Critical') {
        color = 'text-red-700'; bg = 'bg-red-50 border-red-200'; Icon = AlertTriangle;
    } else if (status === 'Warning') {
        color = 'text-amber-700'; bg = 'bg-amber-50 border-amber-200'; Icon = TrendingUp;
    } else if (status === 'Good') {
        color = 'text-emerald-700'; bg = 'bg-emerald-50 border-emerald-200'; Icon = TrendingDown;
    } else {
        color = 'text-slate-600'; bg = 'bg-slate-50 border-slate-200'; Icon = Minus;
    }

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[12px] font-semibold ${bg} ${color}`}>
            <Icon size={14} />
            {status}
            {growth !== undefined && <span className="text-[11px] font-normal opacity-70">({growth > 0 ? '+' : ''}{growth}%)</span>}
        </span>
    );
};

/* ------------------------------------------------------------------ */
/*  Service Breakdown Table                                           */
/* ------------------------------------------------------------------ */
const ServiceBreakdownTable = ({ services }) => {
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
                            const currentAvg = svc.history_points?.length
                                ? (svc.history_points.reduce((s, h) => s + h.actual_cost, 0) / svc.history_points.length)
                                : 0;

                            let statusColor = 'text-slate-600 bg-slate-50';
                            if (svc.status === 'Increasing') statusColor = 'text-red-600 bg-red-50';
                            else if (svc.status === 'Decreasing') statusColor = 'text-emerald-600 bg-emerald-50';

                            const growthVal = svc.growth_pct ?? 0;
                            let growthColor = 'text-slate-600';
                            if (growthVal > 0) growthColor = 'text-red-600';
                            else if (growthVal < 0) growthColor = 'text-emerald-600';

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
                                    <td className="py-3 px-5">
                                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${statusColor}`}>
                                            {svc.status}
                                        </span>
                                    </td>
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

/* ------------------------------------------------------------------ */
/*  Main Forecasts Component                                          */
/* ------------------------------------------------------------------ */
const Forecasts = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [forecastData, setForecastData] = useState(null);
    const [days, setDays] = useState(30);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const fetchForecasts = async () => {
        try {
            setLoading(true);
            const response = await api.getForecasts(days, true);
            setForecastData(response.data);
            setError(null);
        } catch (err) {
            console.error("Forecast error:", err);
            setError("Unable to load forecast data. Please try again.");
            setForecastData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchForecasts();
    }, [days]);

    /* ---------- Derived data ---------- */
    const chartData = useMemo(() => {
        if (!forecastData?.global_forecast) return [];
        const { history, forecast } = forecastData.global_forecast;

        const histPoints = (history || []).map(h => ({
            date: h.date,
            actual_cost: h.actual_cost,
        }));

        const forecastPoints = (forecast || []).map(f => ({
            date: f.date,
            predicted_cost: f.predicted_cost,
            lower_bound: f.lower_bound,
            upper_bound: f.upper_bound,
        }));

        // Add a bridge point — last history point repeated for forecast start
        if (histPoints.length && forecastPoints.length) {
            const lastHist = histPoints[histPoints.length - 1];
            forecastPoints.unshift({
                date: lastHist.date,
                predicted_cost: lastHist.actual_cost,
                lower_bound: lastHist.actual_cost,
                upper_bound: lastHist.actual_cost,
            });
        }

        return [...histPoints, ...forecastPoints];
    }, [forecastData]);

    const cardValues = useMemo(() => {
        if (!forecastData?.executive_summary) return null;
        return computeCardValues(forecastData.executive_summary, days);
    }, [forecastData, days]);

    /* ---------- Loading / Error states ---------- */
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader className="animate-spin text-indigo-500 mb-4" size={28} />
                <span className="text-slate-500 text-sm">Generating forecast models...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">{error}</div>
            </div>
        );
    }

    if (!forecastData?.global_forecast) return null;

    const { executive_summary, top_services_forecast } = forecastData;

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">

            {/* -------- Header Bar -------- */}
            <div className="bg-white rounded-xl border border-slate-200/60 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-semibold text-slate-800">Cost Forecast</h1>
                    <RiskBadge status={executive_summary?.status_badge} growth={executive_summary?.growth_percentage} />
                </div>

                <div className="flex bg-slate-100 rounded-lg p-1">
                    {[30, 60, 90].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-4 py-1.5 text-[13px] font-medium rounded-md transition-all ${days === d ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {d} Days
                        </button>
                    ))}
                </div>
            </div>

            {/* -------- Predictive Insight Cards -------- */}
            {cardValues && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {CARD_CONFIG.map(cfg => (
                        <InsightCard key={cfg.key} config={cfg} data={cardValues[cfg.key]} />
                    ))}
                </div>
            )}

            {/* -------- Enhanced Forecast Chart -------- */}
            <div className="bg-white rounded-xl border border-slate-200/60 p-6">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-700">Total Cost Trajectory</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Historical spend with {days}-day predictive outlook and 95% confidence band</p>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-slate-400 rounded inline-block" /> Actual</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-indigo-500 rounded inline-block" /> Predicted</span>
                        <span className="flex items-center gap-1.5"><span className="w-5 h-3 bg-indigo-100 rounded inline-block opacity-60" /> Confidence</span>
                    </div>
                </div>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.18} />
                                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.04} />
                                </linearGradient>
                                <linearGradient id="actualLine" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#94a3b8" />
                                    <stop offset="100%" stopColor="#64748b" />
                                </linearGradient>
                            </defs>
                            <CartesianGrid {...GridProps} />
                            <XAxis
                                dataKey="date"
                                {...XAxisProps}
                                tickFormatter={(str) => {
                                    const d = new Date(str);
                                    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                }}
                            />
                            <YAxis {...YAxisProps} />
                            <Tooltip content={<ForecastTooltip />} />

                            {/* Confidence band */}
                            <Area
                                type="monotone"
                                dataKey="upper_bound"
                                stroke="none"
                                fill="url(#forecastBand)"
                                fillOpacity={1}
                                isAnimationActive={true}
                                animationDuration={800}
                            />
                            <Area
                                type="monotone"
                                dataKey="lower_bound"
                                stroke="none"
                                fill="#f0f2f5"
                                fillOpacity={1}
                                isAnimationActive={true}
                                animationDuration={800}
                            />

                            {/* Upper / lower bound lines */}
                            <Line
                                type="monotone"
                                dataKey="upper_bound"
                                stroke="#a5b4fc"
                                strokeWidth={1}
                                strokeDasharray="4 3"
                                dot={false}
                                isAnimationActive={true}
                                animationDuration={800}
                            />
                            <Line
                                type="monotone"
                                dataKey="lower_bound"
                                stroke="#a5b4fc"
                                strokeWidth={1}
                                strokeDasharray="4 3"
                                dot={false}
                                isAnimationActive={true}
                                animationDuration={800}
                            />

                            {/* Actual cost line */}
                            <Line
                                type="monotone"
                                dataKey="actual_cost"
                                stroke="url(#actualLine)"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 5, strokeWidth: 0, fill: '#64748b' }}
                                isAnimationActive={true}
                                animationDuration={900}
                                animationEasing="ease-out"
                            />

                            {/* Predicted cost line */}
                            <Line
                                type="monotone"
                                dataKey="predicted_cost"
                                stroke="#6366f1"
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 5, strokeWidth: 0, fill: '#6366f1' }}
                                isAnimationActive={true}
                                animationDuration={900}
                                animationEasing="ease-out"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* -------- Service Breakdown Table -------- */}
            <ServiceBreakdownTable services={top_services_forecast} />

            {/* -------- Advanced / Technical Section -------- */}
            <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between p-4 text-[13px] font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                    <span className="flex items-center gap-2">
                        <BarChart3 size={16} className="text-indigo-400" />
                        Advanced Analysis & Service Comparison
                    </span>
                    {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showAdvanced && (
                    <div className="px-4 pb-5 border-t border-slate-100 pt-4">
                        <AdvancedForecast />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Forecasts;
