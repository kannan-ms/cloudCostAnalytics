import React from 'react';
import { TrendingUp, Calendar } from 'lucide-react';

const Forecasts = () => {
    return (
        <div className="forecast-container">
            <h2 className="page-title">Cost Forecasting</h2>

            <div className="forecast-grid">
                <div className="forecast-card primary">
                    <div className="icon-wrapper"><TrendingUp size={24} color="white" /></div>
                    <div className="forecast-info">
                        <div className="label">Next Month Projection</div>
                        <div className="value">$12,450.00</div>
                        <div className="trend up">+5.2% vs last month</div>
                    </div>
                </div>

                <div className="forecast-card">
                    <div className="icon-wrapper secondary"><Calendar size={24} color="var(--primary-blue)" /></div>
                    <div className="forecast-info">
                        <div className="label">End of Year Estimate</div>
                        <div className="value">$145,000.00</div>
                        <div className="subtext">Based on current usage trends</div>
                    </div>
                </div>
            </div>

            <div className="chart-placeholder">
                <h3>6-Month Forecast Model</h3>
                <p>Uses historical data to predict future spending patterns.</p>
                <div className="mock-chart">
                    <div className="bar" style={{ height: '40%' }}></div>
                    <div className="bar" style={{ height: '45%' }}></div>
                    <div className="bar" style={{ height: '60%' }}></div>
                    <div className="bar forecast" style={{ height: '65%' }}></div>
                    <div className="bar forecast" style={{ height: '70%' }}></div>
                    <div className="bar forecast" style={{ height: '75%' }}></div>
                </div>
                <div className="chart-legend">
                    <span className="dot actual"></span> Actual
                    <span className="dot forecast"></span> Forecast
                </div>
            </div>

            <style>{`
        .forecast-container { padding: 24px; max-width: 1200px; }
        .page-title { font-size: 24px; color: var(--text-dark); margin-bottom: 24px; }
        
        .forecast-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        
        .forecast-card {
          background: white;
          padding: 24px;
          border-radius: 8px;
          border: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          gap: 20px;
          box-shadow: var(--shadow-sm);
        }
        
        .forecast-card.primary .icon-wrapper {
             background: var(--primary-blue);
        }
        
        .icon-wrapper {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icon-wrapper.secondary { background: #e3f2fd; }

        .value { font-size: 28px; font-weight: 700; color: var(--text-dark); margin: 4px 0; }
        .label { font-size: 13px; color: var(--text-light); text-transform: uppercase; font-weight: 600; }
        .trend.up { color: #c62828; font-size: 13px; font-weight: 600; }
        .subtext { color: var(--text-light); font-size: 13px; }

        .chart-placeholder {
          background: white;
          padding: 24px;
          border-radius: 8px;
          border: 1px solid var(--border-light);
        }
        .mock-chart {
            height: 200px;
            display: flex;
            align-items: flex-end;
            gap: 20px;
            padding: 20px 0;
            border-bottom: 1px solid var(--border-light);
        }
        .bar {
            flex: 1;
            background: var(--primary-blue);
            border-radius: 4px 4px 0 0;
            opacity: 0.8;
        }
        .bar.forecast {
            background: repeating-linear-gradient(45deg, #82b1ff, #82b1ff 10px, #448aff 10px, #448aff 20px);
            opacity: 0.6;
        }
        .chart-legend {
            margin-top: 16px;
            display: flex;
            gap: 20px;
            font-size: 13px;
            color: var(--text-medium);
        }
        .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 6px; }
        .dot.actual { background: var(--primary-blue); }
        .dot.forecast { background: #82b1ff; }
      `}</style>
        </div>
    );
};

export default Forecasts;
