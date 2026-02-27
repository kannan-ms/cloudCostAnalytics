import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const ServiceForecastCard = ({ service }) => {
    const { service_name, total_predicted_cost, growth_pct, status, action_item } = service;

    let trendColor = 'text-slate-500';
    let TrendIcon = Minus;
    let bgColor = 'bg-slate-50/60';

    if (status === 'Increasing') {
        trendColor = 'text-red-600';
        TrendIcon = TrendingUp;
        bgColor = 'bg-red-50/60 border-red-100/60';
    } else if (status === 'Decreasing') {
        trendColor = 'text-emerald-600';
        TrendIcon = TrendingDown;
        bgColor = 'bg-emerald-50/60 border-emerald-100/60';
    }

    return (
        <div className={`p-3.5 rounded-xl border mb-2.5 flex flex-col md:flex-row items-center justify-between gap-3 backdrop-blur-sm ${bgColor}`}>
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-800 truncate text-[13px]" title={service_name}>
                    {service_name}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl font-bold text-slate-700">
                        ${total_predicted_cost?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 ${trendColor} bg-white/60`}>
                        <TrendIcon size={12} />
                        {growth_pct > 0 ? '+' : ''}{growth_pct}%
                    </span>
                </div>
            </div>

            <div className="flex-1 w-full md:w-auto md:text-right">
                <p className="section-label mb-1">Insight & Action</p>
                <p className="text-[12px] text-slate-600 font-medium">
                    {action_item || "No specific action required."}
                </p>
            </div>
        </div>
    );
};

export default ServiceForecastCard;
