import React from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/solid';

const ServiceForecastCard = ({ service }) => {
    const { service_name, total_predicted_cost, growth_pct, status, action_item } = service;

    let trendColor = 'text-gray-500';
    let TrendIcon = MinusIcon;
    let bgColor = 'bg-gray-50';

    if (status === 'Increasing') {
        trendColor = 'text-red-600';
        TrendIcon = ArrowTrendingUpIcon;
        bgColor = 'bg-red-50 border-red-100';
    } else if (status === 'Decreasing') {
        trendColor = 'text-green-600';
        TrendIcon = ArrowTrendingDownIcon;
        bgColor = 'bg-green-50 border-green-100';
    }

    return (
        <div className={`p-4 rounded-lg border mb-3 flex flex-col md:flex-row items-center justify-between gap-4 ${bgColor}`}>
            {/* Service Info */}
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 truncate" title={service_name}>
                    {service_name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-gray-800">
                        ${total_predicted_cost?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${trendColor} bg-white/50`}>
                        <TrendIcon className="h-3 w-3" />
                        {growth_pct > 0 ? '+' : ''}{growth_pct}%
                    </span>
                </div>
            </div>

            {/* Action Item */}
            <div className="flex-1 w-full md:w-auto md:text-right">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                    Insight & Action
                </p>
                <p className="text-sm text-gray-700 font-medium">
                    {action_item || "No specific action required."}
                </p>
            </div>
        </div>
    );
};

export default ServiceForecastCard;
