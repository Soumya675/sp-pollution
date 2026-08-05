import React from 'react';
import { MessageSquare, Users, Clock, Send, Phone, Car, ShieldCheck, Award } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  contactCount: number;
  logCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  contactCount,
  logCount
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
              <Send className="w-3.5 h-3.5 text-emerald-400" /> Messages Sent: {logCount}
            </span>
          </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
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
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                  <Award className="w-3 h-3 text-emerald-400" />
                  Govt. Authorized
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Customer Reminder & Automated Dispatch Portal
              </p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex items-center gap-2 text-sm font-medium">
            <button
              onClick={() => setActiveTab('contacts')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'contacts'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Contacts & Messenger</span>
              <span className="bg-slate-800 text-slate-300 text-[11px] px-2 py-0.5 rounded-full font-mono">
                {contactCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'logs'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Sent History</span>
              <span className="bg-slate-800 text-slate-300 text-[11px] px-2 py-0.5 rounded-full font-mono">
                {logCount}
              </span>
            </button>
          </nav>

        </div>
      </div>
    </header>
  );
};
