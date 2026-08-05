import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CustomerMessagingView } from './components/CustomerMessagingView';
import { MessageLogsView } from './components/MessageLogsView';
import { AdminPanelView } from './components/AdminPanelView';
import { LoginModal } from './components/LoginModal';
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
  updateSessionStatus,
  updateSessionHeartbeat
} from './firebase';

const AUTH_STORAGE_KEY = 'sp_user_auth_v2';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('contacts');
  const [customers, setCustomers] = useState<CustomerRecord[]>(() => {
    const raw = getLocalCustomers();
    return [...raw].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  });
  const [logs, setLogs] = useState<MessageLog[]>(() => getLocalLogs());
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Auth state per device
  const [userAuth, setUserAuth] = useState<UserAuth | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed reading auth state:', e);
    }
    // Default guest operator if none set yet
    const deviceId = localStorage.getItem('sp_device_id') || `dev-${Date.now()}`;
    if (!localStorage.getItem('sp_device_id')) {
      localStorage.setItem('sp_device_id', deviceId);
    }
    return {
      isLoggedIn: true,
      operatorName: 'System Administrator',
      role: 'Admin',
      sessionId: `sess-init-${Date.now()}`,
      deviceId
    };
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Sync auth state to local storage
  useEffect(() => {
    if (userAuth) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userAuth));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
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

    // Subscribe to Device Sessions collection (Multi-device tracking)
    const unsubSessions = subscribeToSessions((cloudSessions) => {
      setSessions(cloudSessions);

      // Check if current device session was terminated remotely by Admin
      if (userAuth && userAuth.sessionId) {
        const mySession = cloudSessions.find(s => s.id === userAuth.sessionId);
        if (mySession && (mySession.status === 'Terminated' || mySession.status === 'Logged Out')) {
          console.warn('Session was ended remotely.');
          setUserAuth(null);
          setIsLoginModalOpen(true);
        }
      }
    });

    return () => {
      unsubCustomers();
      unsubLogs();
      unsubSessions();
    };
  }, [userAuth?.sessionId]);

  // Register or Heartbeat Current Session in Cloud
  useEffect(() => {
    if (!userAuth || !userAuth.isLoggedIn) return;

    // Detect browser/device
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

    const now = new Date().toISOString();
    const currentSession: DeviceSession = {
      id: userAuth.sessionId,
      deviceId: userAuth.deviceId,
      operatorName: userAuth.operatorName,
      role: userAuth.role,
      deviceName: `${userAuth.role === 'Admin' ? 'Admin' : 'Operator'} Terminal (${os})`,
      browserInfo: `${browser} on ${os}`,
      loginTime: now,
      lastActive: now,
      status: 'Active'
    };

    saveSessionToCloud(currentSession).catch(err => console.error('Failed saving session:', err));

    // Send heartbeat every 30s
    const timer = setInterval(() => {
      if (userAuth.sessionId) {
        updateSessionHeartbeat(userAuth.sessionId).catch(() => {});
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [userAuth?.sessionId, userAuth?.operatorName]);

  // Handle Login Success
  const handleLoginSuccess = async (authData: UserAuth, sessionData: DeviceSession) => {
    setUserAuth(authData);
    setIsLoginModalOpen(false);
    try {
      await saveSessionToCloud(sessionData);
    } catch (err) {
      console.error('Error saving session on login:', err);
    }
  };

  // Handle Logout Current Session
  const handleLogoutCurrentSession = async () => {
    if (userAuth && userAuth.sessionId) {
      try {
        await updateSessionStatus(userAuth.sessionId, 'Logged Out');
      } catch (err) {
        console.error('Error logging out session:', err);
      }
    }
    setUserAuth(null);
    setIsLoginModalOpen(true);
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
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        updatedRecord = {
          ...c,
          name: updatedCust.name !== undefined ? (updatedCust.name ? updatedCust.name.trim() : undefined) : c.name,
          mobile: updatedCust.mobile.replace(/[^0-9]/g, ''),
          vehicleNumber: normalizedVeh,
          pucExpiryDate: updatedCust.pucExpiryDate !== undefined ? updatedCust.pucExpiryDate.trim() : c.pucExpiryDate,
          notes: updatedCust.notes !== undefined ? updatedCust.notes.trim() : c.notes
        };
        return updatedRecord;
      }
      return c;
    }));

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

  const handleAdminUnlock = (passcode: string): boolean => {
    const trimmed = passcode.trim();
    if (trimmed === 'SP@123') {
      const deviceId = userAuth?.deviceId || localStorage.getItem('sp_device_id') || `dev-${Date.now()}`;
      const updatedAuth: UserAuth = {
        isLoggedIn: true,
        operatorName: userAuth?.operatorName && userAuth.operatorName !== 'Nayapalli Counter Operator' ? userAuth.operatorName : 'Authorized Administrator',
        role: 'Admin',
        sessionId: userAuth?.sessionId || `sess-admin-${Date.now()}`,
        deviceId
      };
      setUserAuth(updatedAuth);
      return true;
    }
    return false;
  };

  const activeDeviceCount = sessions.filter(s => s.status === 'Active').length || 1;
  const activeOperatorCount = sessions.filter(s => s.status === 'Active' && s.role === 'Operator').length || 1;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        contactCount={customers.length}
        logCount={logs.length}
        activeDeviceCount={activeDeviceCount}
        activeOperatorCount={activeDeviceCount}
        userAuth={userAuth}
        onOpenLogin={() => setIsLoginModalOpen(true)}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onLoginSuccess={handleLoginSuccess}
        onCancel={userAuth ? () => setIsLoginModalOpen(false) : undefined}
        activeSessions={sessions}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            currentAuth={userAuth || {
              isLoggedIn: false,
              operatorName: 'Guest Operator',
              role: 'Operator',
              sessionId: '',
              deviceId: ''
            }}
            onLogoutCurrentSession={handleLogoutCurrentSession}
            onAdminLogin={handleAdminUnlock}
          />
        )}
      </main>

      {/* Footer */}
      <Footer />

    </div>
  );
}

