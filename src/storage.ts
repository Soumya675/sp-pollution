import { CustomerRecord, MessageLog } from './types';
import { INITIAL_CUSTOMERS, INITIAL_MESSAGE_LOGS } from './mockData';

const CUSTOMERS_KEY = 'sp_pollution_customers_v2';
const LOGS_KEY = 'sp_pollution_logs_v2';
const REVIEW_LINK_KEY = 'sp_google_review_link';

export function getLocalCustomers(): CustomerRecord[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed reading customers from localStorage:', err);
  }
  // Fallback to initial
  saveLocalCustomers(INITIAL_CUSTOMERS);
  return INITIAL_CUSTOMERS;
}

export function saveLocalCustomers(customers: CustomerRecord[]): void {
  try {
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
  } catch (err) {
    console.error('Failed saving customers to localStorage:', err);
  }
}

export function getLocalLogs(): MessageLog[] {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed reading logs from localStorage:', err);
  }
  saveLocalLogs(INITIAL_MESSAGE_LOGS);
  return INITIAL_MESSAGE_LOGS;
}

export function saveLocalLogs(logs: MessageLog[]): void {
  try {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  } catch (err) {
    console.error('Failed saving logs to localStorage:', err);
  }
}

export function exportBackupJSON(): void {
  const customers = getLocalCustomers();
  const logs = getLocalLogs();
  const reviewLink = localStorage.getItem(REVIEW_LINK_KEY) || 'https://maps.google.com/?q=SP+Pollution+Testing+Centre+Nayapalli+Bhubaneswar';

  const backupData = {
    appName: 'SP Pollution Testing Centre',
    exportedAt: new Date().toISOString(),
    googleReviewLink: reviewLink,
    customersCount: customers.length,
    logsCount: logs.length,
    customers,
    logs
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sp_puc_database_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importBackupJSON(jsonContent: string): { success: boolean; message: string; count?: number } {
  try {
    const parsed = JSON.parse(jsonContent);
    if (!parsed || !Array.isArray(parsed.customers)) {
      return { success: false, message: 'Invalid backup file format. "customers" array is missing.' };
    }

    saveLocalCustomers(parsed.customers);
    if (Array.isArray(parsed.logs)) {
      saveLocalLogs(parsed.logs);
    }
    if (parsed.googleReviewLink) {
      localStorage.setItem(REVIEW_LINK_KEY, parsed.googleReviewLink);
    }

    return { 
      success: true, 
      message: `Database restored successfully! (${parsed.customers.length} vehicle records, ${parsed.logs?.length || 0} message logs loaded)`,
      count: parsed.customers.length 
    };
  } catch (err: any) {
    return { success: false, message: `Failed to import JSON: ${err?.message || 'Syntax error'}` };
  }
}

export function exportBackupCSV(): void {
  const customers = getLocalCustomers();
  const headers = ['Vehicle Number', 'Mobile Number', 'Customer Name', 'PUC Expiry Date (YYYY-MM-DD)', 'Notes'];
  
  const rows = customers.map(c => [
    `"${c.vehicleNumber || ''}"`,
    `"${c.mobile || ''}"`,
    `"${c.name || ''}"`,
    `"${c.pucExpiryDate || ''}"`,
    `"${(c.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sp_puc_vehicles_export_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importBackupCSV(csvText: string): { success: boolean; message: string; count?: number } {
  try {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) {
      return { success: false, message: 'CSV file is empty or missing data rows.' };
    }

    const newRecords: CustomerRecord[] = [];
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Regex to split CSV with quotes
      const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
      if (cols && cols.length >= 2) {
        const clean = (str: string) => (str || '').replace(/^"|"$/g, '').trim();
        const vehicleNumber = clean(cols[0]).toUpperCase();
        const mobile = clean(cols[1]).replace(/[^0-9]/g, '');
        const name = cols[2] ? clean(cols[2]) : undefined;
        const pucExpiryDate = cols[3] ? clean(cols[3]) : undefined;
        const notes = cols[4] ? clean(cols[4]) : undefined;

        if (vehicleNumber && mobile) {
          newRecords.push({
            id: `cust-${Date.now()}-${i}-${Math.floor(Math.random()*1000)}`,
            vehicleNumber,
            mobile,
            name: name || undefined,
            pucExpiryDate: pucExpiryDate || '',
            notes: notes || '',
            createdAt: new Date().toISOString()
          });
        }
      }
    }

    if (newRecords.length === 0) {
      return { success: false, message: 'No valid vehicle records found in CSV file. Ensure columns are: Vehicle Number, Mobile, Name, Expiry Date.' };
    }

    const existing = getLocalCustomers();
    // Merge without exact duplicates
    const existingVehicles = new Set(existing.map(e => e.vehicleNumber));
    const added = newRecords.filter(r => !existingVehicles.has(r.vehicleNumber));
    const updatedList = [...added, ...existing];

    saveLocalCustomers(updatedList);
    return {
      success: true,
      message: `Successfully imported ${added.length} new vehicle records from CSV! (Total in Database: ${updatedList.length})`,
      count: added.length
    };
  } catch (err: any) {
    return { success: false, message: `Failed parsing CSV: ${err?.message || 'Format error'}` };
  }
}

export function generateBatchData(count: number = 1000): { count: number; total: number } {
  const prefixes = ['OD02', 'OD05', 'OD33', 'OD01', 'OD07', 'OD34', 'OD14'];
  const series = ['AB', 'AC', 'AQ', 'AR', 'AX', 'AZ', 'B', 'C', 'BK'];
  const sampleNames = ['Ramesh Sahoo', 'Priyanka Das', 'Soumya Ranjan', 'Debasis Pati', 'Manoj Nayak', 'Sunita Jena', 'Amit Mohanty', 'Lipika Swain', 'Jyoti Prakash', 'Deepak Behera', ''];

  const today = new Date();
  const existing = getLocalCustomers();
  const existingVehicles = new Set(existing.map(e => e.vehicleNumber));
  
  const generated: CustomerRecord[] = [];

  for (let i = 0; i < count; i++) {
    const pref = prefixes[Math.floor(Math.random() * prefixes.length)];
    const ser = series[Math.floor(Math.random() * series.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const vNum = `${pref}${ser}${num}`;

    if (existingVehicles.has(vNum)) continue;
    existingVehicles.add(vNum);

    const mob = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const nameChoice = sampleNames[Math.floor(Math.random() * sampleNames.length)];

    // Expiry offset between -30 days and +180 days
    const offsetDays = Math.floor(Math.random() * 210) - 30;
    const expDate = new Date(today);
    expDate.setDate(expDate.getDate() + offsetDays);
    const dateStr = expDate.toISOString().split('T')[0];

    generated.push({
      id: `batch-${Date.now()}-${i}`,
      vehicleNumber: vNum,
      mobile: mob,
      name: nameChoice || undefined,
      pucExpiryDate: dateStr,
      notes: 'Bulk imported batch record',
      createdAt: new Date().toISOString()
    });
  }

  const merged = [...generated, ...existing];
  saveLocalCustomers(merged);
  return { count: generated.length, total: merged.length };
}
