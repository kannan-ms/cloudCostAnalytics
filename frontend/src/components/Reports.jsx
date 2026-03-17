import React, { useState, useEffect } from 'react';
import { FileText, Download, FileSpreadsheet, FilePieChart, Clock, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';

const Reports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [downloading, setDownloading] = useState(null);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const response = await api.get('/reports/list');
            if (response.data.success) {
                // Transform API response to UI format
                const reportsData = response.data.reports.map(report => ({
                    id: report.id,
                    name: report.name,
                    description: report.description,
                    type: report.type,
                    date: new Date().toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: '2-digit' 
                    }),
                    size: 'Variable',
                    requiresParams: report.requires_params,
                    params: report.params || []
                }));
                setReports(reportsData);
            }
        } catch (err) {
            console.error('Error fetching reports:', err);
            setError('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    const downloadReport = async (reportId) => {
        try {
            setDownloading(reportId);
            
            // For monthly reports, use last month as default
            let url = `/reports/download/${reportId}?format=pdf`;
            if (reportId === 'monthly_summary') {
                const now = new Date();
                const lastMonth = now.getMonth() === 0 ? 12 : now.getMonth();
                const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
                url += `&year=${year}&month=${lastMonth}`;
            }
            
            const response = await api.get(url, {
                responseType: 'blob' // Important for file downloads
            });
            
            // Create blob link to download
            const contentType = response.headers['content-type'] || 'application/octet-stream';
            const blob = new Blob([response.data], { type: contentType });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            
            // Extract filename from headers or use default
            const contentDisposition = response.headers['content-disposition'];
            let filename = `report_${reportId}_${Date.now()}.pdf`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="([^"]+)"|filename=([^;\s]+)/);
                if (filenameMatch) {
                    filename = filenameMatch[1] || filenameMatch[2];
                }
            }
            
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            
        } catch (err) {
            console.error('Error downloading report:', err);
            
            // Get error message from response
            let errorMessage = 'Failed to download report.';
            if (err.response?.data) {
                if (err.response.data instanceof Blob) {
                    try {
                        const text = await err.response.data.text();
                        const parsed = JSON.parse(text);
                        if (parsed?.error) {
                            errorMessage = parsed.error;
                        } else if (text) {
                            errorMessage = text;
                        }
                    } catch {
                        // Keep default message if blob cannot be parsed
                    }
                } else if (typeof err.response.data === 'string') {
                    errorMessage = err.response.data;
                } else if (err.response.data.error) {
                    errorMessage = err.response.data.error;
                }
            }
            
            // Show friendly error message
            if (errorMessage.includes('No cost data') || errorMessage.includes('No data found') || errorMessage.includes('not found')) {
                alert('No data available for this report.\n\nPlease upload cost data first by going to:\nIntegrations → Cloud Integration');
            } else {
                alert(errorMessage);
            }
        } finally {
            setDownloading(null);
        }
    };

    const getIcon = (type) => {
        switch(type) {
            case 'csv': return FileSpreadsheet;
            case 'ppt': return FilePieChart;
            default: return FileText;
        }
    };

    if (loading) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 max-w-7xl mx-auto">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-3">
                    <AlertCircle className="text-red-600" size={24} />
                    <p className="text-red-700">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                 <div>
                    <h2 className="text-2xl font-bold text-slate-900">Generated Reports</h2>
                    <p className="text-slate-500 mt-1">Access and download your historical cost analysis.</p>
                </div>
            </div>

            {reports.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
                    <FileText className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-600 font-medium">No reports available</p>
                    <p className="text-slate-400 text-sm mt-2">Upload cost data to generate reports</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="grid grid-cols-[auto_1fr_auto] gap-4 p-4 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <div className="pl-2">Format</div>
                        <div>Report Name & Meta</div>
                        <div className="pr-4">Action</div>
                    </div>

                    {reports.map((report) => {
                        const Icon = getIcon(report.type);
                        const isDownloading = downloading === report.id;
                        
                        return (
                            <div key={report.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80 transition-colors group">
                                
                                {/* Icon */}
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                    <Icon size={20} />
                                </div>

                                {/* Content */}
                                <div>
                                    <h4 className="font-semibold text-slate-800 text-sm">{report.name}</h4>
                                    <p className="text-xs text-slate-500 mt-1">{report.description}</p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                        <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                                            <Clock size={12} />
                                            {report.date}
                                        </span>
                                        <span className="text-slate-300">•</span>
                                        <span className="text-xs text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                                            {report.type}
                                        </span>
                                    </div>
                                </div>

                                {/* Action */}
                                <button 
                                    onClick={() => downloadReport(report.id)}
                                    disabled={isDownloading}
                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDownloading ? (
                                        <>
                                            <Loader2 size={14} className="animate-spin" />
                                            <span className="hidden sm:inline">Downloading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Download size={14} /> 
                                            <span className="hidden sm:inline">Download</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Reports;
