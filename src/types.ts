export interface CustomerRecord {
  id: string;
  name?: string;
  mobile: string;
  vehicleNumber: string;
  pucExpiryDate?: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}

export interface MessageLog {
  id: string;
  customerName?: string;
  vehicleNumber: string;
  mobile: string;
  channel: 'WhatsApp' | 'SMS' | 'Both';
  message: string;
  sentAt: string;
  status: 'Delivered' | 'Sent';
}

export interface DeviceSession {
  id: string;
  deviceId: string;
  operatorName: string;
  role: 'Operator' | 'Admin';
  deviceName: string;
  browserInfo: string;
  loginTime: string;
  lastActive: string;
  status: 'Active' | 'Logged Out' | 'Terminated';
  logoutTime?: string;
}

export interface UserAuth {
  isLoggedIn: boolean;
  operatorName: string;
  role: 'Operator' | 'Admin';
  sessionId: string;
  deviceId: string;
}

export interface SendMessagePayload {
  customerIds: string[];
  channel: 'WhatsApp' | 'SMS' | 'Both';
  message: string;
}

