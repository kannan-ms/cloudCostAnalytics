import React from 'react';
import { Cloud, Upload, Zap, Shield, BarChart3 } from 'lucide-react';

const EmptyState = ({ onUploadClick }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-slate-50/50">
            <div className="max-w-xl w-full bg-white rounded-xl border border-slate-200 shadow-md p-12 relative overflow-hidden">
                
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <Cloud size={40} />
                </div>
                
                <h2 className="text-slate-900 mb-3 text-2xl font-bold">Welcome to Cloud Insight</h2>
                <p className="text-slate-500 mb-8 leading-relaxed max-w-sm mx-auto">
                    Upload your cloud cost data (CSV) to unlock instant analytics, anomaly detection, and forecasting.
                </p>

                <div className="flex justify-center mb-8">
                    <button
                        onClick={onUploadClick}
                        className="bg-blue-600 text-white border border-transparent px-8 py-3 rounded-lg text-base font-semibold inline-flex items-center gap-2.5 transition-colors shadow-sm hover:bg-blue-700"
                    >
                        <Upload size={20} />
                        Upload Cost Data
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-4 text-left border-t border-slate-100 pt-8">
                     <div className="text-center">
                        <div className="mx-auto w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-2">
                            <Zap size={18} />
                        </div>
                        <p className="text-xs font-medium text-slate-700">Instant Analysis</p>
                     </div>
                     <div className="text-center">
                        <div className="mx-auto w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mb-2">
                            <Shield size={18} />
                        </div>
                        <p className="text-xs font-medium text-slate-700">Anomaly Detection</p>
                     </div>
                     <div className="text-center">
                        <div className="mx-auto w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-2">
                            <BarChart3 size={18} />
                        </div>
                        <p className="text-xs font-medium text-slate-700">Cost Breakdown</p>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default EmptyState;
