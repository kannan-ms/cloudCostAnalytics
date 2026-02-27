import React from 'react';

const SmartTooltip = ({ active, payload, label, currency = '$' }) => {
    if (!active || !payload || !payload.length) return null;

    const total = payload.reduce((sum, item) => sum + (item.value || 0), 0);

    // Format date nicely
    const formattedDate = (() => {
        try {
            return new Date(label).toLocaleDateString(undefined, {
                weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
            });
        } catch {
            return label;
        }
    })();

    return (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/30 min-w-[210px] overflow-hidden">
            {/* Date header */}
            <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-slate-50/50 border-b border-slate-100/60">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {formattedDate}
                </p>
            </div>

            {/* Service entries */}
            <div className="px-4 py-3 space-y-2">
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between gap-5">
                        <div className="flex items-center gap-2 min-w-0">
                            <span
                                className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-[11.5px] font-medium text-slate-600 truncate">
                                {entry.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[12px] font-bold text-slate-800 tabular-nums">
                                {currency}{entry.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {payload.length > 1 && (
                                <span className="text-[10px] text-slate-400 tabular-nums w-[38px] text-right">
                                    {((entry.value / total) * 100).toFixed(1)}%
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Total footer */}
            {payload.length > 1 && (
                <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100/60 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total</span>
                    <span className="text-[12.5px] font-bold text-slate-900 tabular-nums">
                        {currency}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            )}
        </div>
    );
};

export default SmartTooltip;
