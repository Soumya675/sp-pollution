import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  MapPin, 
  MapPinOff, 
  RefreshCw, 
  AlertOctagon, 
  Navigation, 
  CheckCircle2, 
  Lock,
  Compass,
  Building2,
  ExternalLink
} from 'lucide-react';

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  locationName?: string;
  ip?: string;
  timestamp: string;
}

interface LocationGateProps {
  children: React.ReactNode;
  onLocationVerified?: (loc: LocationData) => void;
}

export const LocationGate: React.FC<LocationGateProps> = ({ 
  children, 
  onLocationVerified 
}) => {
  const [status, setStatus] = useState<'IDLE' | 'CHECKING' | 'GRANTED' | 'DENIED'>('CHECKING');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [attemptCount, setAttemptCount] = useState<number>(0);

  const requestLocation = () => {
    setStatus('CHECKING');
    setErrorMessage('');

    if (!navigator.geolocation) {
      setStatus('DENIED');
      setErrorMessage('Geolocation is not supported by your current browser or device. GPS location is mandatory to access this portal.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        let placeName = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
        let detectedIp = '';

        // Reverse geocoding attempt (for user-friendly display)
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
            headers: { 'Accept-Language': 'en' }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              const parts = (data.display_name as string).split(',').slice(0, 3).join(', ');
              placeName = parts;
            }
          }
        } catch {
          // Fallback to coordinates
        }

        try {
          const ipRes = await fetch('https://api.ipify.org?format=json');
          if (ipRes.ok) {
            const ipData = await ipRes.json();
            detectedIp = ipData.ip || '';
          }
        } catch {
          // Fallback
        }

        const loc: LocationData = {
          latitude,
          longitude,
          accuracy,
          locationName: placeName,
          ip: detectedIp,
          timestamp: new Date().toISOString()
        };

        setLocationData(loc);
        setStatus('GRANTED');
        if (onLocationVerified) {
          onLocationVerified(loc);
        }
      },
      (error) => {
        setStatus('DENIED');
        if (error.code === error.PERMISSION_DENIED) {
          setErrorMessage('Location permission was denied. Under Government Transport Authority security protocols, access is strictly prohibited without live GPS authorization.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setErrorMessage('GPS / Location position unavailable. Please enable device location / GPS and try again.');
        } else if (error.code === error.TIMEOUT) {
          setErrorMessage('Location verification request timed out. Please check your network and GPS signal.');
        } else {
          setErrorMessage('GPS Location authorization failed. You cannot access the vehicle database without granting location access.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    requestLocation();
  }, [attemptCount]);

  // If Granted, render the actual app
  if (status === 'GRANTED' && locationData) {
    return <>{children}</>;
  }

  // If Checking / Requesting
  if (status === 'CHECKING') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full bg-blue-600/20 animate-ping"></div>
            <div className="relative w-20 h-20 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400">
              <Navigation className="w-9 h-9 animate-spin text-blue-400" style={{ animationDuration: '3s' }} />
            </div>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800/80 text-blue-400 text-[11px] font-extrabold uppercase tracking-wider mb-2">
              <Lock className="w-3.5 h-3.5" />
              <span>Mandatory Security Verification</span>
            </div>
            <h2 className="text-xl font-black text-white">
              Verifying Terminal Location...
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              SP Vehicle Messaging (Govt. Approved Pollution Testing Centre) requires active GPS location authorization before granting access.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl text-left space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Compass className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Prompting for Browser Location Permission</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Please click <strong className="text-blue-400">"Allow"</strong> when prompted by your browser to verify that you are authorized to operate this vehicle management portal.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Awaiting GPS signal acquisition...</span>
          </div>
        </div>
      </div>
    );
  }

  // If Denied or Blocked - Complete Lockout Screen
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
      <div className="max-w-lg w-full bg-slate-900 border-2 border-rose-900/60 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-fadeIn">
        
        {/* Red Shield Lock Icon */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-950/80 border-2 border-rose-600/60 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950/50">
          <MapPinOff className="w-10 h-10 text-rose-500" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950 border border-rose-700/60 text-rose-300 text-xs font-black uppercase tracking-wider mb-2">
            <AlertOctagon className="w-4 h-4 text-rose-400" />
            <span>Access Blocked • Location Denied</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Location Permission Required
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed font-medium">
            You cannot access the <strong className="text-white">SP Vehicle Messaging Portal</strong> because map/GPS location access was denied or disabled.
          </p>
        </div>

        {/* Reason Box */}
        <div className="bg-rose-950/40 border border-rose-900/60 p-4 rounded-2xl text-left space-y-2">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-rose-200 uppercase tracking-wide">
                Govt. Regulatory & Centre Security Policy
              </h4>
              <p className="text-xs text-rose-300/90 mt-1 leading-relaxed">
                {errorMessage || 'Access to customer vehicle data, registration numbers, and reminder dispatch is legally restricted to verified operators with live GPS coordinates.'}
              </p>
            </div>
          </div>
        </div>

        {/* How to Unlock Instructions */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-left space-y-2">
          <h4 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-400" />
            <span>How to Grant Access & Unlock:</span>
          </h4>
          <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside font-medium">
            <li>Click the <strong className="text-white">lock/tune icon 🔒</strong> in your browser's address bar.</li>
            <li>Change <strong className="text-white">"Location"</strong> from "Block" to <strong className="text-emerald-400">"Allow"</strong>.</li>
            <li>Click the blue button below to re-verify your map position.</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => setAttemptCount(prev => prev + 1)}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3.5 px-6 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
          >
            <MapPin className="w-4 h-4" />
            <span>Allow Map Location & Unlock Portal</span>
          </button>
          
          <p className="text-[11px] text-slate-500">
            SP Pollution Testing Centre • Near Nayapalli Footover Bridge, Bhubaneswar
          </p>
        </div>

      </div>
    </div>
  );
};
