import React from 'react';
import { Users, Clock, Lock, Download, ShieldCheck } from 'lucide-react';
import { UserAuth } from '../types';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  contactCount: number;
  logCount: number;
  activeDeviceCount: number;
  userAuth: UserAuth | null;
  onOpenInstall: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  contactCount,
  logCount,
  activeDeviceCount,
  userAuth,
  onOpenInstall
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-white shadow-2xl px-2 py-1.5 pb-safe">
      <div className="grid grid-cols-4 items-center justify-around gap-1 max-w-lg mx-auto">
        
        {/* Contacts Tab */}
        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all relative ${
            activeTab === 'contacts'
              ? 'text-blue-400 bg-blue-950/60 font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Users className="w-5 h-5" />
            {contactCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-blue-600 text-white text-[9px] font-extrabold px-1 rounded-full min-w-[16px] text-center border border-slate-900">
                {contactCount > 999 ? '999+' : contactCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Contacts</span>
          {activeTab === 'contacts' && (
            <span className="w-4 h-1 bg-blue-500 rounded-full mt-0.5"></span>
          )}
        </button>

        {/* Sent History Tab */}
        <button
          onClick={() => setActiveTab('logs')}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all relative ${
            activeTab === 'logs'
              ? 'text-blue-400 bg-blue-950/60 font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Clock className="w-5 h-5" />
            {logCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-emerald-600 text-white text-[9px] font-extrabold px-1 rounded-full min-w-[16px] text-center border border-slate-900">
                {logCount > 999 ? '999+' : logCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">History</span>
          {activeTab === 'logs' && (
            <span className="w-4 h-1 bg-blue-500 rounded-full mt-0.5"></span>
          )}
        </button>

        {/* Admin Panel Tab */}
        <button
          onClick={() => setActiveTab('admin')}
          className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all relative ${
            activeTab === 'admin'
              ? 'text-emerald-400 bg-emerald-950/60 font-black'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <Lock className="w-5 h-5 text-emerald-400" />
            <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <span className="text-[10px] tracking-tight mt-0.5">Admin</span>
          {activeTab === 'admin' && (
            <span className="w-4 h-1 bg-emerald-500 rounded-full mt-0.5"></span>
          )}
        </button>

        {/* Install App Button */}
        <button
          onClick={onOpenInstall}
          className="flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 transition-all cursor-pointer"
          title="Install as Phone / PC App"
        >
          <div className="w-5 h-5 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
            <Download className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-bold tracking-tight mt-0.5">Get App</span>
        </button>

      </div>
    </div>
  );
};
