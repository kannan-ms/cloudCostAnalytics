import React, { useState, useEffect, useMemo } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ComposedChart, Area
} from 'recharts';
import { Filter, Calendar, Layers, Activity, Download } from 'lucide-react';
import api from '../services/api';
import { CHART_COLORS, ChartGradients, XAxisProps, YAxisProps, GridProps } from '../utils/chartConfig.jsx';
import SmartTooltip from './Charts/SmartTooltip';

const AdvancedForecast = () => {
    // State
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState(null);
    const [days, setDays] = useState(30);
    const [granularity, setGranularity] = useState('daily');

    // Filters
    const [filters, setFilters] = useState({
        service: '',
        environment: '',
        region: ''
    });

    // Fetch Data
    useEffect(() => {
        fetchData();
    }, [days, granularity, filters]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const queryParams = {
                days,
                granularity,
                detailed: true,
                ...filters
            };
            const response = await api.getForecasts(days, true, queryParams);
            setData(response.data);

        } catch (error) {
            console.error("Failed to fetch advanced forecasts", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    // Chart Data Preparation
    const multiLineData = useMemo(() => {
        if (!data || !data.top_services_forecast) return [];

        const dateMap = {};

        data.top_services_forecast.forEach(svc => {
            if (svc.forecast_points) {
                svc.forecast_points.forEach(point => {
                    if (!dateMap[point.date]) dateMap[point.date] = { date: point.date };
                    dateMap[point.date][svc.service_name] = point.predicted_cost;
                });
            }
        });

        return Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [data]);

    if (!data && loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
    );

    if (!data) return null;

    return (
        <div className="space-y-6">
            {/* Controls Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                        <Calendar size={18} className="text-slate-400" />
                        <select
                            value={granularity}
                            onChange={(e) => setGranularity(e.target.value)}
                            className="bg-transparent border-none text-sm font-medium text-slate-700 focus:ring-0 cursor-pointer outline-none"
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>

                    <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-slate-400" />
                        <select
                            name="service"
                            value={filters.service}
                            onChange={handleFilterChange}
                            className="text-sm border-slate-200 rounded-md focus:ring-blue-500 focus:border-blue-500 py-1.5"
                        >
                            <option value="">All Services</option>
                            <option value="AWS Lambda">AWS Lambda</option>
                            <option value="Amazon EC2">Amazon EC2</option>
                            <option value="Amazon S3">Amazon S3</option>
                            <option value="Amazon RDS">Amazon RDS</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                        <Download size={18} />
                    </button>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        {[30, 60, 90].map(d => (
                            <button
                                key={d}
                                onClick={() => setDays(d)}
                                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${days === d ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Insights Panel */}
            {data.insights && data.insights.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl flex flex-col md:flex-row gap-4 items-start">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 shrink-0">
                        <Activity size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-indigo-900 mb-2">AI Cost Insights</h3>
                        <ul className="space-y-2">
                            {data.insights.map((insight, i) => (
                                <li key={i} className="text-sm text-indigo-800 flex items-start gap-2">
                                    <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0"></span>
                                    {insight}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Multi-Line Service Comparison */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Layers size={18} className="text-blue-500" />
                        Service Comparison (Projected)
                    </h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={multiLineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid {...GridProps} />
                                <XAxis dataKey="date" {...XAxisProps}
                                    tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                />
                                <YAxis {...YAxisProps} />
                                <Tooltip content={<SmartTooltip />} />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                {data.top_services_forecast.map((svc, idx) => (
                                    <Line
                                        key={svc.service_name}
                                        type="monotone"
                                        dataKey={svc.service_name}
                                        stroke={[CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.tertiary, CHART_COLORS.quaternary][idx % 4]}
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Stacked Growth Chart */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Activity size={18} className="text-green-500" />
                        Total Forecast Composition
                    </h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={multiLineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <ChartGradients />
                                <CartesianGrid {...GridProps} />
                                <XAxis dataKey="date" {...XAxisProps}
                                    tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                />
                                <YAxis {...YAxisProps} />
                                <Tooltip content={<SmartTooltip />} />

                                {data.top_services_forecast.map((svc, idx) => (
                                    <Area
                                        key={svc.service_name}
                                        type="monotone"
                                        dataKey={svc.service_name}
                                        stackId="1"
                                        stroke={[CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.tertiary, CHART_COLORS.quaternary][idx % 4]}
                                        fill={[CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.tertiary, CHART_COLORS.quaternary][idx % 4]}
                                        fillOpacity={0.6}
                                        strokeWidth={0}
                                    />
                                ))}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdvancedForecast;
