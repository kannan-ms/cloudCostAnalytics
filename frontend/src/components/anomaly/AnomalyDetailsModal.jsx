import React from 'react';
import { X, TrendingUp, Info } from 'lucide-react';

const AnomalyDetailsModal = ({ anomaly, onClose }) => {
  if (!anomaly) return null;
  const cost = anomaly.detected_value || anomaly.cost || 0;
  const average = anomaly.expected_value || anomaly.average || 0;
  const date = anomaly.detected_at || anomaly.date || new Date().toISOString();
  const service = anomaly.service_name || anomaly.service || 'Unknown Service';
  const severity = anomaly.severity || 'low';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 relative border border-slate-200">
        <button
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <div className="flex items-center gap-2 mb-4">
          <Info className="text-blue-500" size={20} />
          <h2 className="text-lg font-bold text-slate-800">Anomaly Details</h2>
        </div>
        <div className="mb-2">
          <span className="text-xs font-bold uppercase text-slate-400">Service</span>
          <div className="font-semibold text-slate-700">{service}</div>
        </div>
        <div className="mb-2">
          <span className="text-xs font-bold uppercase text-slate-400">Date</span>
          <div className="text-slate-600">{new Date(date).toLocaleString()}</div>
        </div>
        <div className="mb-2">
          <span className="text-xs font-bold uppercase text-slate-400">Severity</span>
          <div className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold uppercase">{severity}</div>
        </div>
        <div className="mb-2">
          <span className="text-xs font-bold uppercase text-slate-400">Detected Cost</span>
          <div className="font-bold text-slate-900">${cost.toFixed(2)}</div>
        </div>
        <div className="mb-2">
          <span className="text-xs font-bold uppercase text-slate-400">Expected Cost</span>
          <div className="font-medium text-slate-500">${average.toFixed(2)}</div>
        </div>
        <div className="mb-2">
          <span className="text-xs font-bold uppercase text-slate-400">Excess</span>
          <div className="flex items-center gap-1 text-red-600 font-semibold">
            <TrendingUp size={16} />
            +${(cost - average).toFixed(2)} Excess
          </div>
        </div>
        {anomaly.description && (
          <div className="mb-2">
            <span className="text-xs font-bold uppercase text-slate-400">Description</span>
            <div className="text-slate-600">{anomaly.description}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnomalyDetailsModal;
