import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CustomerMessagingView } from './components/CustomerMessagingView';
import { MessageLogsView } from './components/MessageLogsView';
import { CustomerRecord, MessageLog } from './types';
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
  saveCustomerToCloud, 
  deleteCustomerFromCloud, 
  syncBulkCustomersToCloud, 
  saveLogToCloud 
} from './firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('contacts');
  const [customers, setCustomers] = useState<CustomerRecord[]>(() => getLocalCustomers());
  const [logs, setLogs] = useState<MessageLog[]>(() => getLocalLogs());
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
        setCustomers(cloudCustomers);
        saveLocalCustomers(cloudCustomers);
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

    return () => {
      unsubCustomers();
      unsubLogs();
    };
  }, []);

  // Add Customer Vehicle Record
  const handleAddCustomer = async (newCust: { name?: string; mobile: string; vehicleNumber: string; pucExpiryDate?: string; notes?: string }) => {
    const newItem: CustomerRecord = {
      id: `cust-${Date.now()}`,
      name: newCust.name ? newCust.name.trim() : undefined,
      mobile: newCust.mobile.replace(/[^0-9]/g, ''),
      vehicleNumber: newCust.vehicleNumber.trim().toUpperCase(),
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
    let updatedRecord: CustomerRecord | null = null;
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        updatedRecord = {
          ...c,
          name: updatedCust.name !== undefined ? (updatedCust.name ? updatedCust.name.trim() : undefined) : c.name,
          mobile: updatedCust.mobile.replace(/[^0-9]/g, ''),
          vehicleNumber: updatedCust.vehicleNumber.trim().toUpperCase(),
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
      setCustomers(updatedCusts);
      syncBulkCustomersToCloud(updatedCusts).catch(err => console.error('Cloud sync error:', err));
    }
    return result;
  };

  // Import Database Backup CSV
  const handleImportCSV = (csvText: string) => {
    const result = importBackupCSV(csvText);
    if (result.success) {
      const updatedCusts = getLocalCustomers();
      setCustomers(updatedCusts);
      syncBulkCustomersToCloud(updatedCusts).catch(err => console.error('Cloud sync error:', err));
    }
    return result;
  };

  // Generate 1,000 Sample Records Batch
  const handleGenerateBatch = (count: number = 1000) => {
    const result = generateBatchData(count);
    const updatedCusts = getLocalCustomers();
    setCustomers(updatedCusts);
    syncBulkCustomersToCloud(updatedCusts).catch(err => console.error('Cloud sync error:', err));
    return result;
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col selection:bg-blue-600 selection:text-white">
      
      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        contactCount={customers.length}
        logCount={logs.length}
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
      </main>

      {/* Footer */}
      <Footer />

    </div>
  );
}
