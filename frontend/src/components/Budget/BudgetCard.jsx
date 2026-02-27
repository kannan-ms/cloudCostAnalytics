import React from 'react';
import { AlertTriangle, CheckCircle, TrendingUp, Trash2 } from 'lucide-react';

const BudgetCard = ({ budgetData, onDelete }) => {
    const { budget, status, period, metrics, alerts } = budgetData;
    const { pct_consumed, actual_spend, total_projected, remaining_amount } = metrics;

    // Determine colors based on status
    let statusColor = 'bg-green-100 text-green-800';
    let barColor = 'bg-green-500';
    let Icon = CheckCircle;
    let borderColor = 'border-gray-200';

    if (status === 'Critical') {
        statusColor = 'bg-red-100 text-red-800';
        barColor = 'bg-red-500';
        Icon = AlertTriangle;
        borderColor = 'border-red-200';
    } else if (status === 'Warning') {
        statusColor = 'bg-amber-100 text-amber-800';
        barColor = 'bg-amber-500';
        Icon = AlertTriangle;
        borderColor = 'border-amber-200';
    }

    // Calculate width for forecast marker
    const forecastWidth = Math.min((total_projected / budget.amount) * 100, 100);

    return (
        <div className={`bg-white rounded-lg shadow-sm border ${borderColor} p-6 relative group transition-shadow hover:shadow`}>
            {/* Delete Button (visible on hover) */}
            <button
                onClick={() => onDelete(budget.id)}
                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete Budget"
            >
                <Trash2 size={18} />
            </button>

            {/* Header */}
            <div className="flex justify-between items-start mb-4 pr-8">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">{budget.name}</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">
                        {budget.scope?.type === 'global' ? 'Global Budget' : `${budget.scope?.type}: ${budget.scope?.value}`}
                    </p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${statusColor}`}>
                    <Icon size={12} />
                    {status}
                </span>
            </div>

            {/* Main Metrics */}
            <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold text-gray-900">${actual_spend.toLocaleString()}</span>
                <span className="text-sm text-gray-500 mb-1"> / ${budget.amount.toLocaleString()}</span>
            </div>

            {/* Progress Bar Container */}
            <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden mb-2">
                {/* Actual Spend Bar */}
                <div
                    className={`absolute top-0 left-0 h-full rounded-full ${barColor} transition-all duration-500`}
                    style={{ width: `${Math.min(pct_consumed, 100)}%` }}
                ></div>

                {/* Forecast Marker */}
                {total_projected > actual_spend && (
                    <div
                        className="absolute top-0 h-full border-r-2 border-dashed border-gray-400 opacity-50 z-10"
                        style={{ left: `${forecastWidth}%` }}
                        title={`Forecasted: $${total_projected.toLocaleString()}`}
                    ></div>
                )}
            </div>

            <div className="flex justify-between text-xs text-gray-500 mb-6">
                <span>{pct_consumed}% consumed</span>
                <span>
                    {metrics.remaining_amount >= 0
                        ? `$${metrics.remaining_amount.toLocaleString()} remaining`
                        : `$${Math.abs(metrics.remaining_amount).toLocaleString()} over budget`}
                </span>
            </div>

            {/* Alerts & Insights */}
            {alerts && alerts.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="flex items-start gap-2">
                        <TrendingUp size={16} className="text-slate-500 mt-0.5" />
                        <div className="space-y-1">
                            {alerts.map((alert, idx) => (
                                <p key={idx} className="text-xs font-medium text-slate-700">{alert}</p>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {!alerts?.length && (
                <div className="text-xs text-gray-400 italic">No alerts. Budget is on track.</div>
            )}

            {/* Period Info */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
                <span>Monthly Period</span>
                <span>{period.days_remaining} days left</span>
            </div>
        </div>
    );
};

export default BudgetCard;
