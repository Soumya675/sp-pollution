import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Download, 
  Smartphone, 
  CheckCircle2, 
  X, 
  Share2, 
  PlusSquare, 
  Laptop, 
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  QrCode,
  Copy,
  Check,
  MessageCircle,
  ExternalLink
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'direct' | 'phone_qr' | 'iphone'>('direct');

  // Get current app URL
  const appUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : 'https://ais-dev-uyrk7zs24jk2gdtxt3l2qa-432587357165.asia-southeast1.run.app';

  useEffect(() => {
    // Check if running as standalone PWA
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);
    if (iosDevice) {
      setActiveTab('iphone');
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setTimeout(() => {
        onClose();
      }, 2500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onClose]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('Install prompt error:', err);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendToWhatsApp = () => {
    const text = encodeURIComponent(`🚗 *SP Vehicle Messaging & Pollution Centre App*\n\nTap this link and select *Add to Home Screen / Install App* to put the app icon directly on your phone:\n${appUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 text-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative overflow-hidden my-auto max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors z-10 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-600/30 border border-blue-400/30 shrink-0">
            <Smartphone className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-amber-400 text-[10px] sm:text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Dedicated Phone & PC App</span>
            </div>
            <h3 className="text-base sm:text-xl font-black text-white leading-tight">
              Use as Installed App (No Searching Links)
            </h3>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-950/70 border border-blue-800/60 p-3 rounded-2xl mb-4 text-xs text-blue-200 flex items-start gap-2.5">
          <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Install this app once on your <strong className="text-white">Phone Home Screen</strong> or <strong className="text-white">Computer Desktop</strong>. An actual app icon will appear on your phone, and you can tap it directly to open anytime without opening browser links!
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 mb-4 text-xs font-extrabold">
          <button
            onClick={() => setActiveTab('direct')}
            className={`flex-1 py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'direct'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Google / Android</span>
          </button>

          <button
            onClick={() => setActiveTab('phone_qr')}
            className={`flex-1 py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'phone_qr'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan QR Code</span>
          </button>

          <button
            onClick={() => setActiveTab('iphone')}
            className={`flex-1 py-2 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'iphone'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iPhone / iPad</span>
          </button>
        </div>

        {/* Tab 1: Google / Android Direct Install */}
        {activeTab === 'direct' && (
          <div className="space-y-4">
            {isInstalled ? (
              <div className="bg-emerald-950/80 border border-emerald-700/60 p-5 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="font-extrabold text-emerald-200 text-base">App Downloaded & Installed!</h4>
                <p className="text-xs text-emerald-300/80">
                  Google Play Services has added the "SP Vehicle" app icon to your phone app drawer.
                </p>
              </div>
            ) : isStandalone ? (
              <div className="bg-emerald-950/80 border border-emerald-700/60 p-5 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="font-extrabold text-emerald-200 text-base">Running in Standalone App Mode</h4>
                <p className="text-xs text-slate-300">
                  This app is currently running installed on your device with full screen and no search links needed!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-slate-200 text-sm flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      <span>Download on Google Chrome (Android & PC)</span>
                    </h4>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold uppercase">
                      Google WebAPK
                    </span>
                  </div>
                  
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    When you install through Google Chrome, Google Play Services automatically generates and installs the native Android application (<code className="text-amber-300">com.spvehicle.messaging</code>) directly to your home screen!
                  </p>

                  <div className="space-y-2 text-slate-300 pt-1">
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600/40 text-blue-300 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                      <span>Click the <strong className="text-amber-300">"Download / Install Now"</strong> button below (or tap Chrome's top right <strong>⋮</strong> menu).</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600/40 text-blue-300 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                      <span>Select <strong className="text-white">"Install app"</strong> / <strong className="text-white">"Add to Home screen"</strong>.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-600/40 text-blue-300 font-bold flex items-center justify-center text-[10px] shrink-0">3</span>
                      <span>Google installs the <strong>SP Vehicle</strong> app on your home screen with offline database support.</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleInstallClick}
                  disabled={!deferredPrompt}
                  className={`w-full py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg transition-all ${
                    deferredPrompt
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30 cursor-pointer'
                      : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>{deferredPrompt ? 'Download & Install via Google (1-Tap)' : 'Tap Chrome Menu (⋮) > "Install App"'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Scan QR Code to Open on Mobile */}
        {activeTab === 'phone_qr' && (
          <div className="space-y-4 text-center">
            <p className="text-xs text-slate-300 font-medium">
              Point your <strong className="text-white">Phone Camera</strong> at this QR code to open the app on your mobile and tap "Add to Home Screen":
            </p>

            <div className="bg-white p-4 rounded-2xl inline-block shadow-xl border-4 border-blue-500/30 mx-auto">
              <QRCodeSVG
                value={appUrl}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
              <button
                onClick={handleCopyLink}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-blue-400" />}
                <span>{copied ? 'Link Copied!' : 'Copy Direct App Link'}</span>
              </button>

              <button
                onClick={handleSendToWhatsApp}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send to My WhatsApp</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: iPhone / iPad Guide */}
        {activeTab === 'iphone' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              To install this app on your <strong className="text-white">iPhone or iPad</strong> without the App Store:
            </p>

            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 space-y-3.5 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-300 font-black flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="text-slate-300">
                  Open this website in <strong className="text-white">Safari</strong>, then tap the <strong className="text-white inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded text-[11px]"><Share2 className="w-3 h-3 text-blue-400" /> Share</strong> button in the bottom toolbar.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-300 font-black flex items-center justify-center shrink-0">
                  2
                </div>
                <div className="text-slate-300">
                  Scroll down the share sheet and tap <strong className="text-amber-300 inline-flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded text-[11px]"><PlusSquare className="w-3 h-3 text-emerald-400" /> Add to Home Screen</strong>.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-300 font-black flex items-center justify-center shrink-0">
                  3
                </div>
                <div className="text-slate-300">
                  Tap <strong className="text-emerald-400 bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">Add</strong> at the top right. The <strong>SP Vehicle</strong> app icon will now appear on your iPhone screen!
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Got it, Done!
            </button>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-800 text-center">
          <span className="text-[10px] text-slate-500 flex items-center justify-center gap-1 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            SP Pollution Testing Centre • Bhubaneswar
          </span>
        </div>

      </div>
    </div>
  );
};

