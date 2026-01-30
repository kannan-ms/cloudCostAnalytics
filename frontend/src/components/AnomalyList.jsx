import { useState } from 'react';
import api from '../services/api';

function AnomalyList({ anomalies, showActions = false, onUpdate }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!anomalies || anomalies.length === 0) {
    return (
      <div className="anomaly-empty">
        <p>✅ No anomalies detected. Your costs look normal!</p>
      </div>
    );
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#dc2626';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'new': return '#3b82f6';
      case 'acknowledged': return '#f59e0b';
      case 'resolved': return '#10b981';
      case 'ignored': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const handleStatusUpdate = async (anomalyId, newStatus) => {
    try {
      await api.put(`/anomalies/${anomalyId}/status`, { status: newStatus });
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating anomaly status:', error);
      alert('Failed to update anomaly status');
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="anomaly-list">
      {anomalies.map((anomaly) => {
        const isExpanded = expandedId === anomaly._id;
        
        return (
          <div 
            key={anomaly._id} 
            className={`anomaly-card ${isExpanded ? 'expanded' : ''}`}
            style={{ borderLeftColor: getSeverityColor(anomaly.severity) }}
          >
            <div className="anomaly-header" onClick={() => toggleExpand(anomaly._id)}>
              <div className="anomaly-title">
                <span 
                  className="severity-badge" 
                  style={{ backgroundColor: getSeverityColor(anomaly.severity) }}
                >
                  {anomaly.severity}
                </span>
                <span className="anomaly-type">
                  {anomaly.type ? anomaly.type.replace('_', ' ') : anomaly.service_name}
                </span>
              </div>
              <div className="anomaly-meta">
                <span 
                  className="status-badge"
                  style={{ 
                    backgroundColor: getStatusColor(anomaly.status),
                    color: '#fff'
                  }}
                >
                  {anomaly.status}
                </span>
                <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
              </div>
            </div>

            {isExpanded && (
              <div className="anomaly-details">
                <div className="anomaly-description">
                  <p><strong>Description:</strong> {anomaly.message || anomaly.description}</p>
                  
                  <div className="details-grid">
                    {anomaly.detected_value !== undefined && (
                      <p><strong>Detected Cost:</strong> ${anomaly.detected_value?.toFixed(2)}</p>
                    )}
                    {anomaly.expected_value !== undefined && (
                      <p><strong>Expected Cost:</strong> ${anomaly.expected_value?.toFixed(2)}</p>
                    )}
                    {anomaly.deviation_percentage !== undefined && (
                      <p><strong>Deviation:</strong> {anomaly.deviation_percentage?.toFixed(1)}%</p>
                    )}
                    {anomaly.service_name && (
                      <p><strong>Service:</strong> {anomaly.service_name}</p>
                    )}
                    {anomaly.region && anomaly.region !== 'N/A' && (
                      <p><strong>Region:</strong> {anomaly.region}</p>
                    )}
                  </div>
                </div>

                {anomaly.recommendation && (
                  <div className="recommendations">
                    <h4>💡 Recommendations:</h4>
                    <p>{anomaly.recommendation}</p>
                  </div>
                )}

                <div className="anomaly-footer">
                  <span className="date-detected">
                    Detected: {new Date(anomaly.detected_at).toLocaleDateString()}
                  </span>
                  
                  {showActions && (
                    <div className="anomaly-actions">
                      {anomaly.status === 'new' && (
                        <>
                          <button 
                            className="action-btn acknowledge"
                            onClick={() => handleStatusUpdate(anomaly._id, 'acknowledged')}
                          >
                            Acknowledge
                          </button>
                          <button 
                            className="action-btn ignore"
                            onClick={() => handleStatusUpdate(anomaly._id, 'ignored')}
                          >
                            Ignore
                          </button>
                        </>
                      )}
                      {anomaly.status === 'acknowledged' && (
                        <button 
                          className="action-btn resolve"
                          onClick={() => handleStatusUpdate(anomaly._id, 'resolved')}
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default AnomalyList;
