import React, { useState, useEffect } from 'react';
import { X, Plus, Filter } from 'lucide-react';
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
                        services: res.data.services,
                        regions: res.data.regions,
                        accounts: res.data.accounts,
                        providers: res.data.providers
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
        if (value === 'No Filters Applied' || value === '') {
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

    const FilterDropdown = ({ label, field, optionsList, currentValue }) => (
        <div className="filter-chip">
            <div className="filter-label">{label}</div>
            <div className={`filter-value ${currentValue ? 'active' : ''}`}>
               <select 
                    value={currentValue || ''} 
                    onChange={(e) => handleFilterChange(field, e.target.value)}
                    className="filter-select"
                >
                    <option value="">No Filters Applied</option>
                    {optionsList && optionsList.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
               </select>
               {currentValue && (
                   <button className="remove-filter" onClick={(e) => {
                       removeFilter(field);
                   }}>
                        <X size={12} />
                   </button>
               )}
            </div>
        </div>
    );

    return (
        <div className="filter-bar">
            <FilterDropdown 
                label="Cloud Platform" 
                field="provider" 
                optionsList={options.providers} 
                currentValue={filters.provider} 
            />
            
            <FilterDropdown 
                label="Account" 
                field="account" 
                optionsList={options.accounts} 
                currentValue={filters.account} 
            />

            <FilterDropdown 
                label="Region" 
                field="region" 
                optionsList={options.regions} 
                currentValue={filters.region} 
            />

            <FilterDropdown 
                label="Service" 
                field="service" 
                optionsList={options.services} 
                currentValue={filters.service} 
            />

             <div className="filter-chip">
                <div className="filter-label">Transaction Type</div>
                <div className="filter-value active">
                     <span style={{ padding: '6px 8px' }}>USAGE</span>
                </div>
            </div>

            <button className="add-filter-btn">
                <Plus size={14} />
                More Filters
            </button>

            <style>{`
        .filter-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .filter-chip {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .filter-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-dark);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .filter-label::before {
          content: "::";
          color: #bdbdbd;
          font-weight: 400;
          margin-right: 4px;
          font-size: 14px;
          letter-spacing: -1px;
        }

        .filter-value {
          background: white;
          border: 1px solid var(--border-light);
          padding: 0;
          border-radius: 4px;
          font-size: 11px;
          color: var(--text-light);
          display: flex;
          align-items: center;
          min-width: 140px;
          position: relative;
        }

        .filter-value.active {
          border-color: var(--primary-blue);
          color: var(--text-dark);
        }

        .filter-select {
            appearance: none;
            border: none;
            background: transparent;
            width: 100%;
            padding: 6px 24px 6px 8px;
            font-size: 11px;
            color: inherit;
            cursor: pointer;
            outline: none;
            font-family: inherit;
        }
        
        .filter-select:focus {
            background: #f8fafc;
        }

        .remove-filter {
          position: absolute;
          right: 4px;
          background: none;
          border: none;
          color: var(--text-light);
          cursor: pointer;
          display: flex;
          align-items: center;
          padding: 2px;
          z-index: 10;
        }

        .remove-filter:hover {
          color: #ef4444;
        }

        .add-filter-btn {
          margin-top: 16px; 
          background: none;
          border: 1px dashed var(--border-light);
          padding: 6px 12px;
          border-radius: 4px;
          color: var(--primary-blue);
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        
        .add-filter-btn:hover {
            background: #f0f9ff;
            border-color: var(--primary-blue);
        }
            `}</style>
        </div>
    );
};

export default FilterBar;
