import React, { useState } from 'react';
import { Upload, LogOut, Bell, Search } from 'lucide-react';

const Header = ({ onUploadClick, onLogout, user = {}, currentView }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const isDashboard = !currentView || currentView === 'dashboard';

  const getInitials = (name) => {
      if (!name) return 'JD';
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const initials = getInitials(user.name);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20">
      {/* Left Side: Context / Breadcrumbs */}
      <div className="flex items-center gap-2">
         <div className="hidden md:flex items-center text-sm font-medium text-slate-500">
            <span className="text-slate-900">Cost Analytics</span>
         </div> {/* here we can type */}
      </div>

      {/* Right Side: Actions */}
      <div className="flex items-center gap-4">
        {/* Search - Only on Dashboard */}
        {isDashboard && (
        <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
                type="text" 
                placeholder="Search resources..." 
                className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64 transition-all"
            />
        </div>
        )}

        <button
          onClick={onUploadClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm"
        >
          <Upload size={16} />
          <span className="hidden sm:inline">Upload Data</span>
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1" />
        
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-full transition-colors relative"
          >
            <Bell size={20} />
          </button>

          {isNotifOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsNotifOpen(false)}></div>
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200/60 py-4 z-40">
                <div className="px-4 pb-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-800">Notifications</p>
                </div>
                <div className="flex flex-col items-center justify-center py-8 px-4">
                  <Bell size={28} className="text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500 font-medium">No new notifications</p>
                  <p className="text-xs text-slate-400 mt-0.5">You're all caught up!</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative">
            <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`flex items-center justify-center w-9 h-9 rounded-full border text-slate-600 font-medium transition-colors ${isProfileOpen ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-100 border-slate-200 hover:bg-slate-50'}`}
            >
                {initials}
            </button>

            {isProfileOpen && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsProfileOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-40">
                        <div className="px-4 py-2 border-b border-slate-50">
                            <p className="text-sm font-medium text-slate-900 truncate" title={user.name}>{user.name || 'Account'}</p>
                            <p className="text-xs text-slate-500 truncate" title={user.email}>{user.email || 'user@example.com'}</p>
                        </div>
                        <button 
                            onClick={onLogout}
                            className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors"
                        >
                            <LogOut size={14} />
                            Sign Out
                        </button>
                    </div>
                </>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;
