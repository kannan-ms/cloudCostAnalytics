import React from 'react';
import { Cloud, Upload, Zap, Shield, BarChart3 } from 'lucide-react';

const EmptyState = ({ onUploadClick }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-slate-50/50">
            <div className="max-w-xl w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-12 relative overflow-hidden">
                {/* Decorative Background Blob */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"></div>
                
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm ring-1 ring-blue-100">
                    <Cloud size={40} />
                </div>
                
                <h2 className="text-slate-900 mb-3 text-2xl font-bold tracking-tight">Welcome to Cloud Insight</h2>
                <p className="text-slate-500 mb-8 leading-relaxed max-w-sm mx-auto">
                    Upload your cloud cost data (CSV) to unlock instant analytics, anomaly detection, and forecasting.
                </p>

                <div className="flex justify-center mb-8">
                    <button
                        onClick={onUploadClick}
                        className="bg-blue-600 text-white border border-transparent px-8 py-3 rounded-xl text-base font-semibold inline-flex items-center gap-2.5 transition-all shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <Upload size={20} />
                        Upload Cost Data
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-4 text-left border-t border-slate-100 pt-8">
                     <div className="text-center group">
                        <div className="mx-auto w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-2 group-hover:bg-indigo-100 transition-colors">
                            <Zap size={18} />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">Instant Analysis</p>
                     </div>
                     <div className="text-center group">
                        <div className="mx-auto w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mb-2 group-hover:bg-amber-100 transition-colors">
                            <Shield size={18} />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">Anomaly Detection</p>
                     </div>
                     <div className="text-center group">
                        <div className="mx-auto w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-2 group-hover:bg-emerald-100 transition-colors">
                            <BarChart3 size={18} />
                        </div>
                        <p className="text-xs font-semibold text-slate-700">Cost Breakdown</p>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default EmptyState;
