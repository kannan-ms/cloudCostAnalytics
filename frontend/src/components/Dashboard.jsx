import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CostChart from './CostChart';
import AnomalyList from './AnomalyList';
import FileUpload from './FileUpload';
import api from '../services/api';
import { logout } from '../services/authService';
import '../styles/Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalCost: 0,
    monthlyAvg: 0,
    servicesCount: 0,
    anomaliesCount: 0
  });
  const [costs, setCosts] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Dashboard mounted, loading data...');
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    console.log('loadDashboardData called');
    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      console.log('User data:', userData);
      setUser(userData);

      // Load costs summary
      console.log('Fetching costs summary...');
      const summaryRes = await api.get('/costs/summary?group_by=provider');
      console.log('Summary response:', summaryRes.data);
      const summary = summaryRes.data.summary;
      
      // Load auto trends (automatically detects date range from uploaded data)
      console.log('Fetching auto trends...');
      const trendsRes = await api.get('/costs/trends/auto');
      console.log('Auto trends response:', trendsRes.data);
      setTrends(trendsRes.data.trends || []);

      // Load recent costs
      console.log('Fetching costs...');
      const costsRes = await api.get('/costs?page=1&page_size=10');
      console.log('Costs response:', costsRes.data);
      setCosts(costsRes.data.costs || []);

      // Load anomalies
      console.log('Fetching anomalies...');
      const anomaliesRes = await api.get('/anomalies?status=new&limit=10');
      console.log('Anomalies response:', anomaliesRes.data);
      setAnomalies(anomaliesRes.data.anomalies || []);

      // Calculate stats
      const calculatedStats = {
        totalCost: summary.grand_total || 0,
        monthlyAvg: trendsRes.data.trends?.length > 0 
          ? (trendsRes.data.summary?.total_cost / trendsRes.data.trends.length).toFixed(2)
          : 0,
        servicesCount: summary.groups?.length || 0,
        anomaliesCount: anomaliesRes.data.count || 0
      };
      console.log('Calculated stats:', calculatedStats);
      setStats(calculatedStats);

      console.log('Dashboard loaded successfully');
      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      console.error('Error details:', error.response?.data || error.message);
      console.error('Error status:', error.response?.status);
      console.error('Full error object:', error);
      
      // Even if API calls fail, show the dashboard with empty data
      if (error.response?.status === 401) {
        logout();
        navigate('/login');
      } else {
        // Log which API call failed
        if (error.config?.url) {
          console.error('Failed API call:', error.config.url);
        }
        
        // Set default values and show dashboard anyway
        setStats({
          totalCost: 0,
          monthlyAvg: 0,
          servicesCount: 0,
          anomaliesCount: 0
        });
        setTrends([]);
        setCosts([]);
        setAnomalies([]);
      }
      setLoading(false);
    }
  };

  const runAnomalyDetection = async () => {
    try {
      setLoading(true);
      await api.post('/anomalies/detect');
      await loadDashboardData();
      alert('Anomaly detection complete!');
    } catch (error) {
      console.error('Error running anomaly detection:', error);
      alert('Failed to run anomaly detection');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  // Add a safety check
  if (!user) {
    return (
      <div className="loading-container">
        <p>Unable to load user data. Please try logging in again.</p>
        <button onClick={() => navigate('/login')}>Go to Login</button>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo">☁️</div>
          <h1>Cloud Cost Analytics</h1>
        </div>
        <div className="header-right">
          <span className="user-name">Welcome, {user?.name}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{background: '#0056b3'}}>💰</div>
          <div className="stat-info">
            <h3>Total Costs</h3>
            <p className="stat-value">${stats.totalCost.toLocaleString()}</p>
            <span className="stat-label">All time</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: '#003d7a'}}>📊</div>
          <div className="stat-info">
            <h3>Monthly Average</h3>
            <p className="stat-value">${stats.monthlyAvg.toLocaleString()}</p>
            <span className="stat-label">Last 6 months</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: '#001f3f'}}>🔧</div>
          <div className="stat-info">
            <h3>Services</h3>
            <p className="stat-value">{stats.servicesCount}</p>
            <span className="stat-label">Active services</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{background: '#dc2626'}}>⚠️</div>
          <div className="stat-info">
            <h3>Anomalies</h3>
            <p className="stat-value">{stats.anomaliesCount}</p>
            <span className="stat-label">Needs attention</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          📤 Upload Data
        </button>
        <button 
          className={`tab ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          Cost Trends
        </button>
        <button 
          className={`tab ${activeTab === 'anomalies' ? 'active' : ''}`}
          onClick={() => setActiveTab('anomalies')}
        >
          Anomalies ({stats.anomaliesCount})
        </button>
      </div>

      {/* Content */}
      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="section">
              <div className="section-header">
                <h2>Monthly Cost Trends</h2>
                <button className="detect-btn" onClick={runAnomalyDetection}>
                  Run Anomaly Detection
                </button>
              </div>
              <CostChart trends={trends} />
            </div>

            <div className="section">
              <h2>Recent Anomalies</h2>
              <AnomalyList anomalies={anomalies.slice(0, 5)} />
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="upload-tab">
            <FileUpload 
              onUploadSuccess={loadDashboardData} 
              onSwitchToOverview={() => setActiveTab('overview')}
            />
          </div>
        )}

        {activeTab === 'trends' && (
          <div className="trends-tab">
            <div className="section">
              <h2>Cost Analysis</h2>
              <CostChart trends={trends} />
            </div>
            
            <div className="trends-table">
              <h3>Period Breakdown</h3>
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Total Cost</th>
                    <th>Services</th>
                    <th>Records</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.map((trend, index) => (
                    <tr key={index}>
                      <td>{trend.period || trend.month || trend.date}</td>
                      <td>${trend.total_cost.toLocaleString()}</td>
                      <td>{trend.unique_services}</td>
                      <td>{trend.record_count}</td>
                      <td className={trend.change_percentage > 0 ? 'positive' : trend.change_percentage < 0 ? 'negative' : ''}>
                        {trend.change_percentage !== undefined 
                          ? `${trend.change_percentage > 0 ? '+' : ''}${trend.change_percentage}%`
                          : 'N/A'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'anomalies' && (
          <div className="anomalies-tab">
            <div className="section">
              <div className="section-header">
                <h2>Detected Anomalies</h2>
                <button className="detect-btn" onClick={runAnomalyDetection}>
                  Refresh Detection
                </button>
              </div>
              <AnomalyList anomalies={anomalies} showActions={true} onUpdate={loadDashboardData} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
