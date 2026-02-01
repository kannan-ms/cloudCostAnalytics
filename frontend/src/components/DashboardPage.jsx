import React, { useState } from 'react';
import MainLayout from './Layout/MainLayout';
import Dashboard from './Dashboard';
import Budgets from './Budgets';
import Forecasts from './Forecasts';
import Reports from './Reports';

const DashboardPage = ({ view }) => {
    const [showUpload, setShowUpload] = useState(false);

    let content;
    switch (view) {
        case 'budgets':
            content = <Budgets />;
            break;
        case 'forecasts':
            content = <Forecasts />;
            break;
        case 'reports':
            content = <Reports />;
            break;
        default:
            content = <Dashboard showUpload={showUpload} setShowUpload={setShowUpload} />;
    }

    return (
        <MainLayout onUploadClick={() => setShowUpload(true)}>
            {content}
        </MainLayout>
    );
};

export default DashboardPage;
