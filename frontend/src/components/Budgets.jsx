import React, { useState, useEffect } from 'react';
import { DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../services/api';

const Budgets = () => {
    const [totalCost, setTotalCost] = useState(0);
    const [budget] = useState(20000); // Demo budget amount
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.getCostSummary();
                if (res.data && res.data.groups) {
                    // Calculate current month total if possible, or just use grand total for demo
                    setTotalCost(res.data.grand_total || 0);
                }
            } catch (e) {
                console.error("Failed to load cost summary", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const percentage = Math.min((totalCost / budget) * 100, 100);
    const isOverBudget = totalCost > budget;

    return (
        <div className="budgets-container">
            <h2 className="page-title">Budget Management</h2>

            <div className="budget-card main-budget">
                <div className="budget-header">
                    <div>
                        <h3>Monthly Cloud Budget</h3>
                        <p className="subtitle">Global AWS & Azure Infrastructure</p>
                    </div>
                    <div className="budget-status">
                        {isOverBudget ? (
                            <span className="status-badge error"><AlertCircle size={14} /> Over Budget</span>
                        ) : (
                            <span className="status-badge success"><CheckCircle size={14} /> On Track</span>
                        )}
                    </div>
                </div>

                <div className="progress-section">
                    <div className="progress-labels">
                        <span>${totalCost.toLocaleString()} spent</span>
                        <span>${budget.toLocaleString()} limit</span>
                    </div>
                    <div className="progress-bar-bg">
                        <div
                            className={`progress-bar-fill ${isOverBudget ? 'danger' : 'safe'}`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    <p className="forecast-text">
                        At this rate, you are projected to reach <strong>${(totalCost * 1.1).toLocaleString()}</strong> by end of month.
                    </p>
                </div>
            </div>

            <style>{`
        .budgets-container {
          padding: 24px;
          max-width: 1200px;
        }
        .page-title {
          font-size: 24px;
          color: var(--text-dark);
          margin-bottom: 24px;
        }
        .budget-card {
          background: white;
          border: 1px solid var(--border-light);
          border-radius: 8px;
          padding: 24px;
          box-shadow: var(--shadow-sm);
        }
        .budget-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }
        .subtitle {
          color: var(--text-light);
          font-size: 14px;
          margin-top: 4px;
        }
        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .status-badge.success { background: #e8f5e9; color: #2e7d32; }
        .status-badge.error { background: #ffebee; color: #c62828; }
        
        .progress-section {
          max-width: 600px;
        }
        .progress-labels {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--text-dark);
        }
        .progress-bar-bg {
          height: 12px;
          background: #f1f3f5;
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 12px;
        }
        .progress-bar-fill {
          height: 100%;
          background: var(--primary-blue);
          border-radius: 6px;
          transition: width 1s ease;
        }
        .progress-bar-fill.danger { background: #ef5350; }
        .progress-bar-fill.safe { background: #66bb6a; }
        
        .forecast-text {
          font-size: 13px;
          color: var(--text-light);
        }
      `}</style>
        </div>
    );
};

export default Budgets;
