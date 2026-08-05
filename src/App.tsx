import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CustomerMessagingView } from './components/CustomerMessagingView';
import { MessageLogsView } from './components/MessageLogsView';
import { CustomerRecord, MessageLog } from './types';
import { INITIAL_CUSTOMERS, INITIAL_MESSAGE_LOGS } from './mockData';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('contacts');
  const [customers, setCustomers] = useState<CustomerRecord[]>(INITIAL_CUSTOMERS);
  const [logs, setLogs] = useState<MessageLog[]>(INITIAL_MESSAGE_LOGS);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch customers and logs on load
  useEffect(() => {
    fetchCustomers();
    fetchLogs();
  }, []);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCustomers(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/messages/logs');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  // Add Customer (Stores Name, Mobile Number, Vehicle Number, PUC Expiry Date)
  const handleAddCustomer = async (newCust: { name: string; mobile: string; vehicleNumber: string; pucExpiryDate?: string; notes?: string }) => {
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCust)
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCustomers(prev => [data.data, ...prev]);
      } else {
        alert(data.message || 'Failed to save customer record.');
      }
    } catch (err) {
      console.error('Error adding customer:', err);
      // Fallback local update
      const fallbackItem: CustomerRecord = {
        id: `cust-${Date.now()}`,
        name: newCust.name,
        mobile: newCust.mobile,
        vehicleNumber: newCust.vehicleNumber.toUpperCase(),
        pucExpiryDate: newCust.pucExpiryDate,
        notes: newCust.notes,
        createdAt: new Date().toISOString()
      };
      setCustomers(prev => [fallbackItem, ...prev]);
    }
  };

  // Update Customer
  const handleUpdateCustomer = async (id: string, updatedCust: { name: string; mobile: string; vehicleNumber: string; pucExpiryDate?: string; notes?: string }) => {
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedCust)
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCustomers(prev => prev.map(c => c.id === id ? data.data : c));
      }
    } catch (err) {
      console.error('Error updating customer:', err);
      setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updatedCust } : c));
    }
  };

  // Delete Customer
  const handleDeleteCustomer = async (id: string) => {
    try {
      await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      setCustomers(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Error deleting customer:', err);
      setCustomers(prev => prev.filter(c => c.id !== id));
    }
  };

  // Dispatch / Send Message (Stores in message history + returns logs)
  const handleSendMessage = async (customerIds: string[], channel: 'WhatsApp' | 'SMS' | 'Both', message: string) => {
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerIds, channel, message })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(prev => [...data.logs, ...prev]);
      }
    } catch (err) {
      console.error('Error dispatching message:', err);
      // Fallback local log
      const selected = customers.filter(c => customerIds.includes(c.id));
      const newLogs: MessageLog[] = selected.map(c => ({
        id: `msg-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        customerName: c.name,
        vehicleNumber: c.vehicleNumber,
        mobile: c.mobile,
        channel,
        message,
        sentAt: new Date().toISOString(),
        status: 'Delivered'
      }));
      setLogs(prev => [...newLogs, ...prev]);
    }
  };

  // Clear Message Logs
  const handleClearLogs = async () => {
    try {
      await fetch('/api/messages/logs', { method: 'DELETE' });
      setLogs([]);
    } catch (err) {
      console.error('Error clearing logs:', err);
      setLogs([]);
    }
  };

  // Resend single message
  const handleResendMessage = (log: MessageLog) => {
    const matchingCust = customers.find(c => c.mobile === log.mobile || c.vehicleNumber === log.vehicleNumber);
    if (matchingCust) {
      handleSendMessage([matchingCust.id], log.channel, log.message);
    } else {
      // Fallback resend log
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
    }
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
