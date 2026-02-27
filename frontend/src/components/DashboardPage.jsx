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
    const [showUpload, setShowUpload] = useState(false);
    const [globalFilters, setGlobalFilters] = useState({});

    const handleGlobalFilterChange = (newFilters) => {
        setGlobalFilters(newFilters);
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
                showUpload={showUpload} 
                setShowUpload={setShowUpload} 
                globalFilters={globalFilters}
            />;
    }

    return (
        <MainLayout 
            onUploadClick={() => setShowUpload(true)}
            globalFilters={globalFilters}
            onGlobalFilterChange={handleGlobalFilterChange}
            currentView={view}
        >
            {content}
        </MainLayout>
    );
};

export default DashboardPage;
