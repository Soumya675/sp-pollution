import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Laptop, 
  Smartphone, 
  Users, 
  LogOut, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Key, 
  Activity,
  Trash2,
  Lock,
  UserX,
  MapPin,
  Globe
} from 'lucide-react';
import { DeviceSession, UserAuth } from '../types';
import { updateSessionStatus, deleteSessionFromCloud, clearInactiveSessionsFromCloud, clearAllSessionsFromCloud } from '../firebase';

interface AdminPanelViewProps {
  sessions: DeviceSession[];
  currentAuth: UserAuth;
  onLogoutCurrentSession: () => void;
  onAdminLogin?: (passcode: string) => boolean;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({
  sessions,
  currentAuth,
  onLogoutCurrentSession,
  onAdminLogin
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'today' | 'ended'>('active');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [passError, setPassError] = useState<string | null>(null);

  // If user is NOT logged in as Admin, show Admin Lock Screen
  if (currentAuth.role !== 'Admin') {
    const handleVerifyAdmin = (e: React.FormEvent) => {
      e.preventDefault();
      setPassError(null);
      if (onAdminLogin) {
        const ok = onAdminLogin(adminPasscode);
        if (!ok) {
          setPassError('Invalid Admin Passcode.');
        }
      } else {
        if (adminPasscode.trim() === 'SP@123') {
          // Success handled in parent
          setPassError(null);
        } else {
          setPassError('Invalid Admin Passcode.');
        }
      }
    };

    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden text-slate-800 animate-in fade-in zoom-in duration-200">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 text-white text-center">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md border border-emerald-400/40">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-black">Admin Authorization Required</h2>
          <p className="text-xs text-slate-300 mt-1 font-medium">
            Single Admin Control System. Strictly restricted to authorized Administrators only.
          </p>
        </div>

        <form onSubmit={handleVerifyAdmin} className="p-6 space-y-4">
          {passError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{passError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Enter Admin Passcode
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={adminPasscode}
                onChange={(e) => setAdminPasscode(e.target.value)}
                placeholder="Enter Admin Passcode"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Unlock Admin Panel Access</span>
          </button>
        </form>
      </div>
    );
  }

  const activeSessions = sessions.filter(s => s.status === 'Active');
  const endedSessions = sessions.filter(s => s.status !== 'Active');

  // Calculate devices logged in today
  const todayStr = new Date().toDateString();
  const todaySessions = sessions.filter(s => {
    if (!s.loginTime) return false;
    try {
      return new Date(s.loginTime).toDateString() === todayStr;
    } catch {
      return false;
    }
  });

  const filteredSessions = sessions.filter(s => {
    if (filter === 'active') return s.status === 'Active';
    if (filter === 'today') {
      if (!s.loginTime) return false;
      try {
        return new Date(s.loginTime).toDateString() === todayStr;
      } catch {
        return false;
      }
    }
    if (filter === 'ended') return s.status !== 'Active';
    return true;
  });

  const handleTerminateSession = async (session: DeviceSession) => {
    if (window.confirm(`SECURITY WARNING: Are you sure you want to forcibly remove and log out device "${session.deviceName}" (Session ID: ${session.id})? This will immediately revoke its access.`)) {
      try {
        await updateSessionStatus(session.id, 'Terminated');
        setActionSuccess(`Device "${session.deviceName}" (Session ID: ${session.id}) was successfully removed and logged out remotely.`);
        setTimeout(() => setActionSuccess(null), 5000);

        // If terminating current device
        if (session.id === currentAuth.sessionId) {
          onLogoutCurrentSession();
        }
      } catch (err) {
        console.error('Error terminating session:', err);
      }
    }
  };

  const handleTerminateAllOtherSessions = async () => {
    const otherActive = activeSessions.filter(s => s.id !== currentAuth.sessionId);
    if (otherActive.length === 0) {
      alert('No other active device sessions found to revoke.');
      return;
    }
    if (window.confirm(`SECURITY ACTION: Are you sure you want to forcibly remove and log out ALL ${otherActive.length} other active devices remotely?`)) {
      try {
        for (const s of otherActive) {
          await updateSessionStatus(s.id, 'Terminated');
        }
        setActionSuccess(`Successfully removed and logged out all ${otherActive.length} other active device(s).`);
        setTimeout(() => setActionSuccess(null), 5000);
      } catch (err) {
        console.error('Error logging out sessions:', err);
      }
    }
  };

  const handleDeleteSessionRecord = async (sessionId: string) => {
    try {
      await deleteSessionFromCloud(sessionId);
      setActionSuccess('Session log record deleted.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error('Error deleting session log:', err);
    }
  };

  const handleClearInactiveSessions = async () => {
    if (window.confirm(`Are you sure you want to clear and delete all inactive and terminated session records from cloud storage?`)) {
      try {
        const cleared = await clearInactiveSessionsFromCloud();
        if (cleared > 0) {
          setActionSuccess(`Successfully cleared ${cleared} inactive session log(s) from cloud database.`);
        } else {
          setActionSuccess('No inactive session logs found in cloud database.');
        }
        setTimeout(() => setActionSuccess(null), 5000);
      } catch (err) {
        console.error('Error clearing inactive sessions:', err);
        alert('Failed to clear inactive sessions. Check console logs for details.');
      }
    }
  };

  const handleClearAllSessions = async () => {
    if (window.confirm(`DANGER ACTION: Are you sure you want to perform an ALL CLEAR on the session layer? This will permanently delete all session history records from cloud database (preserving your current active admin session).`)) {
      try {
        const count = await clearAllSessionsFromCloud(currentAuth.sessionId);
        if (count > 0) {
          setActionSuccess(`Session layer cleared! Deleted ${count} session record(s) from cloud database.`);
        } else {
          setActionSuccess('No other session records found to delete in cloud database.');
        }
        setTimeout(() => setActionSuccess(null), 5000);
      } catch (err) {
        console.error('Error clearing session layer:', err);
        alert('Failed to perform All Clear on session layer. Check console logs.');
      }
    }
  };

  const formatDate = (isoStr: string) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-700/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-md border border-emerald-400/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">Admin & Device Sessions Portal</h2>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase">
                Live Cloud Sync
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              Monitor active logged-in devices, view login/logout history, and manage multi-device sessions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {activeSessions.filter(s => s.id !== currentAuth.sessionId).length > 0 && (
            <button
              onClick={handleTerminateAllOtherSessions}
              className="px-3.5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 border border-amber-500/40 cursor-pointer"
              title="Force log out all other active operators remotely"
            >
              <UserX className="w-4 h-4" />
              <span>Log Out All Other Devices ({activeSessions.filter(s => s.id !== currentAuth.sessionId).length})</span>
            </button>
          )}

          <button
            onClick={onLogoutCurrentSession}
            className="px-3.5 py-2.5 bg-red-600/90 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 border border-red-500/40 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out Admin Device</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{actionSuccess}</span>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Devices Logged In Today */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Devices Logged In Today</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-2">
              {todaySessions.length}
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {todaySessions.filter(s => s.status === 'Active').length} Active
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">Logged in on {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Active Devices Online */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Active Devices Online</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-2">
              {activeSessions.length}
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Live
              </span>
            </h3>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">Concurrent active sessions</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Total Registered Sessions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Total Device History</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {sessions.length}
            </h3>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">Recorded in cloud history</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200">
            <Laptop className="w-6 h-6" />
          </div>
        </div>

        {/* Admin Passcode Config */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Single Admin Access</p>
            <h3 className="text-sm font-extrabold text-slate-900 mt-1 font-mono tracking-wider text-slate-800">
              ••••••••
            </h3>
            <p className="text-[10px] text-emerald-600 mt-1 font-extrabold">Protected Security Passcode</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Table Filter Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Laptop className="w-5 h-5 text-blue-600" />
              <span>Registered Devices & Session Logs</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Real-time Firestore tracking of devices. Admin can forcibly log out any unauthorized device.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                filter === 'active'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Active Only ({activeSessions.length})
            </button>

            <button
              onClick={() => setFilter('ended')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                filter === 'ended'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Not Active Only ({endedSessions.length})
            </button>

            <button
              onClick={() => setFilter('today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                filter === 'today'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Logged In Today ({todaySessions.length})
            </button>

            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All Sessions ({sessions.length})
            </button>

            <button
              onClick={handleClearInactiveSessions}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Permanently delete all inactive and terminated session logs from cloud"
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Clear Inactive ({endedSessions.length})</span>
            </button>

            <button
              onClick={handleClearAllSessions}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ml-auto"
              title="Wipe and clear all session layer records from cloud database"
            >
              <Trash2 className="w-3.5 h-3.5 text-white" />
              <span>All Clear Sessions</span>
            </button>
          </div>
        </div>

        {/* Device Sessions Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 whitespace-nowrap">Status</th>
                <th className="py-3 px-4 whitespace-nowrap">Operator Name & Session ID</th>
                <th className="py-3 px-4 whitespace-nowrap">User Location</th>
                <th className="py-3 px-4 whitespace-nowrap">Device & Browser</th>
                <th className="py-3 px-4 whitespace-nowrap">Login Time</th>
                <th className="py-3 px-4 whitespace-nowrap">Last Active</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Laptop className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-sm">No device sessions found for this filter.</p>
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s) => {
                  const isCurrentDevice = s.id === currentAuth.sessionId;
                  const isActive = s.status === 'Active';

                  return (
                    <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${isCurrentDevice ? 'bg-blue-50/40' : ''}`}>
                      
                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                            Active
                          </span>
                        ) : s.status === 'Terminated' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                            <XCircle className="w-3.5 h-3.5 text-red-600" />
                            Not Active (Terminated)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Not Active (Logged Out)
                          </span>
                        )}
                      </td>

                      {/* Operator & Role */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 flex items-center gap-2">
                          <span>{s.operatorName}</span>
                          {isCurrentDevice && (
                            <span className="bg-blue-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide">
                              This Device
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-semibold uppercase">
                            Role: {s.role}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono border border-slate-200" title={`Full ID: ${s.id}`}>
                            ID: {s.id.length > 15 ? s.id.substring(0, 14) + '...' : s.id}
                          </span>
                        </div>
                      </td>

                      {/* Location Column */}
                      <td className="py-3.5 px-4">
                        {s.location ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="truncate max-w-[180px]" title={s.location}>{s.location}</span>
                            </div>
                            {s.latitude !== undefined && s.longitude !== undefined && (
                              <a
                                href={`https://www.google.com/maps?q=${s.latitude},${s.longitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-mono font-medium"
                              >
                                <span>{s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}</span>
                                <span className="text-[9px] bg-blue-50 text-blue-700 px-1 rounded border border-blue-200">Map ↗</span>
                              </a>
                            )}
                            {s.ip && (
                              <div className="text-[9px] text-slate-400 font-mono">
                                IP: {s.ip}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-400 italic text-[11px]">
                            <Globe className="w-3.5 h-3.5 text-slate-300" />
                            <span>Location registering...</span>
                          </div>
                        )}
                      </td>

                      {/* Device & Browser */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          {s.browserInfo.toLowerCase().includes('android') || s.browserInfo.toLowerCase().includes('ios') || s.browserInfo.toLowerCase().includes('iphone') ? (
                            <Smartphone className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Laptop className="w-4 h-4 text-blue-600" />
                          )}
                          <span>{s.deviceName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {s.installedAsApp ? (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[9px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-1">
                              <Smartphone className="w-2.5 h-2.5 text-emerald-600" />
                              <span>Installed App</span>
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-semibold px-1.5 py-0.5 rounded">
                              {s.appMode || 'Web Browser'}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {s.browserInfo}
                        </p>
                      </td>

                      {/* Login Time */}
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        <div className="font-semibold text-[11px]">
                          {formatDate(s.loginTime)}
                        </div>
                      </td>

                      {/* Last Active */}
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        <div className="font-semibold text-[11px]">
                          {formatDate(s.lastActive)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isActive ? (
                          <button
                            onClick={() => handleTerminateSession(s)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold rounded-xl border border-red-200 transition-colors flex items-center gap-1 ml-auto cursor-pointer"
                            title={`Log out operator ${s.operatorName} (ID: ${s.id}) remotely`}
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Log Out Operator ID</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeleteSessionRecord(s.id)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors ml-auto cursor-pointer"
                            title="Delete session record log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span className="font-medium">
            * All device logins and logouts synchronize automatically across all active devices in real-time.
          </span>
          <span className="font-mono text-[11px] font-bold text-slate-600">
            SP Pollution Centre Multi-Device Manager
          </span>
        </div>

      </div>

    </div>
  );
};
