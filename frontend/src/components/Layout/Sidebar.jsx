import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  DollarSign,
  TrendingUp,
  FileText,
  ChevronDown,
  Filter,
  Cloud,
  PieChart,
  Plug,
  Layers,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';

const Sidebar = ({ globalFilters = {}, onGlobalFilterChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [filterOptions, setFilterOptions] = useState({
    providers: [],
    accounts: [],
    regions: [],
    services: []
  });

  const [user, setUser] = useState({ name: 'Guest', email: '' });

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const res = await api.get('/costs/filters');
        if (res.data.success) {
          setFilterOptions({
            providers: res.data.providers || [],
            accounts: res.data.accounts || [],
            regions: res.data.regions || [],
            services: res.data.services || []
          });
        }
      } catch (err) {
        console.error('Failed to fetch filter options:', err);
      }
    };
    fetchFilterOptions();

    // Load user from localStorage
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        try {
            setUser(JSON.parse(storedUser));
        } catch (e) {
            console.error("Failed to parse user data", e);
        }
    }
  }, []);

  const getInitials = (name) => {
      return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
  };


  const handleEnvironmentChange = (e) => {
    const value = e.target.value;
    if (onGlobalFilterChange) {
      let newFilters = { ...globalFilters };
      // Reset mutually exclusive filters
      delete newFilters.environment;
      delete newFilters.period;
      delete newFilters.costThreshold;

      if (value === 'all') {
        // No filters applied
      } else if (value === 'this_month') {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        newFilters.date_from = firstDay.toISOString().split('T')[0];
        newFilters.date_to = lastDay.toISOString().split('T')[0];
        newFilters.period = 'month';
      } else if (value === 'high_cost') {
        newFilters.costThreshold = 'high';
      } else if (['production', 'staging', 'development'].includes(value)) {
        newFilters.environment = value;
      }
      onGlobalFilterChange(newFilters);
    }
  };

  const NavItem = ({ icon: Icon, label, path, active = false }) => (
    <button
      onClick={() => path && navigate(path)}
      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg ${
        active 
          ? 'bg-primary-blue text-white' 
          : 'text-sidebar-text-muted hover:bg-white/5 hover:text-white'
      }`}
    >
      {Icon && (
        <Icon 
          size={18} 
        />
      )}
      <span>{label}</span>
      {active && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
      )}
    </button>
  );

  return (
    <div className="w-72 bg-sidebar-bg h-screen flex flex-col flex-shrink-0 border-r border-white/5 relative overflow-hidden">

      {/* Header */}
      <div className="h-20 px-6 flex items-center gap-3 border-b border-white/5">
        <div className="bg-primary-blue/20 p-2 rounded-lg">
            <Cloud className="w-6 h-6 text-primary-blue" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white leading-none">
            Cloud Insight
          </h1>
          <span className="text-[10px] font-medium text-sidebar-text-muted uppercase tracking-wider">
            Analytics
          </span>
        </div>
      </div>

      {/* Filter Section */}
      <div className="p-6 pb-2">
        <label className="flex items-center gap-2 text-xs font-semibold text-sidebar-text-muted uppercase tracking-wider mb-3">
            <Filter size={12} />
            <span>Quick Filter</span>
        </label>
        
        <div className="relative">
            <select 
                onChange={handleEnvironmentChange}
                className="w-full appearance-none bg-white/5 border border-white/10 hover:border-white/20 text-white text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-blue/50 transition-colors"
                defaultValue="all"
            >
                <option value="all" className="bg-slate-800">All Environments</option>
                <option value="production" className="bg-slate-800">Production Only</option>
                <option value="staging" className="bg-slate-800">Staging Only</option>
                <option value="this_month" className="bg-slate-800">This Month</option>
                <option value="high_cost" className="bg-slate-800">High Cost Items</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-sidebar-text-muted pointer-events-none" size={16} />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        
        {/* Main Section */}
        <div className="space-y-1">
          <div className="px-4 text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2">
            Overview
          </div>
          <NavItem
            icon={LayoutDashboard}
            label="Dashboard"
            path="/dashboard"
            active={location.pathname === '/dashboard'}
          />
        </div>

        {/* Analytics Section */}
        <div className="space-y-1">
          <div className="px-4 text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2">
            Analytics
          </div>
          <NavItem
            icon={Layers}
            label="Service Analysis"
            path="/service-analysis"
            active={location.pathname === '/service-analysis'}
          />
          <NavItem
            icon={TrendingUp}
            label="Forecasting"
            path="/forecasts"
            active={location.pathname === '/forecasts'}
          />
          <NavItem
            icon={AlertTriangle}
            label="Anomalies"
            path="/anomalies"
            active={location.pathname === '/anomalies'}
          />
        </div>

        {/* Planning Section */}
        <div className="space-y-1">
          <div className="px-4 text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2">
            Planning
          </div>
          <NavItem
            icon={DollarSign}
            label="Budgets"
            path="/budgets"
            active={location.pathname === '/budgets'}
          />
        </div>

        {/* Analysis Section */}
        <div className="space-y-1">
          <div className="px-4 text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2">
            Analysis
          </div>
          <NavItem
            icon={FileText}
            label="Reports"
            path="/reports"
            active={location.pathname === '/reports'}
          />
        </div>

        {/* Integration Section */}
        <div className="space-y-1">
          <div className="px-4 text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2">
            Data Sources
          </div>
          <NavItem
            icon={Plug}
            label="Integrations"
            path="/integrations"
            active={location.pathname === '/integrations'}
          />
        </div>
      </div>

      {/* Footer / User Profile Snippet */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                 {getInitials(user.name || 'Guest')}
             </div>
             <div className="flex-1 overflow-hidden">
                 <p className="text-sm font-medium text-white truncate">{user.name || 'Guest User'}</p>
                 <p className="text-xs text-sidebar-text-muted truncate">{user.email}</p>
             </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
