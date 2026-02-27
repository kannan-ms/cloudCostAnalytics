import React from 'react';
import { FileText, Download, FileSpreadsheet, FilePieChart, Clock } from 'lucide-react';

const Reports = () => {
    const reports = [
        { name: "Monthly Cost Summary - Dec 2025", date: "Jan 01, 2026", size: "1.2 MB", type: "pdf" },
        { name: "Executive Overview - Q4 2025", date: "Jan 10, 2026", size: "4.5 MB", type: "ppt" },
        { name: "Resource Utilization Report", date: "Jan 15, 2026", size: "2.8 MB", type: "csv" },
        { name: "Anomaly Detection Log", date: "Jan 20, 2026", size: "850 KB", type: "log" },
    ];

    const getIcon = (type) => {
        switch(type) {
            case 'csv': return FileSpreadsheet;
            case 'ppt': return FilePieChart;
            default: return FileText;
        }
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                 <div>
                    <h2 className="text-2xl font-bold text-slate-900">Generated Reports</h2>
                    <p className="text-slate-500 mt-1">Access and download your historical cost analysis.</p>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="grid grid-cols-[auto_1fr_auto] gap-4 p-4 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <div className="pl-2">Format</div>
                    <div>Report Name & Meta</div>
                    <div className="pr-4">Action</div>
                </div>

                {reports.map((report, idx) => {
                    const Icon = getIcon(report.type);
                    return (
                        <div key={idx} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80 transition-colors group">
                            
                            {/* Icon */}
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                <Icon size={20} />
                            </div>

                            {/* Content */}
                            <div>
                                <h4 className="font-semibold text-slate-800 text-sm">{report.name}</h4>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                                        <Clock size={12} />
                                        {report.date}
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-xs text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                                        {report.size}
                                    </span>
                                </div>
                            </div>

                            {/* Action */}
                            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all shadow-sm">
                                <Download size={14} /> 
                                <span className="hidden sm:inline">Download</span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Reports;
