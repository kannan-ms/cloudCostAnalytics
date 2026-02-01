import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  Activity,
  ChevronDown
} from 'lucide-react';
import CostChart from './CostChart';
import FilterBar from './FilterBar';
import AnomalyList from './AnomalyList';
import EmptyState from './EmptyState';
import FileUpload from './FileUpload';
import api from '../services/api';

const Dashboard = ({ showUpload, setShowUpload }) => {
  const [costs, setCosts] = useState({ trends: [], summary: {} });
  const [anomalies, setAnomalies] = useState({ anomalies: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('cost_timeline');
  const [hasData, setHasData] = useState(false);
  const [chartType, setChartType] = useState('bar');
  const [breakdownBy, setBreakdownBy] = useState('service');
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [filters, setFilters] = useState({});

  const chartTypes = ['bar', 'line', 'area', 'doughnut', 'pie'];
  const breakdownOptions = ['service', 'region', 'account', 'provider'];

  const toggleChartType = () => {
    const nextIndex = (chartTypes.indexOf(chartType) + 1) % chartTypes.length;
    setChartType(chartTypes[nextIndex]);
  };

  const handleBreakdownSelect = (option) => {
    setBreakdownBy(option);
    setIsBreakdownOpen(false);
  };

  // New refresh logic using Auto Trends
  const refreshData = async () => {
    setLoading(true);
    // Clear previous state specifically to avoid stale data visual
    setCosts({ trends: [], summary: {} });
    setAnomalies({ anomalies: [] });
    
    try {
      // 1. Get Auto Trends (detects date range automatically)
      const timestamp = new Date().getTime();
      const queryParams = new URLSearchParams({
          _t: timestamp,
          breakdown: breakdownBy,
          ...filters
      });
      const trendRes = await api.get(`/costs/trends/auto?${queryParams}`);

      // 2. Get Anomalies
      const anomalyRes = await api.get(`/anomalies?_t=${timestamp}`);

      // Check if we have data
      if (trendRes.data && trendRes.data.summary && trendRes.data.summary.total_cost > 0) {

        // Transform AutoTrends data to match what CostChart expects if needed
        // CostChart typically expects { trends: [{_id/date, total_cost}] }
        // AutoTrends returns { trends: [{period, total_cost}] }
        // Let's map 'period' to 'date' for consistency if necessary, 
        // or ensure CostChart handles both.

        const trends = trendRes.data.trends.map(t => ({
          ...t,
          date: t.period, // Map period to date for chart labels
          // If 'date' was expected by chart logic
        }));

        setCosts({
          trends: trends,
          summary: trendRes.data.summary
        });

        setAnomalies(anomalyRes.data);
        setHasData(true);
      } else {
        setHasData(false);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Fallback for empty state or error
      setHasData(false);
    } finally {
      setLoading(false);
      setShowUpload(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [breakdownBy, filters]);

  // ... (rest of render logic)
  if (showUpload) {
    return (
      <div className="upload-modal-overlay">
        <div className="upload-modal">
          <button className="close-modal" onClick={() => setShowUpload(false)}>×</button>
          <FileUpload onUploadSuccess={refreshData} onSwitchToOverview={refreshData} />
        </div>
        <style>{`
          .upload-modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(11, 17, 54, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }
          .upload-modal {
            background: white;
            padding: 20px;
            border-radius: 8px;
            width: 100%;
            max-width: 600px;
            position: relative;
          }
          .close-modal {
            position: absolute;
            top: 10px;
            right: 15px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--text-light);
          }
        `}</style>
      </div>
    );
  }

  if (loading) {
    return <div className="loading-state">Loading actual insights...</div>;
  }

  if (!hasData) {
    return <EmptyState onUploadClick={() => setShowUpload(true)} />;
  }

  const TabButton = ({ id, icon: Icon, label }) => (
    <button
      className={`tab-btn ${activeTab === id ? 'active' : ''}`}
      onClick={() => setActiveTab(id)}
    >
      <Icon size={16} />
      {label}
    </button>
  );

  return (
    <div className="dashboard-container">
      <div className="dashboard-tabs">
        <TabButton id="cost_timeline" icon={BarChart2} label="Cost Timeline" />
        <TabButton id="anomaly_monitor" icon={Activity} label="Anomaly Monitor" />
      </div>

      <FilterBar filters={filters} onFilterChange={setFilters} />

      <div className="content-toolbar">
        <div className="left-tools">
          <button className="tool-btn active" onClick={toggleChartType} style={{ minWidth: '130px' }}>
            <BarChart2 size={16} /> 
            {chartType === 'bar' && 'Stacked Bar'}
            {chartType === 'line' && 'Line Chart'}
            {chartType === 'area' && 'Area Chart'}
            {chartType === 'doughnut' && 'Doughnut'}
            {chartType === 'pie' && 'Pie Chart'}
          </button>
          <div className="currency-toggle ml-4">
            <button className="currency-btn active">$ USD</button>
          </div>
        </div>
        <div className="right-tools">
          <div className="breakdown-container" style={{ position: 'relative' }}>
            <div 
              className="breakdown-select" 
              onClick={() => setIsBreakdownOpen(!isBreakdownOpen)} 
              style={{ cursor: 'pointer' }}
            >
              <span className="label">Breakdown By:</span>
              <div className="select-box">
                {breakdownBy === 'account' ? 'Cloud Account' : breakdownBy.charAt(0).toUpperCase() + breakdownBy.slice(1)}
                <ChevronDown size={14} />
              </div>
            </div>
            
            {isBreakdownOpen && (
              <div className="breakdown-menu">
                {breakdownOptions.map(option => (
                  <div 
                    key={option} 
                    className={`breakdown-item ${breakdownBy === option ? 'selected' : ''}`}
                    onClick={() => handleBreakdownSelect(option)}
                  >
                    {option === 'account' ? 'Cloud Account' : option.charAt(0).toUpperCase() + option.slice(1)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-label">Total Spend</div>
          <div className="card-value">${costs.summary?.total_cost?.toFixed(2) || '0.00'}</div>
        </div>
        <div className="summary-card">
          <div className="card-label">Range</div>
          <div className="card-value" style={{ fontSize: '14px' }}>
            {costs.summary?.date_range?.start} to {costs.summary?.date_range?.end}
          </div>
        </div>
        <div className="summary-card">
          <div className="card-label">Data Points</div>
          <div className="card-value">{costs.summary?.periods_count || 0}</div>
        </div>
      </div>

      <div className="chart-card">
        {activeTab === 'cost_timeline' && (
          <div className="chart-wrapper">
            <CostChart costs={costs} chartType={chartType} />
          </div>
        )}
        {activeTab === 'anomaly_monitor' && <AnomalyList anomalies={anomalies?.anomalies || []} />}
      </div>

      <style>{`
        .dashboard-container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .dashboard-tabs {
          display: flex;
          gap: 4px;
          margin-bottom: 20px;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 4px;
          color: var(--text-medium);
          font-weight: 600;
          font-size: 13px;
        }

        .tab-btn.active {
          color: var(--primary-blue);
          border-color: var(--border-light);
          background: white;
          box-shadow: 0 2px 0 0 var(--primary-blue);
        }

        .content-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .left-tools, .right-tools {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tool-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 4px;
          font-weight: 600;
          font-size: 12px;
          color: var(--text-dark);
        }

        .tool-btn.active {
          background: var(--text-dark);
          color: white;
          border-color: var(--text-dark);
        }

        .currency-toggle {
          display: flex;
          border: 1px solid var(--border-light);
          border-radius: 4px;
          overflow: hidden;
        }

        .currency-btn {
          padding: 6px 12px;
          background: white;
          border: none;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-medium);
        }

        .currency-btn.active {
          background: var(--text-dark);
          color: white;
        }

        .ml-4 { margin-left: 16px; }

        .breakdown-select {
          display: flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1px solid var(--border-light);
          padding: 4px 12px;
          border-radius: 4px;
        }

        .breakdown-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          z-index: 100;
          min-width: 180px;
          overflow: hidden;
        }

        .breakdown-item {
          padding: 8px 16px;
          font-size: 13px;
          color: var(--text-dark);
          cursor: pointer;
          transition: background 0.1s;
        }

        .breakdown-item:hover {
          background-color: #f8fafc;
        }

        .breakdown-item.selected {
          background-color: #f0f4ff;
          color: var(--primary-blue);
          font-weight: 600;
        }

        .summary-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 20px;
        }

        .summary-card {
           background: white;
           padding: 16px;
           border: 1px solid var(--border-light);
           border-radius: 4px;
           box-shadow: var(--shadow-sm);
        }

        .card-label {
          font-size: 11px;
          text-transform: uppercase;
          color: var(--text-light);
          font-weight: 700;
          margin-bottom: 8px;
        }

        .card-value {
          font-size: 24px;
          font-weight: 600;
          color: var(--text-dark);
        }

        .chart-card {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 4px;
          padding: 20px;
          height: 400px;
          margin-bottom: 24px;
          box-shadow: var(--shadow-sm);
        }

        .chart-wrapper {
          height: 100%;
          width: 100%;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          color: var(--primary-blue);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
