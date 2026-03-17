import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { logout } from '../../services/authService';

const MainLayout = ({ children, globalFilters, onGlobalFilterChange, currentView, searchQuery, onSearchQueryChange }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <Sidebar 
        globalFilters={globalFilters}
        onGlobalFilterChange={onGlobalFilterChange}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header 
            onLogout={logout} 
            user={user}
            currentView={currentView}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
