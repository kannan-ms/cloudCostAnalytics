import React from 'react';
import { Cloud, Upload } from 'lucide-react';

const EmptyState = ({ onUploadClick }) => {
    return (
        <div className="empty-state-container">
            <div className="empty-content">
                <div className="icon-circle">
                    <Cloud size={48} />
                </div>
                <h2>Welcome to Cloud Insight</h2>
                <p>Upload a cloud cost file (CSV) to generate analytics and detect anomalies instantly.</p>

                <button className="primary-upload-btn" onClick={onUploadClick}>
                    <Upload size={20} />
                    Upload Cost Data
                </button>

                <div className="features-grid">
                    <div className="feature">
                        <span className="check">✓</span> Instant Cost Visualization
                    </div>
                    <div className="feature">
                        <span className="check">✓</span> Anomaly Detection
                    </div>
                    <div className="feature">
                        <span className="check">✓</span> Service Breakdown
                    </div>
                </div>
            </div>

            <style>{`
        .empty-state-container {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 60vh; /* Centering */
          text-align: center;
        }

        .empty-content {
          max-width: 480px;
          padding: 40px;
          background: white;
          border-radius: 12px;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-md);
        }

        .icon-circle {
          width: 80px;
          height: 80px;
          background: #e3f2fd;
          color: var(--primary-blue);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }

        h2 {
          color: var(--text-dark);
          margin-bottom: 12px;
          font-size: 24px;
        }

        p {
          color: var(--text-medium);
          margin-bottom: 32px;
          line-height: 1.6;
        }

        .primary-upload-btn {
          background: var(--primary-blue);
          color: white;
          border: none;
          padding: 12px 32px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: transform 0.2s, background 0.2s;
          box-shadow: 0 4px 6px rgba(41, 98, 255, 0.2);
          cursor: pointer;
        }

        .primary-upload-btn:hover {
          background: var(--primary-hover);
          transform: translateY(-2px);
        }

        .features-grid {
          margin-top: 40px;
          display: flex;
          justify-content: center;
          gap: 24px;
          font-size: 12px;
          color: var(--text-light);
        }

        .feature {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .check {
          color: var(--status-success);
          font-weight: bold;
        }
      `}</style>
        </div>
    );
};

export default EmptyState;
