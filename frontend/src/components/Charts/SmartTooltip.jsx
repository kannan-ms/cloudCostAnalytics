import React from 'react';

const SmartTooltip = ({ active, payload, label, currency = '$' }) => {
    if (!active || !payload || !payload.length) return null;

    // Calculate total if multiple items
    const total = payload.reduce((sum, item) => sum + (item.value || 0), 0);

    return (
        <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100 min-w-[200px] animate-in fade-in zoom-in-95 duration-200">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
                {new Date(label).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </p>

            <div className="space-y-2">
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span
                                className="w-2 h-2 rounded-full ring-2 ring-white shadow-sm"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-sm font-medium text-slate-700">
                                {entry.name}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="block text-sm font-bold text-slate-900">
                                {currency}{entry.value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {/* Optional: Add percentage of total if multi-series */}
                            {payload.length > 1 && (
                                <span className="text-[10px] text-slate-400">
                                    {((entry.value / total) * 100).toFixed(1)}%
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Total Footer if Multiple Series */}
            {payload.length > 1 && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-500">Total</span>
                    <span className="text-sm font-bold text-slate-900">
                        {currency}{total.toLocaleString()}
                    </span>
                </div>
            )}
        </div>
    );
};

export default SmartTooltip;
