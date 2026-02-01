import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { logout } from '../../services/authService';

const MainLayout = ({ children, onUploadClick }) => {
  return (
    <div className="layout-container">
      <Sidebar />
      <div className="main-content-wrapper">
        <Header onUploadClick={onUploadClick} onLogout={logout} />
        <main className="content-area">
          {children}
        </main>
      </div>

      <style>{`
        .layout-container {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
        }

        .main-content-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0; /* Prevent overflow issues */
          background: var(--main-bg);
        }

        .content-area {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 24px;
        }
      `}</style>
    </div>
  );
};

export default MainLayout;
