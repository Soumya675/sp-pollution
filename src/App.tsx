import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CustomerMessagingView } from './components/CustomerMessagingView';
import { MessageLogsView } from './components/MessageLogsView';
import { AdminPanelView } from './components/AdminPanelView';
import { MobileBottomNav } from './components/MobileBottomNav';
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
        if (mySession && mySession.status === 'Terminated') {
          // Reset session and force new login
          alert('⚠️ Your active terminal session has been terminated by the Administrator.');
          const newSessionId = `sess-${Date.now()}`;
          localStorage.setItem('sp_current_session_id', newSessionId);
          setUserAuth(prev => ({
            ...prev,
            sessionId: newSessionId,
            role: 'Operator',
            operatorName: 'Terminal Operator'
          }));
          window.location.reload();
        }
      }
    });

    return () => {
      unsubCustomers();
      unsubLogs();
      unsubSessions();
    };
  }, [userAuth.sessionId]);

  // Register Device Session into Cloud once GPS Location is Verified
  useEffect(() => {
    if (!verifiedLocation || !userAuth.sessionId) return;

    const ua = navigator.userAgent;
    let deviceName = 'Desktop / Laptop';
    if (/Android/i.test(ua)) deviceName = 'Android Mobile';
    else if (/iPhone/i.test(ua)) deviceName = 'Apple iPhone';
    else if (/iPad/i.test(ua)) deviceName = 'Apple iPad';
    else if (/Macintosh/i.test(ua)) deviceName = 'Mac Computer';
    else if (/Windows/i.test(ua)) deviceName = 'Windows PC';

    let browserName = 'Web Browser';
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browserName = 'Google Chrome';
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browserName = 'Apple Safari';
    else if (/Edg/i.test(ua)) browserName = 'Microsoft Edge';
    else if (/Firefox/i.test(ua)) browserName = 'Mozilla Firefox';

    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    const currentSession: DeviceSession = {
      id: userAuth.sessionId,
      deviceId: userAuth.deviceId,
      operatorName: userAuth.role === 'Admin' ? 'Authorized Administrator' : userAuth.operatorName,
      role: userAuth.role,
      deviceName,
      browserInfo: `${browserName} (${navigator.platform || 'Platform'})`,
      loginTime: new Date().toISOString(),
      lastActive: new Date().toISOString(),
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
    setUserAuth({
      isLoggedIn: true,
      operatorName: 'Terminal Operator',
      role: 'Operator',
      sessionId: newSessionId,
      deviceId: localStorage.getItem('sp_device_id') || `dev-${Date.now()}`
    });
    setActiveTab('contacts');
  };

  // 1. Add Customer Record
  const handleAddCustomer = async (recordData: Omit<CustomerRecord, 'id' | 'createdAt'>) => {
    const cleanVehicleNum = recordData.vehicleNumber.trim().toUpperCase().replace(/\s+/g, '');
    const cleanMobile = recordData.mobile.trim().replace(/[^0-9]/g, '');

    const newRecord: CustomerRecord = {
      ...recordData,
      id: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      vehicleNumber: cleanVehicleNum,
      mobile: cleanMobile,
      createdAt: new Date().toISOString()
    };

    const updated = [newRecord, ...customers];
    setCustomers(updated);
    saveLocalCustomers(updated);

    try {
      await saveCustomerToCloud(newRecord);
    } catch (err) {
      console.error('Failed saving customer to Firestore:', err);
    }
  };

  // 2. Update Customer Record
  const handleUpdateCustomer = async (record: CustomerRecord) => {
    const cleanVehicleNum = record.vehicleNumber.trim().toUpperCase().replace(/\s+/g, '');
    const cleanMobile = record.mobile.trim().replace(/[^0-9]/g, '');

    const updatedRecord: CustomerRecord = {
      ...record,
      vehicleNumber: cleanVehicleNum,
      mobile: cleanMobile
    };

    const updated = customers.map(c => c.id === record.id ? updatedRecord : c);
    setCustomers(updated);
    saveLocalCustomers(updated);

    try {
      await saveCustomerToCloud(updatedRecord);
    } catch (err) {
      console.error('Failed updating customer in Firestore:', err);
    }
  };

  // 3. Delete Customer Record
  const handleDeleteCustomer = async (id: string) => {
    const updated = customers.filter(c => c.id !== id);
    setCustomers(updated);
    saveLocalCustomers(updated);

    try {
      await deleteCustomerFromCloud(id);
    } catch (err) {
      console.error('Failed deleting customer in Firestore:', err);
    }
  };

  // 4. Send Message (WhatsApp / SMS)
  const handleSendMessage = async (payload: { customerIds: string[]; channel: 'WhatsApp' | 'SMS'; message: string }) => {
    const { customerIds, channel, message } = payload;
    const selectedCustomers = customers.filter(c => customerIds.includes(c.id));
    const newLogs: MessageLog[] = [];

    selectedCustomers.forEach(cust => {
      const logItem: MessageLog = {
        id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        customerName: cust.name || cust.vehicleNumber,
        vehicleNumber: cust.vehicleNumber,
        mobile: cust.mobile,
        channel: channel,
        message: message,
        sentAt: new Date().toISOString(),
        status: 'Delivered'
      };
      newLogs.push(logItem);
    });

    const updatedLogs = [...newLogs, ...logs];
    setLogs(updatedLogs);
    saveLocalLogs(updatedLogs);

    newLogs.forEach(log => {
      saveLogToCloud(log).catch(err => console.error('Cloud log sync error:', err));
    });

    return newLogs;
  };

  // 5. Clear Message Logs
  const handleClearLogs = () => {
    setLogs([]);
    saveLocalLogs([]);
  };

  // 6. Resend Single Message
  const handleResendMessage = (log: MessageLog) => {
    const cleanMobile = log.mobile.replace(/[^0-9]/g, '');
    let formattedMobile = cleanMobile;
    if (!formattedMobile.startsWith('91') && formattedMobile.length === 10) {
      formattedMobile = `91${formattedMobile}`;
    }

    if (log.channel === 'WhatsApp') {
      const url = `https://wa.me/${formattedMobile}?text=${encodeURIComponent(log.message)}`;
      window.open(url, '_blank');
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const delimiter = isIOS ? '&' : '?';
      const url = `sms:${formattedMobile}${delimiter}body=${encodeURIComponent(log.message)}`;
      window.location.href = url;
    }
  };

  // 7. Import Database JSON
  const handleImportDatabase = (importedData: CustomerRecord[]) => {
    const sorted = [...importedData].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    setCustomers(sorted);
    saveLocalCustomers(sorted);
    syncBulkCustomersToCloud(sorted).catch(err => console.error('Cloud bulk sync error:', err));
  };

  // 8. Import CSV
  const handleImportCSV = (importedData: CustomerRecord[]) => {
    const combined = [...importedData, ...customers];
    const unique = Array.from(new Map(combined.map(item => [item.vehicleNumber, item])).values());
    const sorted = [...unique].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    setCustomers(sorted);
    saveLocalCustomers(sorted);
    syncBulkCustomersToCloud(sorted).catch(err => console.error('Cloud CSV sync error:', err));
  };

  // 9. Generate 1000 Demo Records
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

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          contactCount={customers.length}
          logCount={logs.length}
          activeDeviceCount={activeDeviceCount}
          userAuth={userAuth}
        />

        {/* Footer */}
        <Footer />

      </div>
    </LocationGate>
  );
}
