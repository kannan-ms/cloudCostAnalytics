import React, { lazy, Suspense, useState } from 'react';
import MainLayout from '../layout/MainLayout';

const Dashboard = lazy(() => import('./Dashboard'));
const Budgets = lazy(() => import('../budget/Budgets'));
const Forecasts = lazy(() => import('../forecast/Forecasts'));
const Reports = lazy(() => import('../reports/Reports'));
const CloudIntegration = lazy(() => import('../integration/CloudIntegration'));
const ServiceAnalysis = lazy(() => import('../analysis/ServiceAnalysis'));
const AnomaliesPage = lazy(() => import('../anomaly/AnomaliesPage'));

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
            <Suspense fallback={<div className="py-10 text-center text-sm text-slate-500">Loading view...</div>}>
                {content}
            </Suspense>
        </MainLayout>
    );
};

export default DashboardPage;
