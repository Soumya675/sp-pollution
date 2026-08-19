import React, { useState, useEffect } from 'react';
import { Download, Sparkles, X, Smartphone, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface RealTimeInstallBannerProps {
  onOpenModalGuide: () => void;
  onAppInstalled?: () => void;
}

export const RealTimeInstallBanner: React.FC<RealTimeInstallBannerProps> = ({
  onOpenModalGuide,
  onAppInstalled
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isInstalledJustNow, setIsInstalledJustNow] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    // Check if dismissed in current session
    const dismissed = sessionStorage.getItem('sp_install_banner_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }

    // Check standalone mode
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    // Check iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    // Capture Real-Time Install Prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Capture App Installed Event
    const handleAppInstalled = () => {
      setIsInstalledJustNow(true);
      setDeferredPrompt(null);
      if (onAppInstalled) onAppInstalled();
      setTimeout(() => {
        setIsDismissed(true);
      }, 3500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onAppInstalled]);

  const handleInstantInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalledJustNow(true);
          if (onAppInstalled) onAppInstalled();
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Install execution failed:', err);
        onOpenModalGuide();
      }
    } else {
      onOpenModalGuide();
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('sp_install_banner_dismissed', 'true');
  };

  // If already running in standalone app mode or dismissed by user
  if (isStandalone || (isDismissed && !isInstalledJustNow)) {
    return null;
  }

  return (
    <div className="fixed bottom-16 md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-300">
      {isInstalledJustNow ? (
        <div className="bg-emerald-900/95 border-2 border-emerald-500 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-300 shrink-0 animate-bounce" />
          <div className="flex-1">
            <h4 className="text-sm font-black text-white">App Installed Successfully!</h4>
            <p className="text-xs text-emerald-200">
              Launch directly from your Home Screen or Apps list anytime.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/95 border border-amber-500/50 text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl shadow-black/60 backdrop-blur-md flex flex-col sm:flex-row items-center gap-3">
          
          {/* Icon and Text */}
          <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shrink-0 border border-amber-300/40">
              <Smartphone className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                <Zap className="w-3 h-3 fill-current" />
                <span>Instant App Access</span>
              </div>
              <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">
                Install SP Vehicle App
              </h4>
              <p className="text-[11px] text-slate-300 leading-tight line-clamp-1">
                {isIOS ? 'Add to Home Screen for full screen mode' : '1-Tap launch • Offline mode • No browser bar'}
              </p>
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={handleDismiss}
              className="sm:hidden p-1 text-slate-400 hover:text-white rounded-lg"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={handleInstantInstall}
              className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{deferredPrompt ? 'Install Now' : 'Get App'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Desktop Close */}
            <button
              onClick={handleDismiss}
              className="hidden sm:block p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
