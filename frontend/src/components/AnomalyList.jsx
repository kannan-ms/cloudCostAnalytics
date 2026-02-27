import React from 'react';
import { AlertTriangle, TrendingUp, CheckCircle, AlertOctagon, Info } from 'lucide-react';

const AnomalyList = ({ anomalies }) => {
  if (!anomalies || anomalies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4 py-12">
        <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center">
            <CheckCircle size={28} className="text-green-500" />
        </div>
        <div className="text-center">
            <h3 className="font-semibold text-slate-700">No Anomalies Found</h3>
            <p className="text-sm text-slate-500 mt-1">No cost anomalies detected in the selected period.</p>
        </div>
      </div>
    );
  }

  const getSeverityConfig = (severity) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return { 
            bg: 'bg-red-50', 
            border: 'border-red-200', 
            text: 'text-red-700', 
            icon: AlertOctagon,
            badge: 'bg-red-100 text-red-700'
        };
      case 'medium':
        return { 
            bg: 'bg-orange-50', 
            border: 'border-orange-200', 
            text: 'text-orange-700', 
            icon: AlertTriangle,
            badge: 'bg-orange-100 text-orange-700'
        };
      case 'low':
      default:
        return { 
            bg: 'bg-blue-50', 
            border: 'border-blue-200', 
            text: 'text-blue-700', 
            icon: Info,
            badge: 'bg-blue-100 text-blue-700'
        };
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-full pr-2">
      {anomalies.map((item, index) => {
        const cost = item.detected_value || item.cost || 0;
        const average = item.expected_value || item.average || 0;
        const date = item.detected_at || item.date || new Date().toISOString();
        const service = item.service_name || item.service || 'Unknown Service';
        const severity = item.severity || 'low';
        
        const style = getSeverityConfig(severity);
        const Icon = style.icon;

        return (
          <div key={index} className={`rounded-lg border ${style.border} bg-white p-5 shadow-sm hover:shadow transition-shadow`}>
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${style.bg} ${style.text}`}>
                    <Icon size={16} />
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${style.badge}`}>
                    {severity}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium">{new Date(date).toLocaleDateString()}</span>
            </div>

            {/* Main Info */}
            <div className="mb-4">
                <h4 className="font-bold text-slate-800 text-base">{service}</h4>
                <div className="flex items-center gap-1.5 text-red-600 mt-1">
                    <TrendingUp size={14} />
                    <span className="text-sm font-semibold">+${(cost - average).toFixed(2)} Excess</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100">
                <div>
                   <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Detected</p>
                   <p className="font-bold text-slate-900">${cost.toFixed(2)}</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Expected</p>
                   <p className="font-medium text-slate-500">${average.toFixed(2)}</p>
                </div>
            </div>
          </div>
        )
      })}
    </div>
  );
};

export default AnomalyList;
