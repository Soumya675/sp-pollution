import React from 'react';
import { MessageSquare, ShieldCheck, MapPin } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-center sm:text-left">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <span className="font-extrabold text-white text-sm">SP Vehicle Messaging</span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Govt. Approved Pollution Testing Centre
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-amber-400" /> Near Nayapalli Footover Bridge
          </span>
        </div>

        <div className="text-slate-500 text-center sm:text-right">
          © {new Date().getFullYear()} SP Vehicle Messaging. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
