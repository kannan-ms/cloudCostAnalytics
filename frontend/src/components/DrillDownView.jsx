import React, { useState, useEffect } from 'react';
import { ArrowLeft, PieChart as PieIcon, BarChart, AlertTriangle, Layers, DollarSign, Loader2 } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import api from '../services/api';

ChartJS.register(ArcElement, Tooltip, Legend);

const DrillDownView = ({ month, onBack }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // 'month' prop is likely a date string or timestamp. Ensure robust parsing.
                const startDateObj = new Date(month);

                // Calculate filter range for the whole month
                const start = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), 1);
                // Last day: day 0 of next month
                const end = new Date(startDateObj.getFullYear(), startDateObj.getMonth() + 1, 0);

                // Format to ISO 8601 (YYYY-MM-DD) for API
                // Adjust for timezone offset if needed, or use UTC methods if backend expects UTC. 
                // For simplified logic assuming local date is what user meant:
                const startStr = start.toISOString().split('T')[0];
                const endStr = end.toISOString().split('T')[0];

                // Fetch service breakdown for this month
                const res = await api.getCostSummary({
                    start_date: startStr,
                    end_date: endStr,
                    group_by: 'service'
                });

                if (res.data && res.data.groups) {
                    const services = res.data.groups.map(g => ({
                        name: g.name,
                        cost: g.total_cost,
                        color: getColorForService(g.name)
                    }));
                    // Sort by cost descending
                    services.sort((a, b) => b.cost - a.cost);

                    setData({
                        total: res.data.grand_total,
                        services: services
                    });
                }
            } catch (e) {
                console.error("Drilldown error", e);
                setError("Failed to load detailed analysis. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [month]);

    // Helper for consistent colors (Tailwind-ish palette)
    const getColorForService = (name) => {
        const colors = [
            '#3b82f6', // blue-500
            '#10b981', // emerald-500
            '#f59e0b', // amber-500
            '#ef4444', // red-500
            '#8b5cf6', // violet-500
            '#ec4899', // pink-500
            '#6366f1', // indigo-500
            '#06b6d4', // cyan-500
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    if (loading) return (
         <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 py-20">
            <Loader2 size={32} className="animate-spin text-blue-500" />
            <p className="text-sm text-slate-500">Loading monthly details...</p>
        </div>
    );
    
    if (error) return (
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20">
            <div className="bg-red-50 p-3 rounded-full text-red-600">
                <AlertTriangle size={32} />
            </div>
            <p className="text-slate-700 font-semibold">{error}</p>
            <button 
                onClick={onBack} 
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            >
                Return to Dashboard
            </button>
        </div>
    );
    
    if (!data) return null;

    const pieData = {
        labels: data.services.map(s => s.name),
        datasets: [
            {
                data: data.services.map(s => s.cost),
                backgroundColor: data.services.map(s => s.color),
                borderWidth: 2,
                borderColor: '#ffffff',
            },
        ],
    };

    const dateTitle = new Date(month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="p-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={onBack} 
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" /> 
                    Back
                </button>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Period Analysis: {dateTitle}</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total Spend</span>
                        <DollarSign size={16} className="text-slate-400" />
                    </div>
                    <span className="text-3xl font-bold text-slate-900">${data.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                         <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">Top Service</span>
                         <Layers size={16} className="text-slate-400" />
                    </div>
                    <span className="text-xl font-bold text-blue-600 truncate block" title={data.services.length > 0 ? data.services[0].name : 'N/A'}>
                        {data.services.length > 0 ? data.services[0].name : 'N/A'}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                        {data.services.length > 0 ? `${((data.services[0].cost / data.total) * 100).toFixed(1)}% of total` : ''}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart Section */}
                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 self-start w-full border-b border-slate-100 pb-2">Cost Distribution</h3>
                    <div className="h-[300px] w-full max-w-sm">
                        <Pie 
                            data={pieData} 
                            options={{ 
                                responsive: true, 
                                maintainAspectRatio: false,
                                plugins: { 
                                    legend: { 
                                        position: 'bottom',
                                        labels: {
                                            usePointStyle: true,
                                            padding: 20,
                                            font: { size: 12 }
                                        } 
                                    } 
                                } 
                            }} 
                        />
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800">Service Breakdown</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Service</th>
                                    <th className="px-6 py-4 text-right">Cost</th>
                                    <th className="px-6 py-4 text-right">% Allocation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.services.map((s, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-800 flex items-center gap-3">
                                            <span className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: s.color }}></span>
                                            {s.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 text-right font-medium">
                                            ${s.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 text-right">
                                            {data.total > 0 ? ((s.cost / data.total) * 100).toFixed(1) : 0}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DrillDownView;
