import React, { useState, useEffect } from 'react';
import { X, Filter } from 'lucide-react';
import api from '../services/api';

const FilterBar = ({ filters = {}, onFilterChange }) => {
    const [options, setOptions] = useState({
        services: [],
        regions: [],
        accounts: [],
        providers: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const res = await api.get('/costs/filters');
                if (res.data.success) {
                    setOptions({
                        services: res.data.services || [],
                        regions: res.data.regions || [],
                        accounts: res.data.accounts || [],
                        providers: res.data.providers || []
                    });
                }
            } catch (err) {
                console.error("Failed to fetch filter options", err);
            } finally {
                setLoading(false);
            }
        };
        fetchOptions();
    }, []);

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters };
        if (value === 'All' || value === '') {
            delete newFilters[key];
        } else {
            newFilters[key] = value;
        }
        if (onFilterChange) {
            onFilterChange(newFilters);
        }
    };

    const removeFilter = (key) => {
        const newFilters = { ...filters };
        delete newFilters[key];
        if (onFilterChange) {
            onFilterChange(newFilters);
        }
    };

    const hasFilters = Object.keys(filters).length > 0;

    if (loading) return null; // Or a skeleton

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-3 text-slate-500 text-sm font-medium">
                <Filter size={16} />
                <span>Filter Data</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                {['service', 'region', 'account', 'provider'].map((key) => {
                     // Pluralize key for accessing options
                    const optionsKey = key + 's'; 
                    const currentVal = filters[key] || '';

                    return (
                        <div key={key} className="relative">
                            <select
                                className={`appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow cursor-pointer min-w-[140px] ${currentVal ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}`}
                                value={currentVal}
                                onChange={(e) => handleFilterChange(key, e.target.value)}
                            >
                                <option value="">All {key.charAt(0).toUpperCase() + key.slice(1)}s</option>
                                {options[optionsKey]?.map((opt) => (
                                    <option key={opt} value={opt}>
                                        {opt}
                                    </option>
                                ))}
                            </select>
                            {/* Custom arrow could go here if appearance-none is used, but native is fine for functionality for now */}
                             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    );
                })}

                {hasFilters && (
                    <button
                        onClick={() => onFilterChange({})}
                        className="ml-auto text-sm text-red-500 font-medium hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
                    >
                        <X size={14} />
                        Clear All
                    </button>
                )}
            </div>
             
             {/* Active Tags Visual (Optional, adds nice touch) */}
             {hasFilters && (
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400 font-medium py-1">Active:</span>
                    {Object.entries(filters).map(([key, value]) => (
                        <span key={key} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100/50 text-blue-700 text-xs rounded-full border border-blue-200/50">
                            <span className="opacity-60 capitalize">{key}:</span>
                            <span className="font-semibold">{value}</span>
                            <button onClick={() => removeFilter(key)} className="hover:text-blue-900 ml-1">
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
             )}
        </div>
    );
};

export default FilterBar;
