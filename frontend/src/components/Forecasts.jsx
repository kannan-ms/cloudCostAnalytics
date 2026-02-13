import React, { useState, useEffect } from 'react';
import { Loader, UserCheck, BarChart3 } from 'lucide-react';
import api from '../services/api';
import AdvancedForecast from './AdvancedForecast';
// New Components
import ExecutiveSummary from './Forecast/ExecutiveSummary';
import ServiceForecastCard from './Forecast/ServiceForecastCard';

// Old charts for "Advanced" view (still importing recharts)
import { LineChart, Line, ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CHART_COLORS, ChartGradients, XAxisProps, YAxisProps, GridProps } from '../utils/chartConfig.jsx';
import SmartTooltip from './Charts/SmartTooltip';

const Forecasts = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [forecastData, setForecastData] = useState(null);
    const [days, setDays] = useState(30);
    const [viewMode, setViewMode] = useState('analyst'); // 'analyst' | 'executive'

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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader className="animate-spin text-blue-600 mb-4" size={32} />
                <span className="text-slate-500 font-medium">Generating Forecast Analytics...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                    {error}
                </div>
            </div>
        );
    }

    if (!forecastData || !forecastData.global_forecast) return null;

    const { global_forecast, top_services_forecast, executive_summary } = forecastData;

    // --- Sub-Components for Clean Layout ---

    const TechnicalChartsSection = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Main Global Chart */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-in fade-in zoom-in-95 duration-500">
                <div className="mb-6">
                    <h4 className="text-lg font-bold text-gray-900">Total Cost Trajectory</h4>
                    <p className="text-sm text-gray-500">Predicted spend with 95% confidence intervals.</p>
                </div>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={global_forecast.forecast.map(p => ({ ...p, range: [p.lower_bound, p.upper_bound] }))}>
                            <CartesianGrid {...GridProps} />
                            <ChartGradients />
                            <XAxis
                                dataKey="date"
                                {...XAxisProps}
                                tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            />
                            <YAxis {...YAxisProps} />
                            <Tooltip content={<SmartTooltip />} />

                            {/* Confidence Interval Area */}
                            <Area
                                type="monotone"
                                dataKey="range"
                                stroke="none"
                                fill={`url(#colorForecast)`}
                                fillOpacity={0.4}
                            />

                            <Line
                                type="monotone"
                                dataKey="predicted_cost"
                                stroke={CHART_COLORS.primary}
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Service Level Charts Grid */}
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Service-Level Trends</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {top_services_forecast.map((svc, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold text-sm truncate text-gray-700" title={svc.service_name}>{svc.service_name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${svc.trend === 'increasing' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                    {svc.trend}
                                </span>
                            </div>
                            <div className="h-24">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={svc.forecast_points}>
                                        <Line
                                            type="monotone"
                                            dataKey="predicted_cost"
                                            stroke={svc.trend === 'increasing' ? CHART_COLORS.tertiary : CHART_COLORS.secondary}
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 4 }}
                                        />
                                        <Tooltip content={<SmartTooltip />} cursor={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Advanced Module */}
            <AdvancedForecast />
        </div>
    );

    const ExecutiveSummarySection = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* 1. Executive Summary Cards */}
            <ExecutiveSummary summary={executive_summary} />

            {/* 2. Service Level Action Items */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Actions & Insights</h3>
                <div className="space-y-0">
                    {top_services_forecast.map((service, idx) => (
                        <ServiceForecastCard key={idx} service={service} />
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">

            {/* Header: Title + Filters + View Toggle */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-gray-900">Cost Forecast</h1>

                    {/* View Mode Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('analyst')}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'analyst' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <BarChart3 size={16} />
                            Analyst
                        </button>
                        <button
                            onClick={() => setViewMode('executive')}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'executive' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <UserCheck size={16} />
                            Executive
                        </button>
                    </div>
                </div>

                {/* Days Filter */}
                <div className="flex bg-gray-100 rounded-lg p-1">
                    {[30, 60, 90].map(d => (
                        <button
                            key={d}
                            onClick={() => setDays(d)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${days === d ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {d} Days
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTENT AREA */}
            {viewMode === 'analyst' ? (
                // ANALYST VIEW: Charts First, Summary Last
                <>
                    <TechnicalChartsSection />
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Executive Overview</h3>
                        <ExecutiveSummarySection />
                    </div>
                </>
            ) : (
                // EXECUTIVE VIEW: Summary First, Charts Hidden/Bottom
                <>
                    <ExecutiveSummarySection />

                    <div className="mt-8">
                        <details className="group">
                            <summary className="flex items-center gap-2 text-sm font-medium text-blue-600 cursor-pointer list-none">
                                <span className="group-open:rotate-180 transition-transform">▼</span>
                                Show Technical Analysis & Charts
                            </summary>
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <TechnicalChartsSection />
                            </div>
                        </details>
                    </div>
                </>
            )}
        </div>
    );
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-800 text-white text-xs p-2 rounded shadow-lg">
                <p className="font-bold">${Number(payload[0].value).toFixed(0)}</p>
            </div>
        );
    }
    return null;
};

export default Forecasts;
