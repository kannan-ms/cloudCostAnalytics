import React, { useState, useEffect, useMemo } from 'react';
import { Loader, ChevronUp, ChevronDown } from 'lucide-react';
import api from '../../services/api';
import AdvancedForecast from './AdvancedForecast';
import { ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { XAxisProps, YAxisProps, GridProps } from '../../utils/chartConfig.jsx';
import { CARD_CONFIG, computeCardValues, InsightCard, ForecastTooltip, PredictedDot, RiskBadge, ServiceBreakdownTable } from './ForecastUtils';
import { CHART_DEFS, ChartAreas, ChartLines, ChartReferences } from './ForecastChartConfig';


const Forecasts = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [forecastData, setForecastData] = useState(null);
    const [days, setDays] = useState(30);
    const [showAdvanced, setShowAdvanced] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await api.getForecasts(days, true);
                setForecastData(response.data);
                setError(null);
            } catch (err) {
                setError("Unable to load forecast data. Please try again.");
                setForecastData(null);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [days]);

    const chartData = useMemo(() => {
        if (!forecastData?.global_forecast) return [];
        const { history, forecast } = forecastData.global_forecast;
        const histPoints = (history || []).map(h => ({ date: h.date, actual_cost: h.actual_cost, is_forecast: false }));
        const forecastPoints = (forecast || []).map((f, idx, arr) => ({
            date: f.date,
            predicted_cost: f.predicted_cost,
            lower_bound: f.lower_bound,
            upper_bound: f.upper_bound,
            confidence_band: Math.max(0, (f.upper_bound ?? 0) - (f.lower_bound ?? 0)),
            predicted_fill: f.predicted_cost,
            forecast_index: idx + 1,
            is_forecast_end: idx === arr.length - 1,
            is_forecast: true,
        }));
        if (histPoints.length && forecastPoints.length) {
            const lastHist = histPoints[histPoints.length - 1];
            forecastPoints.unshift({
                date: lastHist.date,
                predicted_cost: lastHist.actual_cost,
                lower_bound: lastHist.actual_cost,
                upper_bound: lastHist.actual_cost,
                confidence_band: 0,
                predicted_fill: lastHist.actual_cost,
                forecast_index: 0,
                is_forecast_end: false,
                is_forecast: true,
            });
        }
        return [...histPoints, ...forecastPoints];
    }, [forecastData]);

    const forecastStartDate = forecastData?.global_forecast?.forecast?.[0]?.date || null;
    const forecastEndDate = forecastData?.global_forecast?.forecast?.slice(-1)?.[0]?.date || null;

    const forecastStats = useMemo(() => {
        const f = forecastData?.global_forecast?.forecast || [];
        if (!f.length) return null;
        const values = f.map(point => Number(point.predicted_cost || 0));
        return { first: values[0], last: values[values.length - 1], min: Math.min(...values), max: Math.max(...values) };
    }, [forecastData]);

    const cardValues = useMemo(() => {
        if (!forecastData?.executive_summary) return null;
        return computeCardValues(forecastData.executive_summary, days);
    }, [forecastData, days]);

    if (loading) return <div className="flex flex-col items-center justify-center h-64"><Loader className="animate-spin text-indigo-500 mb-4" size={28} /><span className="text-slate-500 text-sm">Generating forecast models...</span></div>;
    if (error) return <div className="p-8 max-w-7xl mx-auto"><div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">{error}</div></div>;
    if (!forecastData?.global_forecast) return null;

    const { executive_summary, top_services_forecast } = forecastData;

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="bg-white rounded-xl border border-slate-200/60 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-semibold text-slate-800">Cost Forecast</h1>
                    <RiskBadge status={executive_summary?.status_badge} growth={executive_summary?.growth_percentage} />
                </div>
                <div className="flex bg-slate-100 rounded-lg p-1">
                    {[30, 60, 90].map(d => (
                        <button key={d} onClick={() => setDays(d)} className={`px-4 py-1.5 text-[13px] font-medium rounded-md transition-all ${days === d ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            {d} Days
                        </button>
                    ))}
                </div>
            </div>

            {cardValues && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {CARD_CONFIG.map(cfg => (
                        <InsightCard key={cfg.key} config={cfg} data={cardValues[cfg.key]} />
                    ))}
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200/60 p-6">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-700">Total Cost Trajectory</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">Historical spend with {days}-day predictive outlook and 95% confidence band</p>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap justify-end">
                        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-slate-400 rounded inline-block" /> Actual</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-indigo-500 rounded inline-block" /> Predicted</span>
                    </div>
                </div>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                            <CHART_DEFS />
                            <CartesianGrid {...GridProps} />
                            <XAxis dataKey="date" {...XAxisProps} tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                            <YAxis {...YAxisProps} />
                            <Tooltip content={<ForecastTooltip />} />
                            <ChartReferences forecastStartDate={forecastStartDate} forecastEndDate={forecastEndDate} forecastStats={forecastStats} />
                            <ChartAreas />
                            <ChartLines />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <ServiceBreakdownTable services={top_services_forecast} />

            <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full flex items-center justify-between p-4 text-[13px] font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                    <span className="flex items-center gap-2">
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
