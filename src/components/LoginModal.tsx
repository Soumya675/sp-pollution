import React, { useState } from 'react';
import { Lock, ShieldCheck, UserCheck, Key, Laptop, Smartphone, AlertCircle } from 'lucide-react';
import { DeviceSession, UserAuth } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (authData: UserAuth, sessionData: DeviceSession) => void;
  onCancel?: () => void;
  activeSessions?: DeviceSession[];
  initialRole?: 'Operator' | 'Admin';
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLoginSuccess,
  onCancel,
  activeSessions = []
}) => {
  const [operatorName, setOperatorName] = useState('Administrator');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Detect device browser & OS
  const getBrowserInfo = () => {
    const ua = navigator.userAgent;
    let browser = 'Unknown Browser';
    let os = 'Unknown OS';

    if (ua.includes('Win')) os = 'Windows PC';
    else if (ua.includes('Mac')) os = 'MacOS';
    else if (ua.includes('Android')) os = 'Android Device';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS Device';
    else if (ua.includes('Linux')) os = 'Linux';

    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Firefox')) browser = 'Firefox';

    return `${browser} on ${os}`;
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedPass = passcode.trim();

    // Verification logic: Admin Passcode SP@123
    if (trimmedPass !== 'SP@123') {
      setError('Invalid Admin Passcode. Please try again.');
      return;
    }

    const sessionId = `sess-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Persistent device ID per browser
    let deviceId = localStorage.getItem('sp_device_id');
    if (!deviceId) {
      deviceId = `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('sp_device_id', deviceId);
    }

    const browserInfo = getBrowserInfo();
    const deviceName = `Admin Terminal (${browserInfo.split(' on ')[1] || 'Web'})`;
    const now = new Date().toISOString();

    const newSession: DeviceSession = {
      id: sessionId,
      deviceId,
      operatorName: operatorName.trim() || 'Administrator',
      role: 'Admin',
      deviceName,
      browserInfo,
      loginTime: now,
      lastActive: now,
      status: 'Active'
    };

    const authData: UserAuth = {
      isLoggedIn: true,
      operatorName: operatorName.trim() || 'Administrator',
      role: 'Admin',
      sessionId,
      deviceId
    };

    onLoginSuccess(authData, newSession);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white text-center relative">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg border border-blue-400/40">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">SP Vehicle Messaging Login</h2>
          <p className="text-xs text-slate-300 mt-1 font-medium">
            Multi-Device Concurrent Access & Session Portal
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Admin Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Administrator Name
            </label>
            <input
              type="text"
              required
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="e.g. System Administrator"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* PIN / Passcode */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Admin Passcode
              </label>
            </div>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter Admin Passcode"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Device Info Badge */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium">
              <Laptop className="w-4 h-4 text-slate-500" />
              <span>Current Device:</span>
            </span>
            <span className="font-mono font-bold text-slate-800 text-[11px] truncate max-w-[180px]">
              {getBrowserInfo()}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-1/3 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Log In as Admin</span>
            </button>
          </div>

          <p className="text-[10px] text-center text-slate-400 font-medium pt-1">
            * Single Admin System. All active device logins are monitored and controlled in real-time.
          </p>

        </form>
      </div>
    </div>
  );
};
