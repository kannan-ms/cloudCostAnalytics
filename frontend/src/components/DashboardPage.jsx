import React, { useState } from 'react';
import MainLayout from './Layout/MainLayout';
import Dashboard from './Dashboard';
import Budgets from './Budgets';
import Forecasts from './Forecasts';
import Reports from './Reports';
import CloudIntegration from './CloudIntegration';
import ServiceAnalysis from './ServiceAnalysis';
import AnomaliesPage from './AnomaliesPage';

const DashboardPage = ({ view }) => {
    const [globalFilters, setGlobalFilters] = useState({});
    const [searchQuery, setSearchQuery] = useState('');

    const handleGlobalFilterChange = (newFilters) => {
        // Preserve header search filter while allowing sidebar/global filters to update.
        if (searchQuery.trim()) {
            setGlobalFilters({ ...newFilters, service: searchQuery.trim() });
        } else {
            setGlobalFilters(newFilters);
        }
    };

    const handleSearchQueryChange = (value) => {
        setSearchQuery(value);
        setGlobalFilters((prev) => {
            const next = { ...prev };
            const trimmed = value.trim();
            if (trimmed) {
                next.service = trimmed;
            } else {
                delete next.service;
            }
            return next;
        });
    };

    let content;
    switch (view) {
        case 'budgets':
            content = <Budgets globalFilters={globalFilters} />;
            break;
        case 'forecasts':
            content = <Forecasts globalFilters={globalFilters} />;
            break;
        case 'reports':
            content = <Reports globalFilters={globalFilters} />;
            break;
        case 'service-analysis':
            content = <ServiceAnalysis globalFilters={globalFilters} />;
            break;
        case 'anomalies':
            content = <AnomaliesPage globalFilters={globalFilters} />;
            break;
        case 'integrations':
            content = <CloudIntegration />;
            break;
        default:
            content = <Dashboard 
                globalFilters={globalFilters}
            />;
    }

    return (
        <MainLayout 
            globalFilters={globalFilters}
            onGlobalFilterChange={handleGlobalFilterChange}
            currentView={view}
            searchQuery={searchQuery}
            onSearchQueryChange={handleSearchQueryChange}
        >
            {content}
        </MainLayout>
    );
};

export default DashboardPage;
