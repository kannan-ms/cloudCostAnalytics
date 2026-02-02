import React, { useState, useEffect } from 'react';
import { DollarSign, AlertCircle, CheckCircle, Plus } from 'lucide-react';
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
        <div className="p-8 max-w-7xl mx-auto">
             <div className="flex justify-between items-center mb-8">
                <div>
                     <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Budget Management</h2>
                     <p className="text-slate-500 mt-1">Monitor your spending limits and alerts.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                    <Plus size={16} />
                    Create Budget
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Main Budget Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Monthly Cloud Budget</h3>
                            <p className="text-sm text-slate-500 mt-1">Global AWS & Azure Infrastructure</p>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            isOverBudget ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                        }`}>
                            {isOverBudget ? <AlertCircle size={14} /> : <CheckCircle size={14} />}
                            {isOverBudget ? 'Over Budget' : 'On Track'}
                        </div>
                    </div>

                    <div className="mb-2 flex justify-between text-sm font-medium">
                        <span className="text-slate-900">${totalCost.toLocaleString()} <span className="text-slate-500 font-normal">spent</span></span>
                        <span className="text-slate-500">${budget.toLocaleString()} <span className="font-normal">limit</span></span>
                    </div>
                    
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-4">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-red-500' : 'bg-blue-500'}`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    
                    <p className="text-sm text-slate-500">
                        At this rate, you are projected to reach <strong className="text-slate-900">${(totalCost * 1.1).toLocaleString()}</strong> by end of month.
                    </p>
                </div>

                {/* Placeholder for secondary budget */}
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                     <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-white border border-slate-200 group-hover:border-blue-200 group-hover:shadow-sm transition-all">
                        <Plus size={24} className="text-slate-400 group-hover:text-blue-500" />
                     </div>
                     <div>
                        <h3 className="font-semibold text-slate-900">Add Department Budget</h3>
                        <p className="text-sm text-slate-500 mt-1">Set granular limits for specific teams.</p>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default Budgets;
