import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { INITIAL_CUSTOMERS, INITIAL_MESSAGE_LOGS } from "./src/mockData";
import { CustomerRecord, MessageLog, SendMessagePayload } from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json());

// Persistent Data Storage setup (JSON Database)
const DATA_DIR = path.join(process.cwd(), "data");
const CUSTOMERS_FILE = path.join(DATA_DIR, "customers.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadData<T>(filePath: string, initialFallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    } else {
      fs.writeFileSync(filePath, JSON.stringify(initialFallback, null, 2), "utf-8");
      return initialFallback;
    }
  } catch (err) {
    console.error(`Failed reading ${filePath}, using fallback:`, err);
    return initialFallback;
  }
}

function saveData<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error(`Failed writing to ${filePath}:`, err);
  }
}

// Load Persistent Stores
let customersStore: CustomerRecord[] = loadData<CustomerRecord[]>(CUSTOMERS_FILE, INITIAL_CUSTOMERS);
let messageLogsStore: MessageLog[] = loadData<MessageLog[]>(MESSAGES_FILE, INITIAL_MESSAGE_LOGS);

// Helper to calculate days left
function calculateDaysLeft(expiryDateStr?: string): number | null {
  if (!expiryDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDateStr);
  exp.setHours(0, 0, 0, 0);
  const diffTime = exp.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. Get all customer records with search filter
app.get("/api/customers", (req, res) => {
  const { search } = req.query;
  let filtered = [...customersStore];

  if (search && typeof search === 'string') {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      c => c.vehicleNumber.toLowerCase().includes(q) ||
           c.mobile.includes(q) ||
           (c.name && c.name.toLowerCase().includes(q))
    );
  }

  res.json({ success: true, count: filtered.length, data: filtered });
});

// 2. Search single customer by vehicle number or mobile
app.get("/api/customers/search", (req, res) => {
  const q = (req.query.q as string || '').trim().toUpperCase();
  if (!q) {
    return res.status(400).json({ success: false, message: 'Vehicle number or mobile is required' });
  }

  const cleanQ = q.replace(/[^A-Z0-9]/g, '');
  const record = customersStore.find(c => {
    const cleanVeh = c.vehicleNumber.replace(/[^A-Z0-9]/g, '');
    return cleanVeh === cleanQ || c.mobile === q || c.vehicleNumber.toUpperCase() === q;
  });

  if (record) {
    return res.json({ success: true, found: true, data: record });
  }

  return res.json({ success: true, found: false, message: 'No record found.' });
});

// 3. Create new customer record (Stores Mobile Number, Vehicle Number, PUC Expiry Date, optional Name)
app.post("/api/customers", (req, res) => {
  const { name, mobile, vehicleNumber, pucExpiryDate, notes } = req.body;

  if (!mobile || !vehicleNumber) {
    return res.status(400).json({
      success: false,
      message: 'Mobile Number and Vehicle Number are required.'
    });
  }

  const cleanVehicleNum = vehicleNumber.trim().toUpperCase().replace(/\s+/g, '');
  const cleanMobile = mobile.trim().replace(/[^0-9]/g, '');

  const newRecord: CustomerRecord = {
    id: `cust-${Date.now()}`,
    name: name && name.trim() ? name.trim() : undefined,
    mobile: cleanMobile,
    vehicleNumber: cleanVehicleNum,
    pucExpiryDate: pucExpiryDate ? pucExpiryDate.trim() : '',
    notes: notes ? notes.trim() : '',
    createdAt: new Date().toISOString()
  };

  customersStore.unshift(newRecord);
  saveData(CUSTOMERS_FILE, customersStore);
  res.status(201).json({
    success: true,
    message: 'Customer vehicle record saved successfully.',
    data: newRecord
  });
});

// 4. Update customer record
app.put("/api/customers/:id", (req, res) => {
  const index = customersStore.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Customer record not found' });
  }

  const existing = customersStore[index];
  const { name, mobile, vehicleNumber, pucExpiryDate, notes } = req.body;

  const updatedRecord: CustomerRecord = {
    ...existing,
    name: name !== undefined ? (name ? name.trim() : undefined) : existing.name,
    mobile: mobile ? mobile.trim().replace(/[^0-9]/g, '') : existing.mobile,
    vehicleNumber: vehicleNumber ? vehicleNumber.trim().toUpperCase().replace(/\s+/g, '') : existing.vehicleNumber,
    pucExpiryDate: pucExpiryDate !== undefined ? pucExpiryDate.trim() : existing.pucExpiryDate,
    notes: notes !== undefined ? notes.trim() : existing.notes
  };

  customersStore[index] = updatedRecord;
  saveData(CUSTOMERS_FILE, customersStore);
  res.json({ success: true, message: 'Record updated successfully', data: updatedRecord });
});

// 5. Delete customer record
app.delete("/api/customers/:id", (req, res) => {
  const initialLen = customersStore.length;
  customersStore = customersStore.filter(c => c.id !== req.params.id);
  if (customersStore.length === initialLen) {
    return res.status(404).json({ success: false, message: 'Customer record not found' });
  }
  saveData(CUSTOMERS_FILE, customersStore);
  res.json({ success: true, message: 'Customer record deleted successfully' });
});

// 6. Dispatch Message (WhatsApp / SMS)
app.post("/api/messages/send", (req, res) => {
  const { customerIds, channel, message } = req.body as SendMessagePayload;

  if (!customerIds || !Array.isArray(customerIds) || customerIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Select at least one customer to send message.' });
  }

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Message text cannot be empty.' });
  }

  const selectedCustomers = customersStore.filter(c => customerIds.includes(c.id));
  const createdLogs: MessageLog[] = [];

  selectedCustomers.forEach(cust => {
    const daysLeft = calculateDaysLeft(cust.pucExpiryDate);
    let daysStr = daysLeft !== null ? `${daysLeft} day(s)` : 'N/A';
    if (daysLeft === 0) daysStr = 'TODAY';
    if (daysLeft === 1) daysStr = 'TOMORROW';
    if (daysLeft !== null && daysLeft < 0) daysStr = `EXPIRED (${Math.abs(daysLeft)} days ago)`;

    const nameOrVeh = cust.name ? cust.name : `Vehicle Owner (${cust.vehicleNumber})`;
    const formattedMsg = message
      .replace(/{name}/g, nameOrVeh)
      .replace(/{vehicleNumber}/g, cust.vehicleNumber)
      .replace(/{mobile}/g, cust.mobile)
      .replace(/{pucExpiryDate}/g, cust.pucExpiryDate || 'N/A')
      .replace(/{daysLeft}/g, daysStr);

    const logItem: MessageLog = {
      id: `msg-${Date.now()}-${Math.floor(Math.random()*1000)}`,
      customerName: cust.name || cust.vehicleNumber,
      vehicleNumber: cust.vehicleNumber,
      mobile: cust.mobile,
      channel: channel || 'WhatsApp',
      message: formattedMsg,
      sentAt: new Date().toISOString(),
      status: 'Delivered'
    };

    createdLogs.push(logItem);
    messageLogsStore.unshift(logItem);
  });

  saveData(MESSAGES_FILE, messageLogsStore);

  res.json({
    success: true,
    message: `Message dispatched successfully to ${createdLogs.length} contact(s).`,
    logs: createdLogs
  });
});

// 7. Get Message Logs
app.get("/api/messages/logs", (req, res) => {
  res.json({ success: true, count: messageLogsStore.length, data: messageLogsStore });
});

// 8. Clear Message Logs
app.delete("/api/messages/logs", (req, res) => {
  messageLogsStore = [];
  saveData(MESSAGES_FILE, messageLogsStore);
  res.json({ success: true, message: 'Message history cleared.' });
});

// -------------------------------------------------------------
// Vite Middleware / Production Serving
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Vehicle Messaging Server running on port ${PORT}`);
  });
}

startServer();
