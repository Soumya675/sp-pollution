import React, { useState } from 'react';
import { CustomerRecord } from '../types';
import { 
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
  RefreshCw
} from 'lucide-react';

interface CustomerMessagingViewProps {
  customers: CustomerRecord[];
  onAddCustomer: (customer: { name: string; mobile: string; vehicleNumber: string; pucExpiryDate?: string; notes?: string }) => void;
  onUpdateCustomer: (id: string, customer: { name: string; mobile: string; vehicleNumber: string; pucExpiryDate?: string; notes?: string }) => void;
  onDeleteCustomer: (id: string) => void;
  onSendMessage: (customerIds: string[], channel: 'WhatsApp' | 'SMS' | 'Both', message: string) => void;
  isLoading?: boolean;
}

export const CustomerMessagingView: React.FC<CustomerMessagingViewProps> = ({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onSendMessage,
  isLoading = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [filterTab, setFilterTab] = useState<'ALL' | 'TOMORROW' | 'TODAY' | 'WEEK' | 'EXPIRED'>('ALL');
  const [sortBy, setSortBy] = useState<'expiring_soonest' | 'expiring_tomorrow' | 'expired' | 'name_asc' | 'vehicle_asc' | 'recent'>('expiring_soonest');
  
  // Add / Edit Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [formData, setFormData] = useState({ name: '', mobile: '', vehicleNumber: '', pucExpiryDate: '', notes: '' });

  // Delete Confirmation State
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerRecord | null>(null);

  // General Notification / Banner state
  const [noticeBanner, setNoticeBanner] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Compose Message Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [messageChannel, setMessageChannel] = useState<'WhatsApp' | 'SMS' | 'Both'>('WhatsApp');
  const [messageText, setMessageText] = useState('Dear {name}, your vehicle {vehicleNumber} pollution certificate will expire in {daysLeft} (Date: {pucExpiryDate}). Kindly visit our Govt. Approved SP Pollution Testing Centre near Nayapalli footover Bridge.');
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

  // Counts for summary filter tabs
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
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = (
      c.name.toLowerCase().includes(q) ||
      c.mobile.includes(q) ||
      c.vehicleNumber.toLowerCase().includes(q) ||
      (c.pucExpiryDate && c.pucExpiryDate.includes(q))
    );

    if (!matchesSearch) return false;

    const details = getExpiryDetails(c.pucExpiryDate);
    if (filterTab === 'TOMORROW') return details.daysLeft === 1;
    if (filterTab === 'TODAY') return details.daysLeft === 0;
    if (filterTab === 'WEEK') return details.daysLeft !== null && details.daysLeft >= 0 && details.daysLeft <= 7;
    if (filterTab === 'EXPIRED') return details.daysLeft !== null && details.daysLeft < 0;

    return true;
  });

  // Sort contacts
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const daysA = getExpiryDetails(a.pucExpiryDate).daysLeft ?? 9999;
    const daysB = getExpiryDetails(b.pucExpiryDate).daysLeft ?? 9999;

    if (sortBy === 'expiring_soonest') {
      // Put 0 and 1 days at the very top, then other positive days, then expired
      return daysA - daysB;
    }
    if (sortBy === 'expiring_tomorrow') {
      if (daysA === 1) return -1;
      if (daysB === 1) return 1;
      return daysA - daysB;
    }
    if (sortBy === 'expired') {
      if (daysA < 0 && daysB >= 0) return -1;
      if (daysB < 0 && daysA >= 0) return 1;
      return daysA - daysB;
    }
    if (sortBy === 'name_asc') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === 'vehicle_asc') {
      return a.vehicleNumber.localeCompare(b.vehicleNumber);
    }
    if (sortBy === 'recent') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });

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
      name: c.name, 
      mobile: c.mobile, 
      vehicleNumber: c.vehicleNumber, 
      pucExpiryDate: c.pucExpiryDate || '', 
      notes: c.notes || '' 
    });
    setIsAddModalOpen(true);
  };

  // Submit Add/Edit Form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.mobile.trim() || !formData.vehicleNumber.trim()) {
      setFormError('Please fill in Name, Mobile Number, and Vehicle Number.');
      return;
    }

    if (editingCustomer) {
      onUpdateCustomer(editingCustomer.id, formData);
      setSentSuccessNotice(`Updated customer details for ${formData.name}`);
    } else {
      onAddCustomer(formData);
      setSentSuccessNotice(`Saved customer record for ${formData.name}`);
    }

    setIsAddModalOpen(false);
    setFormData({ name: '', mobile: '', vehicleNumber: '', pucExpiryDate: '', notes: '' });
    setTimeout(() => setSentSuccessNotice(null), 4000);
  };

  // Open Single Customer WhatsApp
  const handleOpenWhatsApp = (c: CustomerRecord) => {
    const details = getExpiryDetails(c.pucExpiryDate);
    const daysStr = details.daysLeft !== null
      ? (details.daysLeft < 0 ? `EXPIRED (${Math.abs(details.daysLeft)} days ago)` : details.daysLeft === 0 ? 'TODAY' : details.daysLeft === 1 ? 'TOMORROW (1 day)' : `${details.daysLeft} days`)
      : 'a few days';
    const rawMsg = `Dear ${c.name}, your vehicle ${c.vehicleNumber} pollution certificate will expire in ${daysStr} (Expiry Date: ${details.formattedDate || c.pucExpiryDate || 'N/A'}). Kindly visit our Govt. Approved SP Pollution Testing Centre near Nayapalli footover Bridge.`;
    const text = encodeURIComponent(rawMsg);
    const cleanNum = c.mobile.replace(/[^0-9]/g, '');
    const num = cleanNum.length === 10 ? `91${cleanNum}` : cleanNum;
    window.open(`https://wa.me/${num}?text=${text}`, '_blank');
    
    onSendMessage([c.id], 'WhatsApp', rawMsg);
    setSentSuccessNotice(`WhatsApp message sent & logged for ${c.name}!`);
    setTimeout(() => setSentSuccessNotice(null), 4000);
  };

  // Open Single Customer SMS
  const handleOpenSMS = (c: CustomerRecord) => {
    const details = getExpiryDetails(c.pucExpiryDate);
    const daysStr = details.daysLeft !== null
      ? (details.daysLeft < 0 ? `EXPIRED (${Math.abs(details.daysLeft)} days ago)` : details.daysLeft === 0 ? 'TODAY' : details.daysLeft === 1 ? 'TOMORROW (1 day)' : `${details.daysLeft} days`)
      : 'a few days';
    const rawMsg = `Dear ${c.name}, your vehicle ${c.vehicleNumber} pollution certificate will expire in ${daysStr} (Expiry Date: ${details.formattedDate || c.pucExpiryDate || 'N/A'}). Kindly visit our Govt. Approved SP Pollution Testing Centre near Nayapalli footover Bridge.`;
    const text = encodeURIComponent(rawMsg);
    window.open(`sms:${c.mobile}?body=${text}`, '_blank');
    
    onSendMessage([c.id], 'SMS', rawMsg);
    setSentSuccessNotice(`SMS sent & logged for ${c.name}!`);
    setTimeout(() => setSentSuccessNotice(null), 4000);
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

    onSendMessage(selectedCustomerIds, messageChannel, messageText);
    setIsComposeOpen(false);
    
    setSentSuccessNotice(`Message history logged & dispatched to ${selectedCustomerIds.length} contact(s)!`);
    setTimeout(() => setSentSuccessNotice(null), 5000);
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
    const rawMsg = `Dear ${renewingCustomer.name}, thank you for renewing your vehicle ${renewingCustomer.vehicleNumber} PUC at Govt. Approved SP Pollution Testing Centre (Nayapalli)! Your new PUC Expiry Date is ${formattedNewExpiry}. Please spare 30 seconds to rate us 5-stars on Google Maps: ${googleReviewLink} . Your review helps us serve you better!`;

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

    const custName = renewingCustomer.name;
    setRenewingCustomer(null);
    setSentSuccessNotice(`✅ PUC Renewed for ${renewalMonths === 12 ? '1 Year' : '6 Months'}! Google 5-Star Review link sent to ${custName}.`);
    setTimeout(() => setSentSuccessNotice(null), 5000);
  };

  // Preset Template Messages
  const setTemplate = (tpl: string) => {
    if (tpl === 'tomorrow') {
      setMessageText('Dear {name}, your vehicle {vehicleNumber} pollution certificate will expire TOMORROW ({pucExpiryDate}). Kindly visit our Govt. Approved SP Pollution Testing Centre near Nayapalli footover Bridge.');
    } else if (tpl === 'today') {
      setMessageText('URGENT: Dear {name}, your vehicle {vehicleNumber} pollution certificate expires TODAY ({pucExpiryDate}). Kindly visit our Govt. Approved SP Pollution Testing Centre near Nayapalli footover Bridge.');
    } else if (tpl === 'expired') {
      setMessageText('EXPIRED NOTICE: Dear {name}, your vehicle {vehicleNumber} pollution certificate has EXPIRED ({pucExpiryDate}). Kindly visit our Govt. Approved SP Pollution Testing Centre near Nayapalli footover Bridge.');
    } else if (tpl === 'standard') {
      setMessageText('Dear {name}, your vehicle {vehicleNumber} pollution certificate will expire in {daysLeft} (Date: {pucExpiryDate}). Kindly visit our Govt. Approved SP Pollution Testing Centre near Nayapalli footover Bridge.');
    } else if (tpl === 'googleReview') {
      setMessageText(`Dear {name}, thank you for renewing your vehicle {vehicleNumber} PUC at Govt. Approved SP Pollution Testing Centre (Nayapalli)! Please spare 30 seconds to rate us 5-stars on Google Maps: ${googleReviewLink} . Your feedback helps us serve you better!`);
    }
  };

  return (
    <div className="space-y-6">
      
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

            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>SP Vehicle Messaging</span>
              <span className="text-xs font-normal text-slate-400">(Govt. Authorized Pollution Centre)</span>
            </h2>

            <p className="text-xs text-slate-300 leading-relaxed">
              Official Government Approved Pollution Testing Centre (Near Nayapalli Footover Bridge). Track customer vehicles expiring <strong className="text-amber-400">tomorrow ({tomorrowCount})</strong>, <strong className="text-rose-400">today ({todayCount})</strong>, or <strong className="text-rose-300">expired ({expiredCount})</strong> and send professional reminders to build trust and grow your business.
            </p>

            {/* Quick Metrics Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={() => setFilterTab('TOMORROW')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  filterTab === 'TOMORROW' 
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black' 
                    : 'bg-slate-800/80 text-amber-300 border-amber-500/30 hover:bg-slate-700'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Expiring Tomorrow:</span>
                <span className="bg-slate-950 text-amber-300 px-2 py-0.2 rounded-full font-mono font-black">{tomorrowCount}</span>
              </button>

              <button
                onClick={() => setFilterTab('TODAY')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  filterTab === 'TODAY' 
                    ? 'bg-rose-600 text-white border-rose-500' 
                    : 'bg-slate-800/80 text-rose-300 border-rose-500/30 hover:bg-slate-700'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Expiring Today:</span>
                <span className="bg-slate-950 text-rose-300 px-2 py-0.2 rounded-full font-mono font-black">{todayCount}</span>
              </button>

              <button
                onClick={() => setFilterTab('EXPIRED')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  filterTab === 'EXPIRED' 
                    ? 'bg-rose-900 text-white border-rose-700' 
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Expired:</span>
                <span className="bg-slate-950 text-rose-300 px-2 py-0.2 rounded-full font-mono font-black">{expiredCount}</span>
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
                Send automated thank-you WhatsApp messages after PUC renewal with your direct Google Maps rating link. Rapidly boosts local rank for <strong className="text-slate-800 font-bold">"Pollution Testing Centre near Nayapalli"</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setTemplate('googleReview');
                if (selectedCustomerIds.length === 0 && customers.length > 0) {
                  setSelectedCustomerIds([customers[0].id]);
                }
                setIsComposeOpen(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Broadcast Review Request</span>
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
              <option value="expiring_soonest">Expiring Soonest (Tomorrow / Next Day First)</option>
              <option value="expiring_tomorrow">Expiring Tomorrow First</option>
              <option value="expired">Expired Records First</option>
              <option value="name_asc">Customer Name (A-Z)</option>
              <option value="vehicle_asc">Vehicle Number (A-Z)</option>
              <option value="recent">Recently Added</option>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedCustomers.map(c => {
            const isSelected = selectedCustomerIds.includes(c.id);
            const expiry = getExpiryDetails(c.pucExpiryDate);

            return (
              <div
                key={c.id}
                className={`bg-white rounded-2xl border p-5 shadow-sm transition-all relative flex flex-col justify-between ${
                  isSelected 
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20' 
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
                        <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                          <User className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{c.name}</span>
                        </h3>
                        <p className="text-xs font-mono font-bold text-blue-700 mt-0.5 flex items-center gap-1">
                          <Car className="w-3.5 h-3.5 text-blue-500" />
                          <span>{c.vehicleNumber}</span>
                        </p>
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

                  {/* PUC Expiry Status Badge */}
                  <div className="py-3 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> PUC Expiry Date:
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {expiry.formattedDate || 'Not Set'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> Expiry Status:
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full border text-[11px] uppercase ${expiry.badgeBg}`}>
                        {expiry.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> Mobile:
                      </span>
                      <span className="font-mono font-bold text-slate-900">{c.mobile}</span>
                    </div>

                    {c.notes && (
                      <div className="bg-slate-50 p-2 rounded-lg text-[11px] text-slate-600 border border-slate-100 mt-1">
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
                <label className="block font-bold text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rajesh Kumar Swain"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

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
                <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Message Text</span>
                  <span className="text-[10px] text-slate-400 font-normal">Tags: &#123;name&#125;, &#123;vehicleNumber&#125;, &#123;pucExpiryDate&#125;, &#123;daysLeft&#125;</span>
                </label>
                <textarea
                  rows={4}
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
      {/* QUICK PUC RENEWAL & GOOGLE REVIEW REQUEST MODAL */}
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

    </div>
  );
};
