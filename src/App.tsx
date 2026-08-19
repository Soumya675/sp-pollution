import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CustomerMessagingView } from './components/CustomerMessagingView';
import { MessageLogsView } from './components/MessageLogsView';
import { AdminPanelView } from './components/AdminPanelView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { InstallAppModal } from './components/InstallAppModal';
import { RealTimeInstallBanner } from './components/RealTimeInstallBanner';
import { LocationGate, LocationData } from './components/LocationGate';
import { CustomerRecord, MessageLog, DeviceSession, UserAuth } from './types';
import { 
  getLocalCustomers, 
  saveLocalCustomers, 
  getLocalLogs, 
  saveLocalLogs,
  exportBackupJSON,
  importBackupJSON,
  exportBackupCSV,
  importBackupCSV,
  generateBatchData
} from './storage';
import { 
  subscribeToCustomers, 
  subscribeToLogs, 
  subscribeToSessions,
  saveCustomerToCloud, 
  deleteCustomerFromCloud, 
  syncBulkCustomersToCloud, 
  saveLogToCloud,
  saveSessionToCloud,
  updateSessionHeartbeat,
  updateSessionStatus
} from './firebase';

const AUTH_STORAGE_KEY = 'sp_admin_auth_v3';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('contacts');
  const [isInstallOpen, setIsInstallOpen] = useState<boolean>(false);
  const [customers, setCustomers] = useState<CustomerRecord[]>(() => {
    const raw = getLocalCustomers();
    return [...raw].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  });
  const [logs, setLogs] = useState<MessageLog[]>(() => getLocalLogs());
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [verifiedLocation, setVerifiedLocation] = useState<LocationData | null>(null);

  // User auth state: Starts as Operator; Admin role can be unlocked with passcode SP@123
  const [userAuth, setUserAuth] = useState<UserAuth>(() => {
    const deviceId = localStorage.getItem('sp_device_id') || `dev-${Date.now()}`;
    if (!localStorage.getItem('sp_device_id')) {
      localStorage.setItem('sp_device_id', deviceId);
    }
    const sessionId = localStorage.getItem('sp_current_session_id') || `sess-${Date.now()}`;
    localStorage.setItem('sp_current_session_id', sessionId);

    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          deviceId,
          sessionId
        };
      }
    } catch (e) {
      console.error('Error reading auth state:', e);
    }

    return {
      isLoggedIn: true,
      operatorName: 'Terminal Operator',
      role: 'Operator',
      sessionId,
      deviceId
    };
  });

  // Sync auth state to local storage
  useEffect(() => {
    if (userAuth) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userAuth));
    }
  }, [userAuth]);

  // Sync state to local storage backup on every state change
  useEffect(() => {
    saveLocalCustomers(customers);
  }, [customers]);

  useEffect(() => {
    saveLocalLogs(logs);
  }, [logs]);

  // Subscribe to Firebase Firestore Real-Time Updates
  useEffect(() => {
    setIsLoading(true);
    
    // Subscribe to Customers collection
    const unsubCustomers = subscribeToCustomers((cloudCustomers) => {
      setIsLoading(false);
      if (cloudCustomers && cloudCustomers.length > 0) {
        // Ensure customers are sorted with newly entered records (today) at the very top
        const sorted = [...cloudCustomers].sort((a, b) => 
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setCustomers(sorted);
        saveLocalCustomers(sorted);
      } else {
        // If Firestore is empty, seed initial local customers into Firestore so all devices get them!
        const local = getLocalCustomers();
        if (local && local.length > 0) {
          syncBulkCustomersToCloud(local).catch(err => console.error('Cloud seed error:', err));
        }
      }
    });

    // Subscribe to Message Logs collection
    const unsubLogs = subscribeToLogs((cloudLogs) => {
      if (cloudLogs && cloudLogs.length > 0) {
        setLogs(cloudLogs);
        saveLocalLogs(cloudLogs);
      } else {
        const localLogs = getLocalLogs();
        if (localLogs && localLogs.length > 0) {
          localLogs.forEach(log => saveLogToCloud(log).catch(() => {}));
        }
      }
    });

    // Subscribe to Device Sessions collection
    const unsubSessions = subscribeToSessions((cloudSessions) => {
      setSessions(cloudSessions);

      // Real-time remote kick check: If Admin removed / terminated this session remotely
      if (userAuth.sessionId) {
        const mySession = cloudSessions.find(s => s.id === userAuth.sessionId);
        if (mySession && (mySession.status === 'Terminated' || mySession.status === 'Logged Out')) {
          console.warn('Current session was terminated remotely by Admin.');
          alert('SECURITY NOTICE: Your terminal session has been removed / terminated by the Administrator.');
          // Generate new session ID and reset role
          const newSessionId = `sess-${Date.now()}`;
          localStorage.setItem('sp_current_session_id', newSessionId);
          setUserAuth(prev => ({
            ...prev,
            role: 'Operator',
            operatorName: 'Terminal Operator',
            sessionId: newSessionId
          }));
          setActiveTab('contacts');
        }
      }
    });

    return () => {
      unsubCustomers();
      unsubLogs();
      unsubSessions();
    };
  }, [userAuth.sessionId]);

  // Register session with verified GPS location in Cloud Firestore
  useEffect(() => {
    if (!verifiedLocation) return;

    const ua = navigator.userAgent;
    let browser = 'Chrome';
    let os = 'Windows';
    if (ua.includes('Win')) os = 'Windows PC';
    else if (ua.includes('Mac')) os = 'MacOS';
    else if (ua.includes('Android')) os = 'Android Mobile';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS Mobile';

    if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Firefox')) browser = 'Firefox';

    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    const now = new Date().toISOString();
    const currentSession: DeviceSession = {
      id: userAuth.sessionId,
      deviceId: userAuth.deviceId,
      operatorName: userAuth.role === 'Admin' ? 'Authorized Administrator' : userAuth.operatorName,
      role: userAuth.role,
      deviceName: `${userAuth.role === 'Admin' ? 'Admin' : 'Operator'} Terminal (${os})`,
      browserInfo: `${browser} on ${os}`,
      loginTime: now,
      lastActive: now,
      status: 'Active',
      location: verifiedLocation.locationName,
      latitude: verifiedLocation.latitude,
      longitude: verifiedLocation.longitude,
      ip: verifiedLocation.ip,
      installedAsApp: Boolean(isStandaloneMode),
      appMode: isStandaloneMode ? 'PWA Standalone' : 'Web Browser'
    };

    saveSessionToCloud(currentSession).catch(err => console.error('Failed saving session:', err));

    const timer = setInterval(() => {
      updateSessionHeartbeat(userAuth.sessionId).catch(() => {});
    }, 30000);

    return () => clearInterval(timer);
  }, [verifiedLocation, userAuth.role, userAuth.sessionId]);

  // Handle Real-Time App Installation Event
  const handleAppInstalled = () => {
    if (userAuth.sessionId && verifiedLocation) {
      saveSessionToCloud({
        id: userAuth.sessionId,
        deviceId: userAuth.deviceId,
        operatorName: userAuth.role === 'Admin' ? 'Authorized Administrator' : userAuth.operatorName,
        role: userAuth.role,
        deviceName: `Installed PWA App`,
        browserInfo: `PWA Standalone on Device`,
        loginTime: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        status: 'Active',
        location: verifiedLocation.locationName,
        latitude: verifiedLocation.latitude,
        longitude: verifiedLocation.longitude,
        ip: verifiedLocation.ip,
        installedAsApp: true,
        appMode: 'PWA Standalone'
      }).catch(() => {});
    }
  };

  // Admin Passcode Unlock
  const handleAdminUnlock = (passcode: string): boolean => {
    if (passcode.trim() === 'SP@123') {
      setUserAuth(prev => ({
        ...prev,
        role: 'Admin',
        operatorName: 'Authorized Administrator'
      }));
      return true;
    }
    return false;
  };

  // Log Out Admin Session
  const handleLogoutCurrentSession = async () => {
    if (userAuth.sessionId) {
      try {
        await updateSessionStatus(userAuth.sessionId, 'Logged Out');
      } catch (err) {
        console.error('Error logging out:', err);
      }
    }
    const newSessionId = `sess-${Date.now()}`;
    localStorage.setItem('sp_current_session_id', newSessionId);
    setUserAuth(prev => ({
      ...prev,
      role: 'Operator',
      operatorName: 'Terminal Operator',
      sessionId: newSessionId
    }));
    setActiveTab('contacts');
  };

  // Add Customer Vehicle Record (New records added stay at the top!)
  const handleAddCustomer = async (newCust: { name?: string; mobile: string; vehicleNumber: string; pucExpiryDate?: string; notes?: string }) => {
    const normalizedVeh = newCust.vehicleNumber.trim().toUpperCase();
    const isDuplicate = customers.some(c => c.vehicleNumber.trim().toUpperCase() === normalizedVeh);
    if (isDuplicate) {
      alert(`This vehicle number is already present (${normalizedVeh})`);
      return;
    }

    const newItem: CustomerRecord = {
      id: `cust-${Date.now()}`,
      name: newCust.name ? newCust.name.trim() : undefined,
      mobile: newCust.mobile.replace(/[^0-9]/g, ''),
      vehicleNumber: normalizedVeh,
      pucExpiryDate: newCust.pucExpiryDate ? newCust.pucExpiryDate.trim() : '',
      notes: newCust.notes ? newCust.notes.trim() : '',
      createdAt: new Date().toISOString()
    };

    setCustomers(prev => [newItem, ...prev]);

    try {
      await saveCustomerToCloud(newItem);
    } catch (err) {
      console.error('Saved to local fallback:', err);
    }
  };

  // Update Customer Vehicle Record
  const handleUpdateCustomer = async (id: string, updatedCust: { name?: string; mobile: string; vehicleNumber: string; pucExpiryDate?: string; notes?: string }) => {
    const normalizedVeh = updatedCust.vehicleNumber.trim().toUpperCase();
    const isDuplicate = customers.some(c => c.id !== id && c.vehicleNumber.trim().toUpperCase() === normalizedVeh);
    if (isDuplicate) {
      alert(`This vehicle number is already present (${normalizedVeh})`);
      return;
    }

    let updatedRecord: CustomerRecord | null = null;
    const existing = customers.find(c => c.id === id);
    if (existing) {
      updatedRecord = {
        ...existing,
        name: updatedCust.name !== undefined ? (updatedCust.name ? updatedCust.name.trim() : undefined) : existing.name,
        mobile: updatedCust.mobile.replace(/[^0-9]/g, ''),
        vehicleNumber: normalizedVeh,
        pucExpiryDate: updatedCust.pucExpiryDate !== undefined ? updatedCust.pucExpiryDate.trim() : existing.pucExpiryDate,
        notes: updatedCust.notes !== undefined ? updatedCust.notes.trim() : existing.notes,
        createdAt: new Date().toISOString()
      };
      setCustomers(prev => [updatedRecord!, ...prev.filter(c => c.id !== id)]);
    }

    if (updatedRecord) {
      try {
        await saveCustomerToCloud(updatedRecord);
      } catch (err) {
        console.error('Error updating customer in cloud:', err);
      }
    }
  };

  // Delete Customer Record
  const handleDeleteCustomer = async (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    try {
      await deleteCustomerFromCloud(id);
    } catch (err) {
      console.error('Error deleting customer from cloud:', err);
    }
  };

  // Dispatch / Send Message (Stores in message history + returns logs)
  const handleSendMessage = async (customerIds: string[], channel: 'WhatsApp' | 'SMS' | 'Both', message: string) => {
    const selected = customers.filter(c => customerIds.includes(c.id));
    
    // Create immediate local logs
    const newLogs: MessageLog[] = selected.map(c => {
      const displayName = c.name ? c.name : `Vehicle Owner (${c.vehicleNumber})`;
      const formattedMsg = message
        .replace(/{name}/g, displayName)
        .replace(/{vehicleNumber}/g, c.vehicleNumber)
        .replace(/{mobile}/g, c.mobile)
        .replace(/{pucExpiryDate}/g, c.pucExpiryDate || 'N/A');

      return {
        id: `msg-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        customerName: c.name || c.vehicleNumber,
        vehicleNumber: c.vehicleNumber,
        mobile: c.mobile,
        channel,
        message: formattedMsg,
        sentAt: new Date().toISOString(),
        status: 'Delivered'
      };
    });

    setLogs(prev => [...newLogs, ...prev]);

    // Save logs to cloud database
    for (const log of newLogs) {
      try {
        await saveLogToCloud(log);
      } catch (err) {
        console.error('Failed saving log to cloud:', err);
      }
    }
  };

  // Clear Message Logs
  const handleClearLogs = async () => {
    setLogs([]);
    saveLocalLogs([]);
  };

  // Resend single message
  const handleResendMessage = (log: MessageLog) => {
    const matchingCust = customers.find(c => c.mobile === log.mobile || c.vehicleNumber === log.vehicleNumber);
    if (matchingCust) {
      handleSendMessage([matchingCust.id], log.channel, log.message);
    } else {
      const resendLog: MessageLog = {
        id: `msg-${Date.now()}`,
        customerName: log.customerName,
        vehicleNumber: log.vehicleNumber,
        mobile: log.mobile,
        channel: log.channel,
        message: log.message,
        sentAt: new Date().toISOString(),
        status: 'Delivered'
      };
      setLogs(prev => [resendLog, ...prev]);
      saveLogToCloud(resendLog).catch(() => {});
    }
  };

  // Import Database Backup JSON
  const handleImportDatabase = (jsonText: string) => {
    const result = importBackupJSON(jsonText);
    if (result.success) {
      const updatedCusts = getLocalCustomers();
      const sorted = [...updatedCusts].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setCustomers(sorted);
      syncBulkCustomersToCloud(sorted).catch(err => console.error('Cloud sync error:', err));
    }
    return result;
  };

  // Import Database Backup CSV
  const handleImportCSV = (csvText: string) => {
    const result = importBackupCSV(csvText);
    if (result.success) {
      const updatedCusts = getLocalCustomers();
      const sorted = [...updatedCusts].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setCustomers(sorted);
      syncBulkCustomersToCloud(sorted).catch(err => console.error('Cloud sync error:', err));
    }
    return result;
  };

  // Generate 1,000 Sample Records Batch
  const handleGenerateBatch = (count: number = 1000) => {
    const result = generateBatchData(count);
    const updatedCusts = getLocalCustomers();
    const sorted = [...updatedCusts].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    setCustomers(sorted);
    syncBulkCustomersToCloud(sorted).catch(err => console.error('Cloud sync error:', err));
    return result;
  };

  const activeDeviceCount = sessions.filter(s => s.status === 'Active').length || 1;

  return (
    <LocationGate onLocationVerified={(loc) => setVerifiedLocation(loc)}>
      <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col selection:bg-blue-600 selection:text-white">
        
        {/* Navbar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          contactCount={customers.length}
          logCount={logs.length}
          activeDeviceCount={activeDeviceCount}
          userLocation={verifiedLocation}
          userAuth={userAuth}
          onOpenAdmin={() => setActiveTab('admin')}
          onOpenInstall={() => setIsInstallOpen(true)}
        />

        {/* Main Container */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
          {activeTab === 'contacts' && (
            <CustomerMessagingView
              customers={customers}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onSendMessage={handleSendMessage}
              onExportBackup={exportBackupJSON}
              onImportBackup={handleImportDatabase}
              onExportCSV={exportBackupCSV}
              onImportCSV={handleImportCSV}
              onGenerateBatch={handleGenerateBatch}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'logs' && (
            <MessageLogsView
              logs={logs}
              onClearLogs={handleClearLogs}
              onResendMessage={handleResendMessage}
            />
          )}

          {activeTab === 'admin' && (
            <AdminPanelView
              sessions={sessions}
              currentAuth={userAuth}
              onLogoutCurrentSession={handleLogoutCurrentSession}
              onAdminLogin={handleAdminUnlock}
            />
          )}
        </main>

        {/* Mobile Native App Bottom Navigation */}
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          contactCount={customers.length}
          logCount={logs.length}
          activeDeviceCount={activeDeviceCount}
          userAuth={userAuth}
          onOpenInstall={() => setIsInstallOpen(true)}
        />

        {/* Real-Time Floating App Install Banner */}
        <RealTimeInstallBanner
          onOpenModalGuide={() => setIsInstallOpen(true)}
          onAppInstalled={handleAppInstalled}
        />

        {/* PWA App Install Modal */}
        <InstallAppModal
          isOpen={isInstallOpen}
          onClose={() => setIsInstallOpen(false)}
        />

        {/* Footer */}
        <Footer />

      </div>
    </LocationGate>
  );
}



