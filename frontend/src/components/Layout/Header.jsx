import React from 'react';
import {
  Upload,
  LogOut,
  User
} from 'lucide-react';

const Header = ({ onUploadClick, onLogout }) => {
  // We remove non-functional items like search (unless we implement it), notifications, etc.
  // The prompt says "No dead clicks". 

  return (
    <header className="header">
      <div className="header-left">
        <div className="breadcrumbs">
          <span className="breadcrumb-item">CLOUD INSIGHT</span>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-item active">COST ANALYTICS</span>
        </div>
      </div>

      <div className="header-right">
        <button className="upload-btn" onClick={onUploadClick}>
          <Upload size={16} />
          Upload Cost File
        </button>

        <div className="divider"></div>

        <div className="user-profile">
          <div className="user-avatar">
            <User size={18} />
          </div>
          <button className="logout-btn" onClick={onLogout} title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <style>{`
        .header {
          height: 64px;
          background: white;
          border-bottom: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 32px;
          color: var(--text-medium);
          box-shadow: var(--shadow-sm);
          z-index: 10;
        }

        .header-left {
          display: flex;
          align-items: center;
        }

        .breadcrumbs {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-light);
          letter-spacing: 0.5px;
        }

        .breadcrumb-item.active {
          color: var(--primary-blue);
          font-weight: 700;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .upload-btn {
          background: var(--primary-blue);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.2s;
          box-shadow: 0 2px 4px rgba(41, 98, 255, 0.2);
        }

        .upload-btn:hover {
          background: var(--primary-hover);
          transform: translateY(-1px);
        }

        .upload-btn:active {
          transform: translateY(0);
        }

        .divider {
          height: 24px;
          width: 1px;
          background: var(--border-light);
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          background: #f1f5f9;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-medium);
          border: 1px solid var(--border-light);
        }

        .logout-btn {
          background: none;
          border: none;
          color: var(--text-light);
          padding: 8px;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
        }

        .logout-btn:hover {
          background: #ffebee;
          color: var(--status-error);
        }
      `}</style>
    </header>
  );
};

export default Header;
