import React from 'react';
import { AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';

const AnomalyList = ({ anomalies }) => {
  if (!anomalies || anomalies.length === 0) {
    return (
      <div className="empty-state">
        <CheckCircle size={48} color="var(--status-success)" />
        <h3>No Anomalies Detected</h3>
        <p>Your cloud costs are within expected content.</p>
        <style>{`
          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: var(--text-medium);
            gap: 16px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="anomaly-list">
      {anomalies.map((item, index) => {
        // Map backend fields to frontend expectations safely
        const cost = item.detected_value || item.cost || 0;
        const average = item.expected_value || item.average || 0;
        const date = item.detected_at || item.date || new Date().toISOString();
        const service = item.service_name || item.service || 'Unknown Service';
        const severity = item.severity || 'low';

        return (
          <div key={index} className="anomaly-card">
            <div className="anomaly-header">
              <div className={`severity-badge ${severity}`}>
                {severity}
              </div>
              <div className="anomaly-date">{new Date(date).toLocaleDateString()}</div>
            </div>

            <div className="anomaly-content">
              <div className="service-info">
                <AlertTriangle size={20} className="warning-icon" />
                <div>
                  <div className="service-name">{service}</div>
                  <div className="cost-impact">
                    +${(cost - average).toFixed(2)} excess
                  </div>
                </div>
              </div>

              <div className="metric-row">
                <div className="metric">
                  <span className="label">Actual</span>
                  <span className="value">${cost.toFixed(2)}</span>
                </div>
                <div className="metric">
                  <span className="label">Expected</span>
                  <span className="value">${average.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      <style>{`
        .anomaly-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
          padding: 10px;
        }

        .anomaly-card {
          border: 1px solid var(--border-light);
          border-radius: 6px;
          padding: 16px;
          border-left: 4px solid var(--status-warning);
          background: #fff;
        }

        .anomaly-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .severity-badge {
          text-transform: uppercase;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 10px;
        }

        .severity-badge.high { background: #ffebee; color: #c62828; }
        .severity-badge.medium { background: #fff3e0; color: #ef6c00; }
        .severity-badge.low { background: #e8f5e9; color: #2e7d32; }

        .service-info {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }

        .warning-icon {
          color: var(--status-warning);
        }

        .service-name {
          font-weight: 700;
          color: var(--text-dark);
        }

        .cost-impact {
          font-size: 12px;
          color: var(--status-error);
          font-weight: 600;
        }

        .metric-row {
          display: flex;
          justify-content: space-between;
          padding-top: 12px;
          border-top: 1px dashed var(--border-light);
        }

        .metric {
          display: flex;
          flex-direction: column;
        }

        .metric .label {
          font-size: 10px;
          color: var(--text-light);
          text-transform: uppercase;
        }

        .metric .value {
          font-weight: 600;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

export default AnomalyList;
