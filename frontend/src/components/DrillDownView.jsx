import React, { useState, useEffect } from 'react';
import { ArrowLeft, PieChart as PieIcon, BarChart, AlertTriangle } from 'lucide-react';
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
                // 'month' prop is now a date string like "2026-01-01"
                const startDateObj = new Date(month);

                // Calculate filter range for the whole month
                // Start: 1st of the month
                const start = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), 1);
                // End: Last day of the month
                const end = new Date(startDateObj.getFullYear(), startDateObj.getMonth() + 1, 0);

                // Format to ISO 8601 (YYYY-MM-DD) for API
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
                        // Generate consistent colors based on name hash or index if possible,
                        // for now using a cyclical palette
                        color: getColorForService(g.name)
                    }));

                    setData({
                        total: res.data.grand_total,
                        services: services
                    });
                }
            } catch (e) {
                console.error("Drilldown error", e);
                setError("Failed to load details. Please try again.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [month]);

    // Helper for consistent colors
    const getColorForService = (name) => {
        const colors = ['#0b1136', '#00c853', '#ff3d00', '#80d8ff', '#ff9100', '#6200ea', '#d50000'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    if (loading) return <div className="p-10 text-center">Loading detailed analysis...</div>;
    if (error) return (
        <div className="error-state">
            <AlertTriangle color="#ff3d00" size={32} />
            <p>{error}</p>
            <button onClick={onBack} className="back-btn">Go Back</button>
        </div>
    );
    if (!data) return null;

    const pieData = {
        labels: data.services.map(s => s.name),
        datasets: [
            {
                data: data.services.map(s => s.cost),
                backgroundColor: data.services.map(s => s.color),
                borderWidth: 1,
            },
        ],
    };

    // Format Title Date
    const dateTitle = new Date(month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <div className="drill-down-container">
            <div className="header-row">
                <button onClick={onBack} className="back-btn">
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>
                <h2>Detailed Analysis: {dateTitle}</h2>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <span className="label">Total Spend</span>
                    <span className="value">${data.total.toLocaleString()}</span>
                </div>
                <div className="stat-card">
                    <span className="label">Top Service</span>
                    <span className="value">{data.services.length > 0 ? data.services[0].name : 'N/A'}</span>
                </div>
            </div>

            <div className="charts-row">
                <div className="chart-card pie-chart">
                    <h3>Cost Distribution</h3>
                    <div className="chart-wrapper">
                        <Pie data={pieData} options={{ responsive: true, plugins: { legend: { position: 'right' } } }} />
                    </div>
                </div>

                <div className="chart-card table-view">
                    <h3>Service Breakdown</h3>
                    <table className="breakdown-table">
                        <thead>
                            <tr>
                                <th>Service</th>
                                <th>Cost</th>
                                <th>% of Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.services.map((s, i) => (
                                <tr key={i}>
                                    <td>
                                        <span className="dot" style={{ backgroundColor: s.color }}></span>
                                        {s.name}
                                    </td>
                                    <td>${s.cost.toLocaleString()}</td>
                                    <td>{data.total > 0 ? ((s.cost / data.total) * 100).toFixed(1) : 0}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
        .drill-down-container { animation: fadeIn 0.3s ease; }
        .header-row { display: flex; align-items: center; gap: 20px; margin-bottom: 24px; }
        .back-btn { 
            display: flex; align-items: center; gap: 8px; 
            background: white; border: 1px solid var(--border-light);
            padding: 8px 16px; border-radius: 6px; cursor: pointer;
            font-weight: 600; color: var(--text-medium);
        }
        .back-btn:hover { background: var(--bg-light); color: var(--primary-blue); }
        h2 { font-size: 20px; color: var(--text-dark); margin: 0; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 24px; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; border: 1px solid var(--border-light); display: flex; flex-direction: column; }
        .stat-card .label { font-size: 12px; color: var(--text-light); text-transform: uppercase; font-weight: 600; }
        .stat-card .value { font-size: 24px; font-weight: 700; color: var(--primary-blue); margin-top: 4px; }
        
        .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .chart-card { background: white; padding: 24px; border-radius: 8px; border: 1px solid var(--border-light); }
        .chart-wrapper { height: 300px; display: flex; justify-content: center; }
        
        .breakdown-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        .breakdown-table th { text-align: left; font-size: 12px; color: var(--text-light); padding: 8px; border-bottom: 2px solid var(--bg-light); }
        .breakdown-table td { font-size: 13px; color: var(--text-dark); padding: 12px 8px; border-bottom: 1px solid var(--bg-light); }
        .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 8px; }

        .error-state { padding: 40px; text-align: center; color: var(--text-medium); display: flex; flex-direction: column; align-items: center; gap: 16px; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
        </div>
    );
};

export default DrillDownView;
