import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, TrendingUp, DollarSign, Zap, ArrowRight, Loader2, Target, Check } from 'lucide-react';
import api from '../../services/api';

const Recommendations = () => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchRecommendations();
    }, []);

    const fetchRecommendations = async () => {
        try {
            setLoading(true);
            const response = await api.get('/recommendations');
            if (response.data.success) {
                setRecommendations(response.data.recommendations);
            }
        } catch (err) {
            setError('Failed to load recommendations');
        } finally {
            setLoading(false);
        }
    };

    // Calculate summary metrics
    const summaryMetrics = useMemo(() => {
        const highPriority = recommendations.filter(r => r.priority === 'HIGH').length;
        
        // Extract savings amounts from impact text
        let totalSavings = 0;
        recommendations.forEach(rec => {
            const match = rec.impact.match(/\$[\d,]+\.?\d*/);
            if (match) {
                const amount = parseFloat(match[0].replace(/[$,]/g, ''));
                totalSavings += isNaN(amount) ? 0 : amount;
            }
        });

        return {
            totalCount: recommendations.length,
            highPriority,
            totalSavings: totalSavings.toFixed(2)
        };
    }, [recommendations]);

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'HIGH':
                return 'bg-red-50 border-red-200 text-red-900';
            case 'MEDIUM':
                return 'bg-yellow-50 border-yellow-200 text-yellow-900';
            case 'LOW':
                return 'bg-blue-50 border-blue-200 text-blue-900';
            default:
                return 'bg-gray-50 border-gray-200 text-gray-900';
        }
    };

    const getPriorityBadgeColor = (priority) => {
        switch (priority) {
            case 'HIGH':
                return 'bg-red-100 text-red-800';
            case 'MEDIUM':
                return 'bg-yellow-100 text-yellow-800';
            case 'LOW':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityIcon = (priority) => {
        switch (priority) {
            case 'HIGH':
                return <AlertCircle size={20} />;
            case 'MEDIUM':
                return <TrendingUp size={20} />;
            case 'LOW':
                return <Zap size={20} />;
            default:
                return <DollarSign size={20} />;
        }
    };

    const getActionPath = (action) => {
        switch (action) {
            case 'view_budgets':
                return '/budgets';
            case 'view_anomalies':
                return '/anomalies';
            case 'view_forecasts':
                return '/forecasts';
            case 'view_service_analysis':
                return '/service-analysis';
            default:
                return '/dashboard';
        }
    };

    const getActionLabel = (action) => {
        switch (action) {
            case 'view_budgets':
                return 'Review Budget';
            case 'view_anomalies':
                return 'View Anomalies';
            case 'view_forecasts':
                return 'View Forecast';
            case 'view_service_analysis':
                return 'View Analysis';
            default:
                return 'Take Action';
        }
    };

    const handleActionClick = (action) => {
        const path = getActionPath(action);
        window.location.href = path;
    };

    const SummaryCard = ({ value, label, icon: Icon, accentBorderColor }) => (
        <div className={`relative rounded-lg border border-slate-200 border-l-4 ${accentBorderColor} bg-white p-5 shadow-sm transition-all duration-150 hover:shadow-md`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600 mb-2">{label}</p>
                    <p className="text-3xl font-bold text-slate-900">{value}</p>
                </div>
                <div className={`p-2 rounded-lg bg-slate-100`}>
                    <Icon size={20} className="text-slate-600" />
                </div>
            </div>
        </div>
    );

    const renderEmptyState = () => (
        <div className="text-center py-16 px-8">
            <div className="flex justify-center mb-6">
                <div className="bg-emerald-100 p-3 rounded-lg">
                    <Check size={32} className="text-emerald-600" />
                </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
                Your Cloud Spending Looks Healthy
            </h3>
            <p className="text-slate-600 max-w-md mx-auto text-sm">
                No optimization recommendations at the moment. Keep monitoring your costs and we'll alert you if opportunities arise.
            </p>
        </div>
    );

    return (
        <div className="flex-1 overflow-auto bg-white">
            <div className="w-full mx-auto px-8 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">
                        Cost Optimization Recommendations
                    </h1>
                    <p className="text-slate-600 text-base">
                        Actionable insights to help you reduce cloud spending
                    </p>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-32">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                        <p className="text-slate-600">Analyzing your cloud spend...</p>
                    </div>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-900 font-medium">{error}</p>
                    </div>
                )}

                {/* Summary Section */}
                {!loading && !error && recommendations.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <SummaryCard
                            value={summaryMetrics.totalCount}
                            label="Total Recommendations"
                            icon={Target}
                            accentBorderColor="border-l-blue-500"
                        />
                        <SummaryCard
                            value={summaryMetrics.highPriority}
                            label="High Priority Issues"
                            icon={AlertCircle}
                            accentBorderColor="border-l-red-500"
                        />
                        <SummaryCard
                            value={`$${parseFloat(summaryMetrics.totalSavings).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                            label="Estimated Impact"
                            icon={DollarSign}
                            accentBorderColor="border-l-emerald-500"
                        />
                    </div>
                )}

                {/* Recommendations Grid or Empty State */}
                {!loading && !error && (
                    <>
                        {recommendations.length === 0 ? (
                            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                                {renderEmptyState()}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {recommendations.map((rec, index) => {
                                    const isHigh = rec.priority === 'HIGH';
                                    const isMedium = rec.priority === 'MEDIUM';
                                    const borderColor = isHigh ? 'border-l-red-500' : isMedium ? 'border-l-amber-500' : 'border-l-blue-500';
                                    const badgeBg = isHigh ? 'bg-red-100' : isMedium ? 'bg-amber-100' : 'bg-blue-100';
                                    const badgeText = isHigh ? 'text-red-800' : isMedium ? 'text-amber-800' : 'text-blue-800';
                                    const buttonBg = isHigh ? 'bg-red-600 hover:bg-red-700' : isMedium ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700';
                                    const impactColor = isHigh ? 'text-red-600' : isMedium ? 'text-amber-600' : 'text-blue-600';

                                    return (
                                        <div
                                            key={index}
                                            className={`rounded-lg border border-slate-200 border-l-4 ${borderColor} bg-white p-5 shadow-sm transition-all hover:shadow-md`}
                                        >
                                            {/* Header with Priority Badge */}
                                            <div className="flex items-start gap-3 mb-4">
                                                <div className={`p-2 rounded-lg ${badgeBg} flex-shrink-0`}>
                                                    {getPriorityIcon(rec.priority)}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-base text-slate-900 mb-2">
                                                        {rec.title}
                                                    </h3>
                                                    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded ${badgeBg} ${badgeText} uppercase`}>
                                                        {rec.priority} Priority
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Description */}
                                            <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                                                {rec.description}
                                            </p>

                                            {/* Impact Metric */}
                                            <div className="mb-5 p-4 rounded-lg bg-slate-50 border border-slate-200">
                                                <p className="text-xs font-medium text-slate-500 mb-1 uppercase">Estimated Impact</p>
                                                <p className={`text-lg font-bold ${impactColor}`}>
                                                    {rec.impact}
                                                </p>
                                            </div>

                                            {/* Action Button */}
                                            <button
                                                onClick={() => handleActionClick(rec.action)}
                                                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold text-white text-sm transition-all shadow-sm hover:shadow-md ${buttonBg}`}
                                            >
                                                {getActionLabel(rec.action)}
                                                <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Recommendations;
