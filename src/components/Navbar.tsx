import React from 'react';
import { MessageSquare, Users, Clock, Send, Car, ShieldCheck, Award, MapPin, Laptop, Lock, UserCheck } from 'lucide-react';
import { LocationData } from './LocationGate';
import { UserAuth } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  contactCount: number;
  logCount: number;
  activeDeviceCount: number;
  userLocation?: LocationData | null;
  userAuth?: UserAuth | null;
  onOpenAdmin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  contactCount,
  logCount,
  activeDeviceCount,
  userLocation,
  userAuth,
  onOpenAdmin
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      {/* Top Strip */}
      <div className="bg-slate-800 text-slate-300 px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs font-medium flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/80">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-emerald-600/90 text-white px-2 py-0.5 rounded text-[10px] sm:text-[11px] uppercase tracking-wider font-extrabold flex items-center gap-1 border border-emerald-400/40 shrink-0 whitespace-nowrap">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
            <span>Govt. Approved Centre</span>
          </span>
          <span className="hidden sm:inline text-slate-300 font-semibold truncate max-w-xs md:max-w-md">
            SP Pollution Testing Centre • Near Nayapalli Footover Bridge
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-slate-400">
          {userLocation && (
            <span className="bg-emerald-950/90 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/60 font-semibold flex items-center gap-1 shrink-0 whitespace-nowrap" title={`GPS: ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)} • ${userLocation.locationName || ''}`}>
              <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Location Verified</span>
            </span>
          )}
          <span className="bg-blue-950/80 text-blue-300 px-2 py-0.5 rounded border border-blue-800/60 font-semibold flex items-center gap-1 shrink-0 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span>Live Cloud DB</span>
          </span>
          <span className="flex items-center gap-1 shrink-0 whitespace-nowrap">
            <Car className="w-3.5 h-3.5 text-blue-400 shrink-0" /> {contactCount}
          </span>
          <span className="flex items-center gap-1 shrink-0 whitespace-nowrap">
            <Send className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> {logCount}
          </span>
          <span className="flex items-center gap-1 bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded border border-purple-800/60 font-semibold shrink-0 whitespace-nowrap" title="Total active devices online">
            <Laptop className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Online: {activeDeviceCount}
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between min-h-16 py-2 gap-2 flex-wrap sm:flex-nowrap">
          
          {/* Brand Logo */}
          <div 
            onClick={() => setActiveTab('contacts')}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform border border-blue-400/30 shrink-0">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="font-extrabold text-base sm:text-lg md:text-xl tracking-tight text-white leading-tight">
                  SP VEHICLE MESSAGING
                </h1>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded uppercase hidden md:flex items-center gap-1 shrink-0 whitespace-nowrap">
                  <Award className="w-3 h-3 text-emerald-400" />
                  Govt. Authorized
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium hidden sm:block">
                Customer Reminder & Automated Dispatch Portal
              </p>
            </div>
          </div>

          {/* Nav Links */}
          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0">
            <nav className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm font-medium">
              <button
                onClick={() => setActiveTab('contacts')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTab === 'contacts'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline">Contacts & Messenger</span>
                <span className="sm:hidden">Contacts</span>
                <span className="bg-slate-800 text-slate-300 text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full font-mono">
                  {contactCount}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('logs')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTab === 'logs'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="hidden sm:inline">Sent History</span>
                <span className="sm:hidden">History</span>
                <span className="bg-slate-800 text-slate-300 text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded-full font-mono">
                  {logCount}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('admin');
                  if (onOpenAdmin) onOpenAdmin();
                }}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline">Admin Panel</span>
                <span className="sm:hidden">Admin</span>
                <span className="bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {activeDeviceCount}
                </span>
              </button>
            </nav>

            {/* Admin Badge */}
            {userAuth?.role === 'Admin' && (
              <div className="pl-1 sm:pl-2 border-l border-slate-700 shrink-0">
                <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-700/60 text-emerald-300 rounded-xl text-[11px] font-extrabold flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Admin Active</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

