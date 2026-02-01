import React from 'react';
import { FileText, Download } from 'lucide-react';

const Reports = () => {
    const reports = [
        { name: "Monthly Cost Summary - Dec 2025", date: "2026-01-01", size: "1.2 MB" },
        { name: "Executive Overview - Q4 2025", date: "2026-01-10", size: "4.5 MB" },
        { name: "Resource Utilization Report", date: "2026-01-15", size: "2.8 MB" },
        { name: "Anomaly Detection Log", date: "2026-01-20", size: "850 KB" },
    ];

    return (
        <div className="reports-container">
            <h2 className="page-title">Generated Reports</h2>

            <div className="reports-list">
                {reports.map((report, idx) => (
                    <div key={idx} className="report-item">
                        <div className="report-icon">
                            <FileText size={24} color="var(--primary-blue)" />
                        </div>
                        <div className="report-info">
                            <div className="report-name">{report.name}</div>
                            <div className="report-meta">{report.date} • {report.size}</div>
                        </div>
                        <button className="download-btn">
                            <Download size={16} /> Download
                        </button>
                    </div>
                ))}
            </div>

            <style>{`
                .reports-container { padding: 24px; max-width: 1000px; }
                .page-title { font-size: 24px; color: var(--text-dark); margin-bottom: 24px; }
                
                .reports-list {
                    background: white;
                    border: 1px solid var(--border-light);
                    border-radius: 8px;
                    overflow: hidden;
                }
                
                .report-item {
                    display: flex;
                    align-items: center;
                    padding: 16px 24px;
                    border-bottom: 1px solid var(--border-light);
                    gap: 16px;
                    transition: background 0.2s;
                }
                .report-item:last-child { border-bottom: none; }
                .report-item:hover { background: #f8f9fa; }
                
                .report-icon {
                    padding: 10px;
                    background: #e3f2fd;
                    border-radius: 8px;
                }
                
                .report-info { flex: 1; }
                .report-name { font-weight: 600; color: var(--text-dark); margin-bottom: 4px; }
                .report-meta { font-size: 12px; color: var(--text-light); }
                
                .download-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    border: 1px solid var(--border-light);
                    background: white;
                    border-radius: 4px;
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-medium);
                    cursor: pointer;
                }
                .download-btn:hover {
                    background: var(--bg-light);
                    color: var(--primary-blue);
                }
            `}</style>
        </div>
    );
};

export default Reports;
