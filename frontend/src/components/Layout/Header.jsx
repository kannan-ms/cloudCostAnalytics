import React, { useState } from 'react';
import { Upload, LogOut, Bell, Search } from 'lucide-react';

const Header = ({ onUploadClick, onLogout, user = {} }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
            <span className="hover:text-slate-900 cursor-pointer transition-colors">Platform</span>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-900">Cost Analytics</span>
         </div>
      </div>

      {/* Right Side: Actions */}
      <div className="flex items-center gap-4">
        {/* Search - Visual Only for now */}
        <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
                type="text" 
                placeholder="Search resources..." 
                className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64 transition-all"
            />
        </div>

        <button
          onClick={onUploadClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm shadow-blue-600/20"
        >
          <Upload size={16} />
          <span className="hidden sm:inline">Upload Data</span>
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1" />
        
        <button className="p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-full transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
        </button>

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
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-1 animate-in fade-in slide-in-from-top-2 duration-200 z-40">
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
