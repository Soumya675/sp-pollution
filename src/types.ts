export interface CustomerRecord {
  id: string;
  name: string;
  mobile: string;
  vehicleNumber: string;
  pucExpiryDate?: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}

export interface MessageLog {
  id: string;
  customerName: string;
  vehicleNumber: string;
  mobile: string;
  channel: 'WhatsApp' | 'SMS' | 'Both';
  message: string;
  sentAt: string;
  status: 'Delivered' | 'Sent';
}

export interface SendMessagePayload {
  customerIds: string[];
  channel: 'WhatsApp' | 'SMS' | 'Both';
  message: string;
}
