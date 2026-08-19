import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { CustomerRecord, MessageLog, DeviceSession } from './types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with specific database ID if provided, otherwise default
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const CUSTOMERS_COLLECTION = 'customers';
const LOGS_COLLECTION = 'logs';
const SETTINGS_COLLECTION = 'settings';
const SESSIONS_COLLECTION = 'sessions';

// Real-time listener for Customers
export function subscribeToCustomers(
  onUpdate: (customers: CustomerRecord[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, CUSTOMERS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const customers: CustomerRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        customers.push({
          id: docSnap.id,
          vehicleNumber: data.vehicleNumber || '',
          mobile: data.mobile || '',
          name: data.name || undefined,
          pucExpiryDate: data.pucExpiryDate || '',
          notes: data.notes || '',
          createdAt: data.createdAt || new Date().toISOString()
        });
      });
      // Sort customers descending by createdAt so newly entered records always stay at the top
      customers.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      onUpdate(customers);
    },
    (err) => {
      console.error('Error listening to customers from Firestore:', err);
      if (onError) onError(err);
    }
  );
}

// Real-time listener for Device Sessions (Admin Panel tracking)
export function subscribeToSessions(
  onUpdate: (sessions: DeviceSession[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, SESSIONS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const sessions: DeviceSession[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        sessions.push({
          id: docSnap.id,
          deviceId: data.deviceId || docSnap.id,
          operatorName: data.operatorName || 'Operator',
          role: data.role || 'Operator',
          deviceName: data.deviceName || 'Device Browser',
          browserInfo: data.browserInfo || '',
          loginTime: data.loginTime || new Date().toISOString(),
          lastActive: data.lastActive || new Date().toISOString(),
          status: data.status || 'Active',
          logoutTime: data.logoutTime,
          location: data.location || undefined,
          latitude: data.latitude !== undefined ? data.latitude : undefined,
          longitude: data.longitude !== undefined ? data.longitude : undefined,
          ip: data.ip || undefined
        });
      });
      // Sort sessions descending by loginTime (newest sessions first)
      sessions.sort((a, b) => new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime());
      onUpdate(sessions);
    },
    (err) => {
      console.error('Error listening to sessions from Firestore:', err);
      if (onError) onError(err);
    }
  );
}

// Save or Update Device Session
export async function saveSessionToCloud(session: DeviceSession): Promise<void> {
  const docRef = doc(db, SESSIONS_COLLECTION, session.id);
  const payload: any = {
    id: session.id,
    deviceId: session.deviceId,
    operatorName: session.operatorName,
    role: session.role,
    deviceName: session.deviceName,
    browserInfo: session.browserInfo,
    loginTime: session.loginTime,
    lastActive: session.lastActive,
    status: session.status,
    logoutTime: session.logoutTime || null,
    updatedAt: new Date().toISOString()
  };
  if (session.location) payload.location = session.location;
  if (session.latitude !== undefined) payload.latitude = session.latitude;
  if (session.longitude !== undefined) payload.longitude = session.longitude;
  if (session.ip) payload.ip = session.ip;

  await setDoc(docRef, payload, { merge: true });
}

// Update Session Status (e.g., Logged Out or Terminated by Admin)
export async function updateSessionStatus(sessionId: string, status: 'Active' | 'Logged Out' | 'Terminated'): Promise<void> {
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const now = new Date().toISOString();
  await setDoc(docRef, {
    status,
    lastActive: now,
    logoutTime: status !== 'Active' ? now : null,
    updatedAt: now
  }, { merge: true });
}

// Heartbeat update for active session
export async function updateSessionHeartbeat(sessionId: string): Promise<void> {
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await setDoc(docRef, {
    lastActive: new Date().toISOString()
  }, { merge: true });
}

// Delete session record from cloud
export async function deleteSessionFromCloud(sessionId: string): Promise<void> {
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await deleteDoc(docRef);
}

// Clear all inactive/terminated session records from cloud
export async function clearInactiveSessionsFromCloud(): Promise<number> {
  const colRef = collection(db, SESSIONS_COLLECTION);
  const snapshot = await getDocs(colRef);
  const docsToDelete: any[] = [];
  
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.status !== 'Active') {
      docsToDelete.push(docSnap.ref);
    }
  });

  if (docsToDelete.length === 0) return 0;

  let count = 0;
  for (let i = 0; i < docsToDelete.length; i += 450) {
    const chunk = docsToDelete.slice(i, i + 450);
    const batch = writeBatch(db);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
    count += chunk.length;
  }
  return count;
}

// Clear all sessions layer logs from cloud database
export async function clearAllSessionsFromCloud(preserveCurrentSessionId?: string): Promise<number> {
  const colRef = collection(db, SESSIONS_COLLECTION);
  const snapshot = await getDocs(colRef);
  const docsToDelete: any[] = [];

  snapshot.forEach((docSnap) => {
    if (!preserveCurrentSessionId || docSnap.id !== preserveCurrentSessionId) {
      docsToDelete.push(docSnap.ref);
    }
  });

  if (docsToDelete.length === 0) return 0;

  let count = 0;
  for (let i = 0; i < docsToDelete.length; i += 450) {
    const chunk = docsToDelete.slice(i, i + 450);
    const batch = writeBatch(db);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
    count += chunk.length;
  }
  return count;
}

// Real-time listener for Message Logs
export function subscribeToLogs(
  onUpdate: (logs: MessageLog[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, LOGS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const logs: MessageLog[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        logs.push({
          id: docSnap.id,
          vehicleNumber: data.vehicleNumber || '',
          mobile: data.mobile || '',
          customerName: data.customerName || undefined,
          channel: data.channel || 'WhatsApp',
          sentAt: data.sentAt || new Date().toISOString(),
          status: data.status || 'Delivered',
          message: data.message || ''
        });
      });
      // Sort logs descending by sentAt
      logs.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      onUpdate(logs);
    },
    (err) => {
      console.error('Error listening to logs from Firestore:', err);
      if (onError) onError(err);
    }
  );
}

// Save or Update a Customer in Firestore
export async function saveCustomerToCloud(customer: CustomerRecord): Promise<void> {
  const docRef = doc(db, CUSTOMERS_COLLECTION, customer.id);
  await setDoc(docRef, {
    id: customer.id,
    vehicleNumber: customer.vehicleNumber,
    mobile: customer.mobile,
    name: customer.name || '',
    pucExpiryDate: customer.pucExpiryDate || '',
    notes: customer.notes || '',
    createdAt: customer.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

// Delete a Customer from Firestore
export async function deleteCustomerFromCloud(customerId: string): Promise<void> {
  const docRef = doc(db, CUSTOMERS_COLLECTION, customerId);
  await deleteDoc(docRef);
}

// Batch save customers (e.g. initial seed or bulk import)
export async function syncBulkCustomersToCloud(customers: CustomerRecord[]): Promise<void> {
  const chunks: CustomerRecord[][] = [];
  const chunkSize = 400; // Firestore limit is 500
  for (let i = 0; i < customers.length; i += chunkSize) {
    chunks.push(customers.slice(i, i + chunkSize));
  }

  for (const chunk of chunks) {
    const batch = writeBatch(db);
    for (const c of chunk) {
      const docRef = doc(db, CUSTOMERS_COLLECTION, c.id);
      batch.set(docRef, {
        id: c.id,
        vehicleNumber: c.vehicleNumber,
        mobile: c.mobile,
        name: c.name || '',
        pucExpiryDate: c.pucExpiryDate || '',
        notes: c.notes || '',
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
    await batch.commit();
  }
}

// Save Message Log to Firestore
export async function saveLogToCloud(log: MessageLog): Promise<void> {
  const docRef = doc(db, LOGS_COLLECTION, log.id);
  await setDoc(docRef, {
    id: log.id,
    vehicleNumber: log.vehicleNumber,
    mobile: log.mobile,
    customerName: log.customerName || '',
    channel: log.channel,
    sentAt: log.sentAt,
    status: log.status,
    message: log.message || ''
  }, { merge: true });
}

// Sync Settings (e.g., Google review link)
export async function saveSettingsToCloud(googleReviewLink: string): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, 'config');
  await setDoc(docRef, { googleReviewLink }, { merge: true });
}

export function subscribeToSettings(onUpdate: (link: string) => void) {
  const docRef = doc(db, SETTINGS_COLLECTION, 'config');
  return onSnapshot(docRef, (snap) => {
    if (snap.exists() && snap.data()?.googleReviewLink) {
      onUpdate(snap.data().googleReviewLink);
    }
  });
}
