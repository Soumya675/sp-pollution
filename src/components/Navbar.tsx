import React from 'react';
import { MessageSquare, Users, Clock, Send, Car, ShieldCheck, Award, Laptop, Lock, UserCheck, LogOut } from 'lucide-react';
import { UserAuth } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  contactCount: number;
  logCount: number;
  activeDeviceCount: number;
  activeOperatorCount: number;
  userAuth: UserAuth | null;
  onOpenLogin: (role?: 'Operator' | 'Admin') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  contactCount,
  logCount,
  activeDeviceCount,
  activeOperatorCount,
  userAuth,
  onOpenLogin
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      {/* Top Strip */}
      <div className="bg-slate-800 text-slate-300 px-4 py-1.5 text-xs font-medium flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/80">
        <div className="flex items-center gap-2">
          <span className="bg-emerald-600/90 text-white px-2 py-0.5 rounded text-[11px] uppercase tracking-wider font-extrabold flex items-center gap-1 border border-emerald-400/40">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
            <span>Govt. Approved Centre</span>
          </span>
          <span className="hidden sm:inline text-slate-300 font-semibold">
            SP Pollution Testing Centre • Near Nayapalli Footover Bridge
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="bg-blue-950/80 text-blue-300 px-2 py-0.5 rounded border border-blue-800/60 font-semibold flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Cloud DB Active</span>
          </span>
          <span className="flex items-center gap-1">
            <Car className="w-3.5 h-3.5 text-blue-400" /> Contacts: {contactCount}
          </span>
          <span className="flex items-center gap-1">
            <Send className="w-3.5 h-3.5 text-emerald-400" /> Sent: {logCount}
          </span>
          <span className="flex items-center gap-1 bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded border border-purple-800/60 font-semibold" title="Total active logged-in devices">
            <Laptop className="w-3.5 h-3.5 text-purple-400" /> Devices Online: {activeDeviceCount}
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          
          {/* Brand Logo */}
          <div 
            onClick={() => setActiveTab('contacts')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform border border-blue-400/30">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg sm:text-xl tracking-tight text-white leading-none">
                  SP VEHICLE MESSAGING
                </h1>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase hidden sm:flex items-center gap-1">
                  <Award className="w-3 h-3 text-emerald-400" />
                  Govt. Authorized
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium hidden sm:block">
                Customer Reminder & Automated Dispatch Portal
              </p>
            </div>
          </div>

          {/* Nav Links + User Auth Button */}
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1.5 text-sm font-medium">
              <button
                onClick={() => setActiveTab('contacts')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'contacts'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="hidden md:inline">Contacts & Messenger</span>
                <span className="md:hidden">Contacts</span>
                <span className="bg-slate-800 text-slate-300 text-[11px] px-2 py-0.5 rounded-full font-mono">
                  {contactCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('logs')}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'logs'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="hidden md:inline">Sent History</span>
                <span className="md:hidden">History</span>
                <span className="bg-slate-800 text-slate-300 text-[11px] px-2 py-0.5 rounded-full font-mono">
                  {logCount}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('admin');
                  if (userAuth?.role !== 'Admin') {
                    onOpenLogin('Admin');
                  }
                }}
                className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Lock className="w-4 h-4 text-emerald-400" />
                <span className="hidden md:inline">Admin Panel</span>
                <span className="md:hidden">Admin</span>
                <span className="bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {activeDeviceCount}
                </span>
              </button>
            </nav>

            {/* User Session Badge / Switch Button */}
            <div className="pl-2 border-l border-slate-700">
              {userAuth && userAuth.isLoggedIn ? (
                <button
                  onClick={() => onOpenLogin('Admin')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                  title="Click to manage admin session or switch account"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate max-w-[100px] sm:max-w-[130px] text-emerald-300">
                    {userAuth.operatorName}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => onOpenLogin('Admin')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Admin Login</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </header>
  );
};

