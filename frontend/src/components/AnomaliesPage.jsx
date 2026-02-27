import React, { useState, useEffect } from 'react';
import { Loader2, Database } from 'lucide-react';
import AnomalyList from './AnomalyList';
import api from '../services/api';

const AnomaliesPage = ({ globalFilters = {} }) => {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnomalies = async () => {
    setLoading(true);
    try {
      // First, trigger anomaly detection to find new anomalies
      await api.post('/anomalies/detect').catch(() => {});

      // Then fetch all anomalies
      const timestamp = Date.now();
      const res = await api.get(`/anomalies?_t=${timestamp}`);
      setAnomalies(res.data?.anomalies || []);
    } catch (err) {
      console.error('Error fetching anomalies:', err);
      setAnomalies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, [globalFilters]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-400 gap-3">
        <Loader2 size={28} className="animate-spin text-blue-400" />
        <p className="text-sm text-slate-400">Scanning for anomalies…</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Anomalies</h1>
        <p className="text-[12px] text-slate-400 mt-1">Cost anomalies detected across your cloud services.</p>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-slate-200/60 p-6 lg:p-7">
        <AnomalyList anomalies={anomalies} />
      </div>
    </div>
  );
};

export default AnomaliesPage;
