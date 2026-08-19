import React, { useState } from 'react';
import { CustomerRecord } from '../types';
import { 
  Database,
  Download,
  Upload,
  MessageSquare, 
  Send, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  CheckSquare, 
  Square, 
  Phone, 
  Car, 
  User, 
  Calendar,
  AlertTriangle,
  Clock,
  ArrowUpDown,
  CheckCircle2,
  Bell,
  Sparkles,
  Flame,
  ShieldAlert,
  Star,
  ExternalLink,
  Copy,
  Check,
  Award,
  ThumbsUp,
  RefreshCw,
  Share2
} from 'lucide-react';

interface CustomerMessagingViewProps {
  customers: CustomerRecord[];
  onAddCustomer: (customer: { name?: string; mobile: string; vehicleNumber: string; pucExpiryDate?: string; notes?: string }) => void;
  onUpdateCustomer: (id: string, customer: { name?: string; mobile: string; vehicleNumber: string; pucExpiryDate?: string; notes?: string }) => void;
  onDeleteCustomer: (id: string) => void;
  onSendMessage: (customerIds: string[], channel: 'WhatsApp' | 'SMS' | 'Both', message: string) => void;
  onExportBackup?: () => void;
  onImportBackup?: (jsonContent: string) => { success: boolean; message: string; count?: number };
  onExportCSV?: () => void;
  onImportCSV?: (csvText: string) => { success: boolean; message: string; count?: number };
  onGenerateBatch?: (count?: number) => { count: number; total: number };
  isLoading?: boolean;
}

export const CustomerMessagingView: React.FC<CustomerMessagingViewProps> = ({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onSendMessage,
  onExportBackup,
  onImportBackup,
  onExportCSV,
  onImportCSV,
  onGenerateBatch,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [filterTab, setFilterTab] = useState<'ALL' | 'RECORDED_TODAY' | 'TOMORROW' | 'TODAY' | 'WEEK' | 'EXPIRED'>('ALL');
  const [sortBy, setSortBy] = useState<'recent' | 'expiring_soonest' | 'expiring_tomorrow' | 'expired' | 'name_asc' | 'vehicle_asc'>('recent');

  // Pagination state for handling 1,000+ data smoothly without white screen
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50); // Default 50 items per page for instant performance
  
  // Add / Edit Modal State (Customer Name is Optional)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [formData, setFormData] = useState({ name: '', mobile: '', vehicleNumber: '', pucExpiryDate: '', notes: '' });

  // Delete Confirmation State
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerRecord | null>(null);

  // Real Broadcast Review Modal State
  const [isRealBroadcastModalOpen, setIsRealBroadcastModalOpen] = useState(false);
  const [broadcastMessageCustom, setBroadcastMessageCustom] = useState('');
  const [broadcastSentCount, setBroadcastSentCount] = useState(0);

  // File import refs
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const csvFileInputRef = React.useRef<HTMLInputElement | null>(null);

  // General Notification / Banner state
  const [noticeBanner, setNoticeBanner] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Compose Message Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [messageChannel, setMessageChannel] = useState<'WhatsApp' | 'SMS' | 'Both'>('WhatsApp');
  const [messageText, setMessageText] = useState(`Dear Sir/Madam,

Greetings from Government Approved SP Pollution Testing Centre.

This is a friendly reminder that your vehicle {vehicleNumber} PUC Certificate will expire on {pucExpiryDate} ({daysLeft} remaining).

Kindly visit our Government Approved SP Pollution Testing Centre, near Nayapalli Foot Over Bridge, Bhubaneswar, to renew your PUC Certificate at the earliest and avoid penalties under the Motor Vehicles Act.

📍 Centre 1: https://maps.app.goo.gl/p24pgEWbovgd6ZER7
📍 Centre 2: https://maps.app.goo.gl/nTtN6vgsDrVZhFgf8

Thank you!`);
  const [sentSuccessNotice, setSentSuccessNotice] = useState<string | null>(null);

  // Google Review & Feedback Collector State
  const [googleReviewLink, setGoogleReviewLink] = useState<string>(() => {
    return localStorage.getItem('sp_google_review_link') || 'https://maps.google.com/?q=SP+Pollution+Testing+Centre+Nayapalli+Bhubaneswar';
  });
  const [isEditingReviewLink, setIsEditingReviewLink] = useState(false);
  const [reviewLinkInput, setReviewLinkInput] = useState(googleReviewLink);
  const [copiedReviewLink, setCopiedReviewLink] = useState(false);

  // Quick PUC Renewal & Google Review Modal State
  const [renewingCustomer, setRenewingCustomer] = useState<CustomerRecord | null>(null);
  const [renewalMonths, setRenewalMonths] = useState<number>(12); // Default 1 Year
  const [renewChannel, setRenewChannel] = useState<'WhatsApp' | 'SMS' | 'Both'>('WhatsApp');

  // Automated Batch Message Dispatcher Queue State
  const [isBatchDispatcherOpen, setIsBatchDispatcherOpen] = useState(false);
  const [batchQueue, setBatchQueue] = useState<{
    customer: CustomerRecord;
    formattedMsg: string;
    channel: 'WhatsApp' | 'SMS' | 'Both';
    status: 'pending' | 'sent' | 'skipped';
  }[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);

  const handleSaveReviewLink = () => {
    if (!reviewLinkInput.trim()) return;
    setGoogleReviewLink(reviewLinkInput.trim());
    localStorage.setItem('sp_google_review_link', reviewLinkInput.trim());
    setIsEditingReviewLink(false);
    setSentSuccessNotice('Google Maps Review link saved successfully!');
    setTimeout(() => setSentSuccessNotice(null), 3500);
  };

  const handleCopyReviewLink = () => {
    navigator.clipboard.writeText(googleReviewLink);
    setCopiedReviewLink(true);
    setTimeout(() => setCopiedReviewLink(false), 2500);
  };

  // Helper to calculate days remaining from today
  const getExpiryDetails = (pucExpiryDate?: string) => {
    if (!pucExpiryDate) {
      return {
        daysLeft: null,
        status: 'NO_DATE' as const,
        label: 'No Expiry Date',
        badgeBg: 'bg-slate-100 text-slate-600 border-slate-200'
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exp = new Date(pucExpiryDate);
    exp.setHours(0, 0, 0, 0);

    const diffTime = exp.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const formattedDate = new Date(pucExpiryDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    if (daysLeft < 0) {
      return {
        daysLeft,
        status: 'EXPIRED' as const,
        label: `EXPIRED (${Math.abs(daysLeft)}d ago)`,
        formattedDate,
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-300 font-black'
      };
    }
    if (daysLeft === 0) {
      return {
        daysLeft,
        status: 'TODAY' as const,
        label: 'EXPIRES TODAY!',
        formattedDate,
        badgeBg: 'bg-rose-600 text-white border-rose-700 font-black animate-pulse'
      };
    }
    if (daysLeft === 1) {
      return {
        daysLeft,
        status: 'TOMORROW' as const,
        label: 'EXPIRES TOMORROW!',
        formattedDate,
        badgeBg: 'bg-amber-500 text-white border-amber-600 font-black shadow-sm'
      };
    }
    if (daysLeft <= 7) {
      return {
        daysLeft,
        status: 'WEEK' as const,
        label: `In ${daysLeft} days`,
        formattedDate,
        badgeBg: 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
      };
    }
    return {
      daysLeft,
      status: 'VALID' as const,
      label: `Valid (${daysLeft}d left)`,
      formattedDate,
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold'
    };
  };

  // Helper to format when vehicle data was entered / recorded
  const formatEntryDateTime = (createdAt?: string) => {
    if (!createdAt) {
      return { isToday: false, isYesterday: false, formatted: 'Earlier Record', badgeText: '', timeStr: '', dateStr: '' };
    }
    const date = new Date(createdAt);
    if (isNaN(date.getTime())) {
      return { isToday: false, isYesterday: false, formatted: createdAt, badgeText: '', timeStr: '', dateStr: '' };
    }

    const now = new Date();
    const isToday = 
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    if (isToday) {
      return {
        isToday: true,
        isYesterday: false,
        formatted: `Today (${dateStr}) at ${timeStr}`,
        badgeText: `Added Today at ${timeStr}`,
        timeStr,
        dateStr
      };
    }
    if (isYesterday) {
      return {
        isToday: false,
        isYesterday: true,
        formatted: `Yesterday (${dateStr}) at ${timeStr}`,
        badgeText: `Yesterday at ${timeStr}`,
        timeStr,
        dateStr
      };
    }

    return {
      isToday: false,
      isYesterday: false,
      formatted: `${dateStr} at ${timeStr}`,
      badgeText: `${dateStr} at ${timeStr}`,
      timeStr,
      dateStr
    };
  };

  // Counts for summary filter tabs
  const recordedTodayCount = customers.filter(c => formatEntryDateTime(c.createdAt).isToday).length;
  const tomorrowCount = customers.filter(c => getExpiryDetails(c.pucExpiryDate).daysLeft === 1).length;
  const todayCount = customers.filter(c => getExpiryDetails(c.pucExpiryDate).daysLeft === 0).length;
  const weekCount = customers.filter(c => {
    const d = getExpiryDetails(c.pucExpiryDate).daysLeft;
    return d !== null && d >= 0 && d <= 7;
  }).length;
  const expiredCount = customers.filter(c => {
    const d = getExpiryDetails(c.pucExpiryDate).daysLeft;
    return d !== null && d < 0;
  }).length;

  // Filter contacts
  const filteredCustomers = customers.filter(c => {
    if (!c) return false;
    const q = searchTerm.trim().toLowerCase();
    const nameStr = (c.name || '').toLowerCase();
    const mobileStr = c.mobile || '';
    const vehicleStr = (c.vehicleNumber || '').toLowerCase();
    const expiryStr = c.pucExpiryDate || '';

    const matchesSearch = (
      nameStr.includes(q) ||
      mobileStr.includes(q) ||
      vehicleStr.includes(q) ||
      expiryStr.includes(q)
    );

    if (!matchesSearch) return false;

    if (filterTab === 'RECORDED_TODAY') return formatEntryDateTime(c.createdAt).isToday;
    const details = getExpiryDetails(c.pucExpiryDate);
    if (filterTab === 'TOMORROW') return details.daysLeft === 1;
    if (filterTab === 'TODAY') return details.daysLeft === 0;
    if (filterTab === 'WEEK') return details.daysLeft !== null && details.daysLeft >= 0 && details.daysLeft <= 7;
    if (filterTab === 'EXPIRED') return details.daysLeft !== null && details.daysLeft < 0;

    return true;
  });

  // Sort contacts (Newly recorded / latest added vehicles on top by default)
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

    if (sortBy === 'recent') {
      return timeB - timeA;
    }

    const daysA = getExpiryDetails(a?.pucExpiryDate).daysLeft ?? 9999;
    const daysB = getExpiryDetails(b?.pucExpiryDate).daysLeft ?? 9999;

    if (sortBy === 'expiring_soonest') {
      if (daysA !== daysB) return daysA - daysB;
      return timeB - timeA;
    }
    if (sortBy === 'expiring_tomorrow') {
      if (daysA === 1 && daysB !== 1) return -1;
      if (daysB === 1 && daysA !== 1) return 1;
      if (daysA !== daysB) return daysA - daysB;
      return timeB - timeA;
    }
    if (sortBy === 'expired') {
      if (daysA < 0 && daysB >= 0) return -1;
      if (daysB < 0 && daysA >= 0) return 1;
      if (daysA !== daysB) return daysA - daysB;
      return timeB - timeA;
    }
    if (sortBy === 'name_asc') {
      const nameA = a.name || a.vehicleNumber || '';
      const nameB = b.name || b.vehicleNumber || '';
      const cmp = nameA.localeCompare(nameB);
      if (cmp !== 0) return cmp;
      return timeB - timeA;
    }
    if (sortBy === 'vehicle_asc') {
      const vehA = a.vehicleNumber || '';
      const vehB = b.vehicleNumber || '';
      const cmp = vehA.localeCompare(vehB);
      if (cmp !== 0) return cmp;
      return timeB - timeA;
    }
    return timeB - timeA;
  });

  // Calculate Pagination for 1,000+ data scaling
  const totalItems = sortedCustomers.length;
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedCustomers = pageSize === -1
    ? sortedCustomers
    : sortedCustomers.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  // Select all handler
  const handleSelectAll = () => {
    if (selectedCustomerIds.length === sortedCustomers.length) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(sortedCustomers.map(c => c.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedCustomerIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Quick Action: Broadcast to Tomorrow's Expirations
  const handleSelectTomorrowExpirations = () => {
    const tomorrowContacts = customers.filter(c => getExpiryDetails(c.pucExpiryDate).daysLeft === 1);
    const tomorrowIds = tomorrowContacts.map(c => c.id);

    if (tomorrowIds.length === 0) {
      setNoticeBanner('Notice: Currently no contacts have PUC expiring tomorrow.');
      setTimeout(() => setNoticeBanner(null), 5000);
      return;
    }

    setFilterTab('TOMORROW');
    setSelectedCustomerIds(tomorrowIds);
    setMessageText('Dear {name}, your vehicle {vehicleNumber} pollution certificate will expire TOMORROW ({pucExpiryDate}). Kindly visit our Govt. Approved SP Pollution Testing Centre near Nayapalli footover Bridge.');
    setIsComposeOpen(true);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormError(null);
    setFormData({ name: '', mobile: '', vehicleNumber: '', pucExpiryDate: '', notes: '' });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (c: CustomerRecord) => {
    setEditingCustomer(c);
    setFormError(null);
    setFormData({ 
      name: c.name || '', 
      mobile: c.mobile || '', 
      vehicleNumber: c.vehicleNumber || '', 
      pucExpiryDate: c.pucExpiryDate || '', 
      notes: c.notes || '' 
    });
    setIsAddModalOpen(true);
  };

  // Submit Add/Edit Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.mobile.trim() || !formData.vehicleNumber.trim()) {
      setFormError('Please fill in Mobile Number and Vehicle Registration Number.');
      return;
    }

    const normalizedVeh = formData.vehicleNumber.trim().toUpperCase();
    const isDuplicate = customers.some(c => 
      (!editingCustomer || c.id !== editingCustomer.id) && 
      c.vehicleNumber.trim().toUpperCase() === normalizedVeh
    );

    if (isDuplicate) {
      setFormError(`This vehicle number is already present (${normalizedVeh})`);
      alert(`This vehicle number is already present (${normalizedVeh})`);
      return;
    }

    const payload = {
      name: formData.name.trim() || undefined,
      mobile: formData.mobile.trim(),
      vehicleNumber: normalizedVeh,
      pucExpiryDate: formData.pucExpiryDate ? formData.pucExpiryDate.trim() : undefined,
      notes: formData.notes ? formData.notes.trim() : undefined
    };

    if (editingCustomer) {
      onUpdateCustomer(editingCustomer.id, payload);
      setSentSuccessNotice(`Updated vehicle record for ${payload.vehicleNumber}`);
    } else {
      onAddCustomer(payload);
      setSentSuccessNotice(`Saved vehicle record for ${payload.vehicleNumber}`);
    }

    // Bring user to page 1 with recent sort so newly added/updated vehicle is at the very top
    setCurrentPage(1);
    setSortBy('recent');
    setIsAddModalOpen(false);
    setFormData({ name: '', mobile: '', vehicleNumber: '', pucExpiryDate: '', notes: '' });
    setTimeout(() => setSentSuccessNotice(null), 4000);
  };

  // Open Single Customer WhatsApp
  const handleOpenWhatsApp = (c: CustomerRecord) => {
    const details = getExpiryDetails(c.pucExpiryDate);
    const formattedDateStr = details.formattedDate || c.pucExpiryDate || 'N/A';
    
    let statusText = `will expire on *${formattedDateStr}*`;
    if (details.daysLeft === 0) {
      statusText = `has *expired today (${formattedDateStr})*`;
    } else if (details.daysLeft === 1) {
      statusText = `will *expire tomorrow (${formattedDateStr})*`;
    } else if (details.daysLeft !== null && details.daysLeft < 0) {
      statusText = `has *EXPIRED on ${formattedDateStr}*`;
    }

    const rawMsg = `*Dear Sir/Madam,*

Your vehicle *${c.vehicleNumber}* PUC Certificate ${statusText}.

Kindly visit our *Government Approved SP Pollution Testing Centre*, near *Nayapalli Foot Over Bridge, Bhubaneswar*, to renew your PUC Certificate at the earliest and avoid penalties under the Motor Vehicles Act.

📍 *Centre 1:* https://maps.app.goo.gl/p24pgEWbovgd6ZER7
📍 *Centre 2:* https://maps.app.goo.gl/nTtN6vgsDrVZhFgf8

*Thank you!*`;

    const text = encodeURIComponent(rawMsg);
    const cleanNum = c.mobile.replace(/[^0-9]/g, '');
    const num = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum;
    window.open(`https://wa.me/${num}?text=${text}`, '_blank');
    
    onSendMessage([c.id], 'WhatsApp', rawMsg);
    setSentSuccessNotice(`WhatsApp message sent & logged for ${c.vehicleNumber}!`);
    setTimeout(() => setSentSuccessNotice(null), 4000);
  };

  // Open Single Customer SMS
  const handleOpenSMS = (c: CustomerRecord) => {
    const details = getExpiryDetails(c.pucExpiryDate);
    const formattedDateStr = details.formattedDate || c.pucExpiryDate || 'N/A';
    
    let statusText = `will expire on ${formattedDateStr}`;
    if (details.daysLeft === 0) {
      statusText = `has expired today (${formattedDateStr})`;
    } else if (details.daysLeft === 1) {
      statusText = `will expire tomorrow (${formattedDateStr})`;
    } else if (details.daysLeft !== null && details.daysLeft < 0) {
      statusText = `has EXPIRED on ${formattedDateStr}`;
    }

    const rawMsg = `Dear Sir/Madam, Your vehicle ${c.vehicleNumber} PUC Certificate ${statusText}. Kindly visit our Government Approved SP Pollution Testing Centre, near Nayapalli Foot Over Bridge, Bhubaneswar to renew your PUC Certificate. Centre 1: https://maps.app.goo.gl/p24pgEWbovgd6ZER7 | Centre 2: https://maps.app.goo.gl/nTtN6vgsDrVZhFgf8 . Thank you!`;
    const text = encodeURIComponent(rawMsg);
    window.open(`sms:${c.mobile}?body=${text}`, '_blank');
    
    onSendMessage([c.id], 'SMS', rawMsg);
    setSentSuccessNotice(`SMS sent & logged for ${c.vehicleNumber}!`);
    setTimeout(() => setSentSuccessNotice(null), 4000);
  };

  // Helper to format personalized messages with custom tags and dynamic status according to expiry date
  const formatPersonalizedMessage = (templateText: string, c: CustomerRecord) => {
    const details = getExpiryDetails(c.pucExpiryDate);
    const formattedDateStr = details.formattedDate || c.pucExpiryDate || 'N/A';

    let statusPhrase = `will expire on ${formattedDateStr}`;
    let daysStr = `${details.daysLeft} days`;

    if (details.daysLeft === 0) {
      statusPhrase = `has expired today (${formattedDateStr})`;
      daysStr = '0 days (TODAY)';
    } else if (details.daysLeft === 1) {
      statusPhrase = `will expire tomorrow (${formattedDateStr})`;
      daysStr = '1 day (TOMORROW)';
    } else if (details.daysLeft !== null && details.daysLeft < 0) {
      statusPhrase = `has EXPIRED on ${formattedDateStr}`;
      daysStr = `EXPIRED (${Math.abs(details.daysLeft)} days ago)`;
    } else if (details.daysLeft !== null) {
      statusPhrase = `will expire on ${formattedDateStr} (${details.daysLeft} days remaining)`;
      daysStr = `${details.daysLeft} days`;
    }

    let result = templateText;

    // Smart replacement for fixed expiry sentences if present in template
    result = result.replace(/has expired today \(\{pucExpiryDate\}\)/gi, statusPhrase);
    result = result.replace(/will expire tomorrow \(\{pucExpiryDate\}\)/gi, statusPhrase);
    result = result.replace(/will expire on \(\{pucExpiryDate\}\)/gi, statusPhrase);
    result = result.replace(/has EXPIRED on \{pucExpiryDate\}/gi, statusPhrase);
    result = result.replace(/will expire on \{pucExpiryDate\}/gi, statusPhrase);

    // Standard tag replacements
    result = result
      .replace(/\{name\}/gi, 'Sir/Madam')
      .replace(/\{vehicleNumber\}/gi, c.vehicleNumber || '')
      .replace(/\{pucExpiryDate\}/gi, formattedDateStr)
      .replace(/\{daysLeft\}/gi, daysStr)
      .replace(/\{expiryStatus\}/gi, statusPhrase);

    return result;
  };

  // Dispatch Bulk or Single Compose Message
  const handleDispatchMessage = () => {
    if (selectedCustomerIds.length === 0) {
      setFormError('Please select at least one contact.');
      return;
    }
    if (!messageText.trim()) {
      setFormError('Message cannot be empty.');
      return;
    }

    const selectedCustomers = customers.filter(c => selectedCustomerIds.includes(c.id));
    if (selectedCustomers.length === 0) return;

    if (selectedCustomers.length === 1) {
      // Single customer - launch WhatsApp/SMS immediately and log to cloud
      const c = selectedCustomers[0];
      const formatted = formatPersonalizedMessage(messageText, c);
      const cleanNum = c.mobile.replace(/[^0-9]/g, '');
      const num = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum;

      if (messageChannel === 'WhatsApp' || messageChannel === 'Both') {
        window.open(`https://wa.me/${num}?text=${encodeURIComponent(formatted)}`, '_blank');
      } else {
        window.open(`sms:${c.mobile}?body=${encodeURIComponent(formatted)}`, '_blank');
      }

      onSendMessage([c.id], messageChannel, formatted);
      setIsComposeOpen(false);
      setSentSuccessNotice(`✅ Message launched on ${messageChannel} for ${c.vehicleNumber} & saved to cloud!`);
      setTimeout(() => setSentSuccessNotice(null), 5000);
    } else {
      // Multiple selected customers - launch Automated Batch Dispatcher Queue Modal!
      const queueItems = selectedCustomers.map(c => ({
        customer: c,
        formattedMsg: formatPersonalizedMessage(messageText, c),
        channel: messageChannel,
        status: 'pending' as const
      }));

      // Log messages in background/cloud DB
      selectedCustomers.forEach(c => {
        onSendMessage([c.id], messageChannel, formatPersonalizedMessage(messageText, c));
      });

      setBatchQueue(queueItems);
      setBatchIndex(0);
      setIsComposeOpen(false);
      setIsBatchDispatcherOpen(true);
    }
  };

  // Handle Confirmation of Renewal & Review Message Dispatch
  const handleConfirmRenewalAndReview = () => {
    if (!renewingCustomer) return;

    // Calculate new expiry date: today + renewalMonths
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + renewalMonths);
    const newExpiryStr = futureDate.toISOString().split('T')[0];

    const formattedNewExpiry = futureDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    // 1. Update Customer Record in Database
    onUpdateCustomer(renewingCustomer.id, {
      name: renewingCustomer.name,
      mobile: renewingCustomer.mobile,
      vehicleNumber: renewingCustomer.vehicleNumber,
      pucExpiryDate: newExpiryStr,
      notes: renewingCustomer.notes ? `${renewingCustomer.notes} (Renewed ${renewalMonths}m)` : `Renewed ${renewalMonths}m on ${new Date().toLocaleDateString('en-IN')}`
    });

    // 2. Format Review Request Message
    const rawMsg = `*Respected Sir/Madam,*

Greetings from *Government Approved SP Pollution Testing Centre*.

Thank you for choosing us for your *PUC Certificate*. We sincerely appreciate your trust and support.

If you are satisfied with our service, we kindly request you to leave us a *5-star review on Google Maps*. Your valuable feedback motivates our team and helps us serve more customers.

⭐ *Centre 1:* https://maps.app.goo.gl/p24pgEWbovgd6ZER7
⭐ *Centre 2:* https://maps.app.goo.gl/nTtN6vgsDrVZhFgf8

Thank you once again. We wish you *safe and happy driving!*

*SP Pollution Testing Centre*`;

    // 3. Open Channel
    const text = encodeURIComponent(rawMsg);
    const cleanNum = renewingCustomer.mobile.replace(/[^0-9]/g, '');
    const num = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum;

    if (renewChannel === 'WhatsApp' || renewChannel === 'Both') {
      window.open(`https://wa.me/${num}?text=${text}`, '_blank');
    } else {
      window.open(`sms:${renewingCustomer.mobile}?body=${text}`, '_blank');
    }

    // 4. Log Message
    onSendMessage([renewingCustomer.id], renewChannel, rawMsg);

    const custIdent = renewingCustomer.name || renewingCustomer.vehicleNumber;
    setRenewingCustomer(null);
    setSentSuccessNotice(`✅ PUC Renewed for ${renewalMonths === 12 ? '1 Year' : '6 Months'}! Google 5-Star Review link sent for ${custIdent}.`);
    setTimeout(() => setSentSuccessNotice(null), 5000);
  };

  // Preset Template Messages
  const setTemplate = (tpl: string) => {
    if (tpl === 'official_sp' || tpl === 'standard') {
      setMessageText(`Dear Sir/Madam,

Greetings from Government Approved SP Pollution Testing Centre.

This is a friendly reminder that your vehicle {vehicleNumber} PUC Certificate will expire on {pucExpiryDate} ({daysLeft} remaining).

Kindly visit our Government Approved SP Pollution Testing Centre, near Nayapalli Foot Over Bridge, Bhubaneswar, to renew your PUC Certificate at the earliest and avoid penalties under the Motor Vehicles Act.

📍 Centre 1: https://maps.app.goo.gl/p24pgEWbovgd6ZER7
📍 Centre 2: https://maps.app.goo.gl/nTtN6vgsDrVZhFgf8

Thank you!`);
    } else if (tpl === 'tomorrow') {
      setMessageText(`Dear Sir/Madam,

Your vehicle {vehicleNumber} PUC Certificate will expire tomorrow ({pucExpiryDate}).

Kindly visit our Government Approved SP Pollution Testing Centre, near Nayapalli Foot Over Bridge, Bhubaneswar, to renew your PUC Certificate at the earliest and avoid penalties under the Motor Vehicles Act.

📍 Centre 1: https://maps.app.goo.gl/p24pgEWbovgd6ZER7
📍 Centre 2: https://maps.app.goo.gl/nTtN6vgsDrVZhFgf8

Thank you!`);
    } else if (tpl === 'today') {
      setMessageText(`Dear Sir/Madam,

Your vehicle {vehicleNumber} PUC Certificate has expired today ({pucExpiryDate}).

Kindly visit our Government Approved SP Pollution Testing Centre, near Nayapalli Foot Over Bridge, Bhubaneswar, to renew your PUC Certificate at the earliest and avoid penalties under the Motor Vehicles Act.

📍 Centre 1: https://maps.app.goo.gl/p24pgEWbovgd6ZER7
📍 Centre 2: https://maps.app.goo.gl/nTtN6vgsDrVZhFgf8

Thank you!`);
    } else if (tpl === 'expired') {
      setMessageText(`Dear Sir/Madam,

Your vehicle {vehicleNumber} PUC Certificate has EXPIRED on {pucExpiryDate}.

Kindly visit our Government Approved SP Pollution Testing Centre, near Nayapalli Foot Over Bridge, Bhubaneswar, to renew your PUC Certificate immediately and avoid penalties under the Motor Vehicles Act.

📍 Centre 1: https://maps.app.goo.gl/p24pgEWbovgd6ZER7
📍 Centre 2: https://maps.app.goo.gl/nTtN6vgsDrVZhFgf8

Thank you!`);
    } else if (tpl === 'googleReview') {
      setMessageText(`Respected Sir/Madam,

Greetings from Government Approved SP Pollution Testing Centre.

Thank you for choosing us for your PUC Certificate. We sincerely appreciate your trust and support.

If you are satisfied with our service, we kindly request you to leave us a 5-star review on Google Maps. Your valuable feedback motivates our team and helps us serve more customers.

⭐ Centre 1: https://maps.app.goo.gl/p24pgEWbovgd6ZER7
⭐ Centre 2: https://maps.app.goo.gl/nTtN6vgsDrVZhFgf8

Thank you once again. We wish you safe and happy driving!

SP Pollution Testing Centre`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Persistent Database & Backup Control Bar */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-700 shadow-md flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400 shrink-0">
            <Database className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-extrabold text-sm text-white">Database Status: Active & Secured</h3>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span> Persistent Store (No Data Loss)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Your vehicle database ({customers.length} records) is automatically saved and retained locally & on server. Never destroyed on refresh.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto">
          {onExportCSV && (
            <button
              onClick={onExportCSV}
              className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              title="Export all vehicle records as CSV (Excel)"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export CSV</span>
            </button>
          )}

          {onImportCSV && (
            <>
              <input
                type="file"
                ref={csvFileInputRef}
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    const text = evt.target?.result as string;
                    if (text && onImportCSV) {
                      const res = onImportCSV(text);
                      if (res.success) {
                        setSentSuccessNotice(res.message);
                      } else {
                        setFormError(res.message);
                      }
                      setTimeout(() => setSentSuccessNotice(null), 5000);
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => csvFileInputRef.current?.click()}
                className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                title="Import records from CSV file"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Import CSV</span>
              </button>
            </>
          )}

          {onExportBackup && (
            <button
              onClick={onExportBackup}
              className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              title="Download full JSON Database Backup"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>JSON Backup</span>
            </button>
          )}

          {onImportBackup && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    const text = evt.target?.result as string;
                    if (text) {
                      const res = onImportBackup(text);
                      if (res.success) {
                        setSentSuccessNotice(res.message);
                      } else {
                        setFormError(res.message);
                      }
                      setTimeout(() => setSentSuccessNotice(null), 5000);
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                title="Restore database from JSON file"
              >
                <Upload className="w-3.5 h-3.5 text-purple-400" />
                <span>Restore JSON</span>
              </button>
            </>
          )}

          {onGenerateBatch && (
            <button
              onClick={() => {
                const res = onGenerateBatch(1000);
                setSentSuccessNotice(`⚡ Added ${res.count} test vehicle records! Total records in database: ${res.total}`);
                setTimeout(() => setSentSuccessNotice(null), 5000);
              }}
              className="flex-1 sm:flex-initial bg-amber-500 hover:bg-amber-600 text-slate-950 px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
              title="Test database with 1,000 generated vehicle records"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+1,000 Test Records</span>
            </button>
          )}
        </div>
      </div>

      {/* Notice & Error Alert Banners */}
      {noticeBanner && (
        <div className="bg-amber-500 text-slate-950 px-4 py-3 rounded-xl shadow-md font-bold text-xs flex items-center justify-between gap-2 border border-amber-300 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-slate-950 shrink-0" />
            <span>{noticeBanner}</span>
          </div>
          <button onClick={() => setNoticeBanner(null)} className="text-slate-950 font-black text-sm hover:opacity-75">✕</button>
        </div>
      )}

      {sentSuccessNotice && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-md font-bold text-xs flex items-center justify-between gap-2 border border-emerald-400 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
            <span>{sentSuccessNotice}</span>
          </div>
          <button onClick={() => setSentSuccessNotice(null)} className="text-white font-black text-sm hover:opacity-75">✕</button>
        </div>
      )}

      {/* Owner Expiry Alert Banner (Expiring Tomorrow & Today Highlights) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6 rounded-2xl border border-slate-700 shadow-lg relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-emerald-500 text-slate-950 font-black text-[11px] px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border border-emerald-300">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-950" />
                <span>Govt. Approved Testing Centre</span>
              </span>
              <span className="bg-amber-500 text-slate-950 font-black text-[11px] px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                <span>Next Day Expiry Alert</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">Today: {new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
            </div>

            <h2 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight flex flex-wrap items-baseline gap-1.5 sm:gap-2">
              <span>SP Vehicle Messaging</span>
              <span className="text-xs font-normal text-slate-400 whitespace-nowrap">(Govt. Authorized Pollution Centre)</span>
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed">
              Official Government Approved Pollution Testing Centre (Near Nayapalli Footover Bridge). Track customer vehicles expiring <strong className="text-amber-400">tomorrow ({tomorrowCount})</strong>, <strong className="text-rose-400">today ({todayCount})</strong>, or <strong className="text-rose-300">expired ({expiredCount})</strong> and send professional reminders to build trust and grow your business.
            </p>

            {/* Quick Metrics Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => setFilterTab('TOMORROW')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 whitespace-nowrap ${
                  filterTab === 'TOMORROW' 
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black' 
                    : 'bg-slate-800/80 text-amber-300 border-amber-500/30 hover:bg-slate-700'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                <span>Expiring Tomorrow:</span>
                <span className="bg-slate-950 text-amber-300 px-2 py-0.5 rounded-full font-mono font-black">{tomorrowCount}</span>
              </button>

              <button
                onClick={() => setFilterTab('TODAY')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 whitespace-nowrap ${
                  filterTab === 'TODAY' 
                    ? 'bg-rose-600 text-white border-rose-500' 
                    : 'bg-slate-800/80 text-rose-300 border-rose-500/30 hover:bg-slate-700'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Expiring Today:</span>
                <span className="bg-slate-950 text-rose-300 px-2 py-0.5 rounded-full font-mono font-black">{todayCount}</span>
              </button>

              <button
                onClick={() => setFilterTab('EXPIRED')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 whitespace-nowrap ${
                  filterTab === 'EXPIRED' 
                    ? 'bg-rose-900 text-white border-rose-700' 
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Expired:</span>
                <span className="bg-slate-950 text-rose-300 px-2 py-0.5 rounded-full font-mono font-black">{expiredCount}</span>
              </button>
            </div>
          </div>

          {/* Quick Action Button for Tomorrow's Expirations */}
          <div className="w-full lg:w-auto flex flex-col gap-2 shrink-0">
            <button
              onClick={handleSelectTomorrowExpirations}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black px-5 py-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer transition-all border border-amber-300"
            >
              <Send className="w-4 h-4 fill-slate-950" />
              <span>Remind Tomorrow's Expirations ({tomorrowCount})</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors border border-blue-400/30"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vehicle Record</span>
            </button>
          </div>

        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* GOOGLE REVIEW & FEEDBACK COLLECTOR WIDGET */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-sm space-y-4 relative overflow-hidden bg-gradient-to-r from-amber-50/40 via-white to-amber-50/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md border border-amber-400/40 shrink-0">
              <Star className="w-5 h-5 fill-white text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                  <span>Google Review & Feedback Collector</span>
                </h3>
                <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> 5-Star Rating Booster
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Send real thank-you WhatsApp & SMS messages after PUC renewal with your direct Google Maps review link. Rapidly boosts local rank for <strong className="text-slate-800 font-bold">"Pollution Testing Centre near Nayapalli"</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setBroadcastMessageCustom(`Dear Vehicle Owner, thank you for renewing your vehicle PUC at Govt. Approved SP Pollution Testing Centre (Nayapalli)! Please spare 30 seconds to rate us 5-stars on Google Maps: ${googleReviewLink} . Your review helps us serve you better!`);
                setIsRealBroadcastModalOpen(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Real Broadcast Review Request</span>
            </button>
          </div>
        </div>

        {/* Google Maps Review Link Editor Bar */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <span className="font-bold text-slate-700 shrink-0 flex items-center gap-1">
              <ThumbsUp className="w-3.5 h-3.5 text-blue-600" />
              <span>Google Maps Review URL:</span>
            </span>

            {isEditingReviewLink ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="url"
                  value={reviewLinkInput}
                  onChange={(e) => setReviewLinkInput(e.target.value)}
                  placeholder="https://g.page/r/sp-pollution-testing-nayapalli/review"
                  className="w-full px-3 py-1.5 bg-white border border-blue-400 rounded-lg text-slate-900 font-mono text-xs focus:outline-none"
                />
                <button
                  onClick={handleSaveReviewLink}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg shrink-0 cursor-pointer"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setReviewLinkInput(googleReviewLink);
                    setIsEditingReviewLink(false);
                  }}
                  className="bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg shrink-0 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <span className="font-mono text-blue-700 font-semibold truncate bg-white px-2.5 py-1 rounded border border-slate-200">
                {googleReviewLink}
              </span>
            )}
          </div>

          {!isEditingReviewLink && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyReviewLink}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedReviewLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-extrabold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <a
                href={googleReviewLink}
                target="_blank"
                rel="noreferrer"
                className="bg-white hover:bg-slate-100 text-blue-700 border border-blue-300 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                <span>Test Link</span>
              </a>

              <button
                onClick={() => setIsEditingReviewLink(true)}
                className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-200 cursor-pointer transition-colors"
                title="Edit Google Review Link"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {sentSuccessNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{sentSuccessNotice}</span>
        </div>
      )}

      {/* Filter Tabs & Search / Sort Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
            <button
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                filterTab === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Contacts ({customers.length})
            </button>

            <button
              onClick={() => setFilterTab('RECORDED_TODAY')}
              className={`px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'RECORDED_TODAY' ? 'bg-emerald-600 text-white font-black' : 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>Added Today ({recordedTodayCount})</span>
            </button>

            <button
              onClick={() => setFilterTab('TOMORROW')}
              className={`px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'TOMORROW' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              <span>Expiring Tomorrow ({tomorrowCount})</span>
            </button>

            <button
              onClick={() => setFilterTab('TODAY')}
              className={`px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterTab === 'TODAY' ? 'bg-rose-600 text-white font-black' : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              <span>Expiring Today ({todayCount})</span>
            </button>

            <button
              onClick={() => setFilterTab('WEEK')}
              className={`px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                filterTab === 'WEEK' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              In 7 Days ({weekCount})
            </button>

            <button
              onClick={() => setFilterTab('EXPIRED')}
              className={`px-3 py-2 rounded-xl transition-colors cursor-pointer ${
                filterTab === 'EXPIRED' ? 'bg-rose-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Expired ({expiredCount})
            </button>
          </div>

          {selectedCustomerIds.length > 0 && (
            <button
              onClick={() => setIsComposeOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Send Message to {selectedCustomerIds.length} Contact(s)</span>
            </button>
          )}
        </div>

        {/* Search Input & Sort Dropdown */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Name, Mobile, Vehicle # or Date"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
              <span>Sort By:</span>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="recent">⚡ Newly Recorded First (Latest on Top)</option>
              <option value="expiring_soonest">Expiring Soonest (Tomorrow / Next Day First)</option>
              <option value="expiring_tomorrow">Expiring Tomorrow First</option>
              <option value="expired">Expired Records First</option>
              <option value="name_asc">Customer Name (A-Z)</option>
              <option value="vehicle_asc">Vehicle Number (A-Z)</option>
            </select>

            <button
              onClick={handleSelectAll}
              className="text-xs font-semibold text-slate-700 hover:text-blue-600 flex items-center gap-1 cursor-pointer pl-2 border-l border-slate-200"
            >
              {selectedCustomerIds.length > 0 && selectedCustomerIds.length === sortedCustomers.length ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span className="hidden sm:inline">Select All</span>
            </button>
          </div>

        </div>
      </div>

      {/* Pagination & Summary Bar */}
      {sortedCustomers.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span>Showing <strong className="text-slate-900 font-extrabold">{pageSize === -1 ? 1 : (safeCurrentPage - 1) * pageSize + 1}</strong> - <strong className="text-slate-900 font-extrabold">{pageSize === -1 ? totalItems : Math.min(safeCurrentPage * pageSize, totalItems)}</strong> of <strong className="text-blue-700 font-black">{totalItems}</strong> matching vehicles</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-semibold text-[11px]">Per Page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 font-bold text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={-1}>All ({totalItems})</option>
              </select>
            </div>

            {pageSize !== -1 && totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  ◀ Prev
                </button>
                <span className="font-extrabold text-slate-800 px-1">
                  {safeCurrentPage} / {totalPages}
                </span>
                <button
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  Next ▶
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contacts List Grid */}
      {sortedCustomers.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
          <Car className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-base">No Matching Contacts</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm ? `No records match search "${searchTerm}".` : 'No contacts found under this filter.'}
          </p>
          <button
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle Record</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedCustomers.map(c => {
              const isSelected = selectedCustomerIds.includes(c.id);
              const expiry = getExpiryDetails(c.pucExpiryDate);
              const entryInfo = formatEntryDateTime(c.createdAt);

            return (
              <div
                key={c.id}
                className={`bg-white rounded-2xl border p-5 shadow-sm transition-all relative flex flex-col justify-between ${
                  isSelected 
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20' 
                    : entryInfo.isToday
                    ? 'border-emerald-400 bg-emerald-50/10 ring-1 ring-emerald-400/30'
                    : expiry.status === 'TOMORROW'
                    ? 'border-amber-400 bg-amber-50/20 ring-1 ring-amber-400/30'
                    : expiry.status === 'TODAY'
                    ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-400/30'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleSelect(c.id)}
                        className="text-slate-400 hover:text-blue-600 cursor-pointer shrink-0 mt-0.5"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-300" />
                        )}
                      </button>

                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5 font-mono">
                            <Car className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="text-blue-700 font-extrabold tracking-wide">{c.vehicleNumber}</span>
                          </h3>
                          {entryInfo.isToday && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Sparkles className="w-3 h-3 text-emerald-600 animate-pulse" />
                              <span>Added Today ({entryInfo.timeStr})</span>
                            </span>
                          )}
                        </div>
                        {c.name && (
                          <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1 font-medium">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{c.name}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        title="Edit Record"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingCustomer(c)}
                        title="Delete Customer Record"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* PUC Expiry Status Badge & Entry Date Time */}
                  <div className="py-3 space-y-2 text-xs text-slate-600">
                    
                    {/* Entry Date and Time Badge */}
                    {entryInfo.isToday ? (
                      <div className="flex flex-wrap items-center justify-between gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-xs text-emerald-950">
                        <span className="flex items-center gap-1 font-extrabold text-emerald-800 text-[11px] shrink-0">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Vehicle Data Entered:
                        </span>
                        <span className="font-mono font-black text-emerald-900 text-[11px]">
                          Today at {entryInfo.timeStr} ({entryInfo.dateStr})
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-1 bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-1 text-xs text-slate-700">
                        <span className="flex items-center gap-1 font-medium text-slate-500 text-[11px] shrink-0">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" /> Vehicle Data Entered:
                        </span>
                        <span className="font-mono font-bold text-slate-800 text-[11px]">
                          {entryInfo.formatted}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-1 pt-1">
                      <span className="text-slate-500 font-semibold flex items-center gap-1 shrink-0">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" /> PUC Expiry Date:
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {expiry.formattedDate || 'Not Set'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-slate-500 font-semibold flex items-center gap-1 shrink-0">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Expiry Status:
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full border text-[11px] uppercase shrink-0 ${expiry.badgeBg}`}>
                        {expiry.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1 pt-1">
                      <span className="text-slate-400 flex items-center gap-1 shrink-0">
                        <Phone className="w-3.5 h-3.5 shrink-0" /> Mobile:
                      </span>
                      <span className="font-mono font-bold text-slate-900">{c.mobile}</span>
                    </div>

                    {c.notes && (
                      <div className="bg-slate-50 p-2 rounded-lg text-[11px] text-slate-600 border border-slate-100 mt-1 break-words">
                        <span className="font-semibold text-slate-700">Note: </span>
                        {c.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Instant Messaging & Google Review Actions */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleOpenWhatsApp(c)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => handleOpenSMS(c)}
                      className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                    >
                      <Send className="w-3.5 h-3.5 text-blue-400" />
                      <span>Send SMS</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setRenewingCustomer(c);
                      setRenewalMonths(12);
                    }}
                    className="w-full bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-extrabold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                  >
                    <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                    <span>Renew PUC & Send Google Review</span>
                  </button>
                </div>
              </div>
            );
          })}
          </div>

          {/* Bottom Pagination Bar */}
          {pageSize !== -1 && totalPages > 1 && (
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 font-semibold text-[11px]">
                Page <strong className="text-slate-800 font-extrabold">{safeCurrentPage}</strong> of <strong className="text-slate-800 font-extrabold">{totalPages}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer transition-colors shadow-xs"
                >
                  ◀ Previous Page
                </button>
                <button
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 cursor-pointer transition-colors shadow-xs"
                >
                  Next Page ▶
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* ADD / EDIT RECORD MODAL */}
      {/* ------------------------------------------------------------- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-600" />
                <span>{editingCustomer ? 'Edit Vehicle Contact' : 'Add New Vehicle Contact'}</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {formError && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-xl border border-rose-200 font-bold text-xs flex items-center justify-between">
                  <span>{formError}</span>
                  <button type="button" onClick={() => setFormError(null)} className="text-rose-700 font-extrabold">✕</button>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="e.g. 9861012345"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Vehicle Registration Number *</label>
                <input
                  type="text"
                  required
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                  placeholder="e.g. OD02AB1234"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-bold uppercase text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>PUC Expiry Date</span>
                  <span className="text-[10px] text-amber-600 font-bold">Calculates Days Left Automatically</span>
                </label>
                <input
                  type="date"
                  value={formData.pucExpiryDate}
                  onChange={(e) => setFormData({ ...formData, pucExpiryDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Remarks (Optional)</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Swift Dzire Petrol"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
                >
                  {editingCustomer ? 'Update Contact' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* COMPOSE MESSAGE MODAL */}
      {/* ------------------------------------------------------------- */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                  <Send className="w-5 h-5 text-emerald-600" />
                  <span>Send Message to {selectedCustomerIds.length} Contact(s)</span>
                </h3>
                <p className="text-[11px] text-slate-500">Dispatch WhatsApp or SMS message to selected vehicle records.</p>
              </div>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Channel Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Messaging Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMessageChannel('WhatsApp')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      messageChannel === 'WhatsApp'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 border-slate-300 text-slate-600'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMessageChannel('SMS')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      messageChannel === 'SMS'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 border-slate-300 text-slate-600'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5 text-blue-600" />
                    <span>SMS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMessageChannel('Both')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      messageChannel === 'Both'
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-600'
                    }`}
                  >
                    <span>Both</span>
                  </button>
                </div>
              </div>

              {/* Quick Template Presets */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Quick Expiry Presets</label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTemplate('official_sp')}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-black cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3 text-blue-200" />
                    <span>Official SP Notice</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplate('tomorrow')}
                    className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[11px] font-bold cursor-pointer border border-amber-300"
                  >
                    Tomorrow Expiry
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplate('today')}
                    className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-lg text-[11px] font-bold cursor-pointer border border-rose-300"
                  >
                    Today Expiry
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplate('expired')}
                    className="px-2.5 py-1 bg-rose-900 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                  >
                    Expired Warning
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplate('standard')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold cursor-pointer"
                  >
                    Standard Reminder
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemplate('googleReview')}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold cursor-pointer flex items-center gap-1"
                  >
                    <Star className="w-3 h-3 text-amber-600 fill-amber-500" />
                    <span>Google 5-Star Review</span>
                  </button>
                </div>
              </div>

              {/* Message Text Area */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Message Text</label>
                  <div className="flex items-center gap-1 text-[10px] flex-wrap">
                    <span className="text-slate-400 font-normal">Insert tag:</span>
                    <button
                      type="button"
                      onClick={() => setMessageText(prev => prev + ' {vehicleNumber}')}
                      className="px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-mono font-bold rounded border border-blue-200 cursor-pointer"
                    >
                      &#123;vehicleNumber&#125;
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessageText(prev => prev + ' {expiryStatus}')}
                      className="px-1.5 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-mono font-bold rounded border border-purple-200 cursor-pointer"
                      title="Auto-expands to 'will expire tomorrow (06 Aug)', 'has expired today (05 Aug)', or 'has EXPIRED on (date)'"
                    >
                      &#123;expiryStatus&#125;
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessageText(prev => prev + ' {pucExpiryDate}')}
                      className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-mono font-bold rounded border border-amber-200 cursor-pointer"
                    >
                      &#123;pucExpiryDate&#125;
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessageText(prev => prev + ' {daysLeft}')}
                      className="px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-mono font-bold rounded border border-emerald-200 cursor-pointer"
                    >
                      &#123;daysLeft&#125;
                    </button>
                  </div>
                </div>
                <textarea
                  rows={5}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Enter message text..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDispatchMessage}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch Message</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DELETE CUSTOMER CONFIRMATION MODAL */}
      {/* ------------------------------------------------------------- */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Delete Customer Record?</h3>
                <p className="text-xs text-slate-500">This action will remove the record from your database permanently.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1 font-medium">
              <p className="font-extrabold text-slate-900 text-sm">{deletingCustomer.name}</p>
              <p className="font-mono text-blue-700 font-bold">{deletingCustomer.vehicleNumber}</p>
              <p className="text-slate-600 font-mono">Mobile: {deletingCustomer.mobile}</p>
              {deletingCustomer.pucExpiryDate && (
                <p className="text-amber-700 font-medium">PUC Expiry: {deletingCustomer.pucExpiryDate}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingCustomer(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCustomer(deletingCustomer.id);
                  setSelectedCustomerIds(prev => prev.filter(id => id !== deletingCustomer.id));
                  setDeletingCustomer(null);
                  setSentSuccessNotice('Customer record deleted successfully from database.');
                  setTimeout(() => setSentSuccessNotice(null), 4000);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm"
              >
                Yes, Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* REAL BROADCAST REVIEW REQUEST MODAL */}
      {/* ------------------------------------------------------------- */}
      {isRealBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-fadeIn max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shrink-0 shadow-md">
                  <Star className="w-5 h-5 fill-slate-950" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Real Broadcast Review Request</h3>
                  <p className="text-xs text-slate-500">Dispatch Google Maps 5-star review request to customer contacts.</p>
                </div>
              </div>
              <button
                onClick={() => setIsRealBroadcastModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Google Maps Review Link</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={googleReviewLink}
                    onChange={(e) => {
                      setGoogleReviewLink(e.target.value);
                      localStorage.setItem('sp_google_review_link', e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleCopyReviewLink}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedReviewLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedReviewLink ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-700">Dispatch Review Request to ({selectedCustomerIds.length > 0 ? selectedCustomerIds.length : customers.length}) Records</label>
                  {selectedCustomerIds.length === 0 && (
                    <span className="text-[10px] text-amber-700 bg-amber-50 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                      Showing All {customers.length} Records
                    </span>
                  )}
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                  {(selectedCustomerIds.length > 0
                    ? customers.filter(c => selectedCustomerIds.includes(c.id))
                    : customers
                  ).map((c) => {
                    const reviewMsg = `*Respected Sir/Madam,*

Greetings from *Government Approved SP Pollution Testing Centre*.

Thank you for choosing us for your *PUC Certificate*. We sincerely appreciate your trust and support.

If you are satisfied with our service, we kindly request you to leave us a *5-star review on Google Maps*. Your valuable feedback motivates our team and helps us serve more customers.

⭐ *Centre 1:* https://maps.app.goo.gl/p24pgEWbovgd6ZER7
⭐ *Centre 2:* https://maps.app.goo.gl/nTtN6vgsDrVZhFgf8

Thank you once again. We wish you *safe and happy driving!*

*SP Pollution Testing Centre*`;
                    const cleanNum = c.mobile.replace(/[^0-9]/g, '');
                    const num = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum;

                    return (
                      <div key={c.id} className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-extrabold text-blue-700 text-xs">{c.vehicleNumber}</span>
                            {c.name && <span className="font-bold text-slate-800 text-xs">({c.name})</span>}
                          </div>
                          <p className="text-[11px] text-slate-500 font-mono">Mobile: {c.mobile}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={`https://wa.me/${num}?text=${encodeURIComponent(reviewMsg)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              onSendMessage([c.id], 'WhatsApp', reviewMsg);
                              setSentSuccessNotice(`Dispatched WhatsApp Review link to ${c.vehicleNumber}`);
                              setTimeout(() => setSentSuccessNotice(null), 3000);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>

                          <a
                            href={`sms:${c.mobile}?body=${encodeURIComponent(reviewMsg)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              onSendMessage([c.id], 'SMS', reviewMsg);
                              setSentSuccessNotice(`Dispatched SMS Review link to ${c.vehicleNumber}`);
                              setTimeout(() => setSentSuccessNotice(null), 3000);
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>SMS</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-between border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const allMsgs = (selectedCustomerIds.length > 0
                    ? customers.filter(c => selectedCustomerIds.includes(c.id))
                    : customers
                  ).map(c => {
                    return `${c.vehicleNumber} (${c.mobile}):
Respected Sir/Madam,

Greetings from Government Approved SP Pollution Testing Centre.

Thank you for choosing us for your PUC Certificate. We sincerely appreciate your trust and support.

If you are satisfied with our service, we kindly request you to leave us a 5-star review on Google Maps. Your valuable feedback motivates our team and helps us serve more customers.

⭐ Centre 1: https://maps.app.goo.gl/p24pgEWbovgd6ZER7
⭐ Centre 2: https://maps.app.goo.gl/nTtN6vgsDrVZhFgf8

Thank you once again. We wish you safe and happy driving!

SP Pollution Testing Centre`;
                  }).join('\n\n-------------------------\n\n');

                  navigator.clipboard.writeText(allMsgs);
                  setSentSuccessNotice('Copied all review request messages to clipboard!');
                  setTimeout(() => setSentSuccessNotice(null), 4000);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5 text-slate-600" />
                <span>Copy All Review Texts</span>
              </button>

              <button
                type="button"
                onClick={() => setIsRealBroadcastModalOpen(false)}
                className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ------------------------------------------------------------- */}
      {renewingCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shrink-0 shadow-md">
                  <Star className="w-5 h-5 fill-slate-950" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Renew PUC & Send Google Review</h3>
                  <p className="text-xs text-slate-500">Update customer renewal date & dispatch automated 5-star Google review link.</p>
                </div>
              </div>
              <button
                onClick={() => setRenewingCustomer(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-sm">{renewingCustomer.name}</span>
                  <span className="font-mono text-blue-700 font-extrabold">{renewingCustomer.vehicleNumber}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Mobile: <strong className="font-mono text-slate-800">{renewingCustomer.mobile}</strong></span>
                  <span>Previous Expiry: <strong className="text-rose-700 font-mono">{renewingCustomer.pucExpiryDate || 'None'}</strong></span>
                </div>
              </div>

              {/* Renewal Duration Picker */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Select PUC Renewal Duration</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRenewalMonths(6)}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                      renewalMonths === 6
                        ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-extrabold text-sm">6 Months</span>
                    <span className="text-[10px] text-slate-500 font-normal">Standard Petrol/Diesel Vehicles</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRenewalMonths(12)}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                      renewalMonths === 12
                        ? 'bg-amber-50 border-amber-500 text-amber-950 ring-2 ring-amber-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-extrabold text-sm">1 Year (12 Months)</span>
                    <span className="text-[10px] text-slate-500 font-normal">BS-VI / Commercial / New Vehicles</span>
                  </button>
                </div>
              </div>

              {/* Channel Picker */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Dispatch Channel</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRenewChannel('WhatsApp')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      renewChannel === 'WhatsApp'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRenewChannel('SMS')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      renewChannel === 'SMS'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5 text-blue-600" />
                    <span>SMS</span>
                  </button>
                </div>
              </div>

              {/* Review Message Preview */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Generated Thank-You & Review Request Message</label>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700 font-sans text-xs leading-relaxed space-y-1">
                  <p>
                    Dear <strong>{renewingCustomer.name}</strong>, thank you for renewing your vehicle <strong>{renewingCustomer.vehicleNumber}</strong> PUC at Govt. Approved SP Pollution Testing Centre (Nayapalli)! Your new PUC Expiry Date is <strong>{
                      (() => {
                        const d = new Date();
                        d.setMonth(d.getMonth() + renewalMonths);
                        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                      })()
                    }</strong>.
                  </p>
                  <p className="text-amber-900 font-medium">
                    Please spare 30 seconds to rate us 5-stars on Google Maps: <span className="font-mono text-blue-700 underline break-all">{googleReviewLink}</span> . Your review helps us serve you better!
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRenewingCustomer(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRenewalAndReview}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Star className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Confirm Renewal & Dispatch Review Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* AUTOMATED BATCH MESSAGE DISPATCHER MODAL */}
      {/* ------------------------------------------------------------- */}
      {isBatchDispatcherOpen && batchQueue.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-fadeIn max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black shrink-0 shadow-md">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Automatic Message Dispatcher Queue</h3>
                  <p className="text-xs text-slate-500">Sequential sender for {batchQueue.length} selected vehicle contacts.</p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchDispatcherOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Queue Progress Bar */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2 shrink-0">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-800">
                  Contact {batchIndex + 1} of {batchQueue.length}
                </span>
                <span className="font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {batchQueue.filter(item => item.status === 'sent').length} Sent • {batchQueue.filter(item => item.status === 'pending').length} Pending
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-600 h-full transition-all duration-300"
                  style={{ width: `${((batchIndex + 1) / batchQueue.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Current Target Contact Card */}
            {batchIndex < batchQueue.length ? (
              <div className="bg-white border-2 border-emerald-500/80 rounded-2xl p-4 space-y-3 shadow-md flex-1 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <span className="font-mono font-black text-blue-700 text-sm bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {batchQueue[batchIndex].customer.vehicleNumber}
                    </span>
                    {batchQueue[batchIndex].customer.name && (
                      <span className="font-bold text-slate-800 text-xs ml-2">
                        ({batchQueue[batchIndex].customer.name})
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-xs text-slate-600 font-bold">
                    Mobile: {batchQueue[batchIndex].customer.mobile}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Personalized Message Preview:</label>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs whitespace-pre-wrap leading-relaxed">
                    {batchQueue[batchIndex].formattedMsg}
                  </div>
                </div>

                {/* Primary Action Buttons for Current Contact */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const item = batchQueue[batchIndex];
                      const cleanNum = item.customer.mobile.replace(/[^0-9]/g, '');
                      const num = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum;
                      
                      window.open(`https://wa.me/${num}?text=${encodeURIComponent(item.formattedMsg)}`, '_blank');
                      
                      onSendMessage([item.customer.id], 'WhatsApp', item.formattedMsg);
                      
                      // Update queue state
                      setBatchQueue(prev => prev.map((q, idx) => idx === batchIndex ? { ...q, status: 'sent' } : q));
                      
                      setSentSuccessNotice(`Dispatched & logged WhatsApp message for ${item.customer.vehicleNumber}!`);
                      setTimeout(() => setSentSuccessNotice(null), 3000);

                      if (batchIndex + 1 < batchQueue.length) {
                        setBatchIndex(prev => prev + 1);
                      }
                    }}
                    className="w-full sm:flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Send WhatsApp & Next ▶</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const item = batchQueue[batchIndex];
                      window.open(`sms:${item.customer.mobile}?body=${encodeURIComponent(item.formattedMsg)}`, '_blank');
                      
                      onSendMessage([item.customer.id], 'SMS', item.formattedMsg);
                      
                      setBatchQueue(prev => prev.map((q, idx) => idx === batchIndex ? { ...q, status: 'sent' } : q));
                      
                      setSentSuccessNotice(`Dispatched & logged SMS for ${item.customer.vehicleNumber}!`);
                      setTimeout(() => setSentSuccessNotice(null), 3000);

                      if (batchIndex + 1 < batchQueue.length) {
                        setBatchIndex(prev => prev + 1);
                      }
                    }}
                    className="w-full sm:flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send SMS & Next ▶</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (batchIndex + 1 < batchQueue.length) {
                        setBatchIndex(prev => prev + 1);
                      }
                    }}
                    className="w-full sm:w-auto py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Skip
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="font-extrabold text-slate-900 text-base">Batch Message Dispatch Completed!</h4>
                <p className="text-xs text-slate-600">All {batchQueue.length} messages have been dispatched and saved to your cloud database.</p>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  const allFormatted = batchQueue.map(item => 
                    `[${item.customer.vehicleNumber} - ${item.customer.mobile}]\n${item.formattedMsg}`
                  ).join('\n\n-------------------------\n\n');

                  navigator.clipboard.writeText(allFormatted);
                  setSentSuccessNotice(`Copied all ${batchQueue.length} personalized messages to clipboard!`);
                  setTimeout(() => setSentSuccessNotice(null), 4000);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy All Messages</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBatchDispatcherOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
