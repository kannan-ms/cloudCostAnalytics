import React from 'react';
import { TrendingUp, Calendar, ArrowRight } from 'lucide-react';

const Forecasts = () => {
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div>
                 <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Cost Forecasting</h2>
                 <p className="text-slate-500 mt-1">Predictive analysis based on historical usage patterns.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
                    <div className="p-3 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-600/20">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Next Month Projection</p>
                        <div className="text-3xl font-bold text-slate-900 mb-1">$12,450.00</div>
                        <div className="flex items-center gap-1 text-sm font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full w-fit">
                            <TrendingUp size={14} />
                            +5.2% vs last month
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600 border border-blue-100">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">End of Year Estimate</p>
                        <div className="text-3xl font-bold text-slate-900 mb-1">$145,000.00</div>
                        <p className="text-sm text-slate-500">Based on current usage trends</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-slate-900">6-Month Forecast Model</h3>
                    <p className="text-slate-500 text-sm">Historical data vs. predictive modeling analysis.</p>
                </div>

                <div className="h-64 flex items-end gap-4 md:gap-8 pb-4 border-b border-slate-200 px-4">
                     {[40, 45, 60, 65, 70, 75].map((h, i) => {
                         const isForecast = i >= 3;
                         return (
                             <div key={i} className="flex-1 flex flex-col justify-end group h-full relative">
                                <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    ${h * 200}
                                </span>
                                <div 
                                    className={`w-full rounded-t-sm transition-all duration-500 relative ${isForecast ? 'bg-indigo-300' : 'bg-blue-500'}`} 
                                    style={{ height: `${h}%` }}
                                >
                                    {isForecast && (
                                        <div className="absolute inset-0 w-full h-full bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')] opacity-20"></div>
                                    )}
                                </div>
                                <div className="text-xs text-center mt-3 text-slate-400 font-medium">
                                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i]}
                                </div>
                             </div>
                         )
                     })}
                </div>
                
                <div className="flex items-center justify-center gap-6 mt-6">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        Actual Spending
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="w-3 h-3 rounded-full bg-indigo-300 relative overflow-hidden">
                             <div className="absolute inset-0 w-full h-full bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')] opacity-20"></div>
                        </span>
                        Forecasted Range
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-800 text-sm">
                 <div className="p-2 bg-indigo-100 rounded-full">
                    <TrendingUp size={16} />
                 </div>
                 <p><strong>Insight:</strong> Spending is projected to increase by 15% in Q2 due to new instance provisioning.</p>
            </div>
        </div>
    );
};

export default Forecasts;
