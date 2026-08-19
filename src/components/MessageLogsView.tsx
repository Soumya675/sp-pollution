import React, { useState } from 'react';
import { MessageLog } from '../types';
import { MessageSquare, Search, Trash2, Clock, Phone, Car, User, Send, CheckCircle2 } from 'lucide-react';

interface MessageLogsViewProps {
  logs: MessageLog[];
  onClearLogs: () => void;
  onResendMessage: (log: MessageLog) => void;
}

export const MessageLogsView: React.FC<MessageLogsViewProps> = ({
  logs,
  onClearLogs,
  onResendMessage
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const filteredLogs = logs.filter(log => {
    if (!log) return false;
    const q = searchTerm.trim().toLowerCase();
    const nameStr = (log.customerName || '').toLowerCase();
    const vehStr = (log.vehicleNumber || '').toLowerCase();
    const mobStr = log.mobile || '';
    const msgStr = (log.message || '').toLowerCase();

    return (
      nameStr.includes(q) ||
      vehStr.includes(q) ||
      mobStr.includes(q) ||
      msgStr.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4" />
            <span>Message History & Delivery Logs</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Dispatched Messages ({logs.length})
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Audit trail of all WhatsApp and SMS messages dispatched to stored contacts.
          </p>
        </div>

        {logs.length > 0 && (
          <button
            onClick={() => setIsClearConfirmOpen(true)}
            className="bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-colors border border-slate-200"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs by Name, Mobile, Vehicle # or Text..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Logs Table / Grid */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-base">No Message Logs Available</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm ? `No logs match "${searchTerm}".` : 'Dispatched messages will appear here.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap">Timestamp</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Customer Name</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Vehicle #</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Mobile Number</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Channel</th>
                  <th className="py-3.5 px-4">Message Content</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.sentAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {log.customerName || log.vehicleNumber || 'Vehicle Owner'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {log.vehicleNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {log.mobile}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.channel === 'WhatsApp' ? 'bg-emerald-100 text-emerald-800' :
                        log.channel === 'SMS' ? 'bg-blue-100 text-blue-800' : 'bg-slate-800 text-white'
                      }`}>
                        {log.channel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={log.message}>
                      {log.message}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onResendMessage(log)}
                        className="text-blue-600 hover:text-blue-800 font-bold hover:underline cursor-pointer"
                      >
                        Resend
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CLEAR LOGS CONFIRMATION MODAL */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Clear All Dispatched Message Logs?</h3>
                <p className="text-xs text-slate-500">This action will delete all {logs.length} message log records from your database history.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearLogs();
                  setIsClearConfirmOpen(false);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
              >
                Yes, Clear All Logs
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
