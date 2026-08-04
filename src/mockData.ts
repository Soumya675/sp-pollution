import { CustomerRecord, MessageLog } from './types';

export const INITIAL_CUSTOMERS: CustomerRecord[] = [
  {
    id: 'cust-1',
    name: 'Rajesh Kumar Swain',
    mobile: '9861012345',
    vehicleNumber: 'OD02AB1234',
    pucExpiryDate: '2026-08-05', // Expiring Tomorrow (1 day)
    notes: 'Regular customer',
    createdAt: '2026-07-15T10:30:00Z'
  },
  {
    id: 'cust-2',
    name: 'Priyanka Mohanty',
    mobile: '9437098765',
    vehicleNumber: 'OD02XY9876',
    pucExpiryDate: '2026-08-04', // Expiring Today (0 days)
    notes: 'Honda Activa',
    createdAt: '2026-07-18T11:15:00Z'
  },
  {
    id: 'cust-3',
    name: 'Amitabh Mishra',
    mobile: '9937123890',
    vehicleNumber: 'OD05CD4321',
    pucExpiryDate: '2026-08-07', // Expiring in 3 days
    notes: 'Mahindra Scorpio',
    createdAt: '2026-07-20T09:00:00Z'
  },
  {
    id: 'cust-4',
    name: 'Suresh Chandra Dash',
    mobile: '7008123456',
    vehicleNumber: 'OD02EF5566',
    pucExpiryDate: '2026-07-30', // Expired 5 days ago
    notes: 'Commercial Truck',
    createdAt: '2026-07-25T14:20:00Z'
  },
  {
    id: 'cust-5',
    name: 'Smruti Ranjan Jena',
    mobile: '9124567890',
    vehicleNumber: 'OD02GH7788',
    pucExpiryDate: '2026-09-03', // Expiring in 30 days
    notes: 'Swift Dzire CNG',
    createdAt: '2026-08-01T16:45:00Z'
  },
  {
    id: 'cust-6',
    name: 'Bikash Chandra Tripathy',
    mobile: '9853112233',
    vehicleNumber: 'OD02MN4455',
    pucExpiryDate: '2026-08-05', // Expiring Tomorrow (1 day)
    notes: 'Royal Enfield 350',
    createdAt: '2026-08-02T12:00:00Z'
  }
];

export const INITIAL_MESSAGE_LOGS: MessageLog[] = [
  {
    id: 'msg-101',
    customerName: 'Rajesh Kumar Swain',
    vehicleNumber: 'OD02AB1234',
    mobile: '9861012345',
    channel: 'WhatsApp',
    message: 'Dear Rajesh Kumar Swain, your vehicle OD02AB1234 pollution certificate will expire TOMORROW (1 day) (Expiry Date: 05 Aug 2026). Kindly visit our Govt. Approved SP Pollution Testing Centre near Nayapalli footover Bridge.',
    sentAt: '2026-08-04T07:30:00Z',
    status: 'Delivered'
  },
  {
    id: 'msg-102',
    customerName: 'Priyanka Mohanty',
    vehicleNumber: 'OD02XY9876',
    mobile: '9437098765',
    channel: 'SMS',
    message: 'Dear Priyanka Mohanty, your vehicle OD02XY9876 pollution certificate will expire TODAY (Expiry Date: 04 Aug 2026). Kindly visit our Govt. Approved SP Pollution Testing Centre near Nayapalli footover Bridge.',
    sentAt: '2026-08-04T08:15:00Z',
    status: 'Sent'
  }
];
