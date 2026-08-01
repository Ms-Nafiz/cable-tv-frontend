import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Search, DollarSign, CheckCircle2, User, X, Loader2, Banknote, Wallet, Building2, Phone, MapPin, Printer, CheckSquare, Square } from 'lucide-react';
import ReceiptModal from '../../components/ReceiptModal';

const QuickCollectionPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Selected customer & bills state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [unpaidBills, setUnpaidBills] = useState([]);
  const [selectedBillIds, setSelectedBillIds] = useState([]);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [error, setError] = useState(null);

  const searchContainerRef = useRef(null);

  // Close search suggestions dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live Customer Search Autocomplete
  useEffect(() => {
    if (!searchTerm.trim() || (selectedCustomer && searchTerm === `${selectedCustomer.customer_code} - ${selectedCustomer.name}`)) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get('/collector/customers', {
          params: { search: searchTerm }
        });
        setSuggestions(res.data);
        setShowDropdown(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedCustomer]);

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowDropdown(false);
    setSearchTerm(`${customer.customer_code} - ${customer.name}`);

    // Process unpaid / partial bills
    const dueBills = (customer.bills || []).map((b) => {
      const paid = b.payments ? b.payments.reduce((acc, p) => acc + parseFloat(p.amount_paid), 0) : 0;
      const due = Math.max(0, parseFloat(b.amount) - paid);
      return { ...b, due_amount: due };
    }).filter(b => b.due_amount > 0);

    setUnpaidBills(dueBills);

    // Select all due bills by default for fast multi-month collection!
    const allIds = dueBills.map(b => b.id);
    setSelectedBillIds(allIds);

    const totalSum = dueBills.reduce((acc, b) => acc + b.due_amount, 0);
    setAmountPaid(totalSum > 0 ? totalSum.toFixed(2) : parseFloat(customer.monthly_rent || 500).toFixed(2));
    setError(null);
  };

  const handleToggleBill = (billId) => {
    let updated;
    if (selectedBillIds.includes(billId)) {
      updated = selectedBillIds.filter(id => id !== billId);
    } else {
      updated = [...selectedBillIds, billId];
    }
    setSelectedBillIds(updated);

    // Update auto sum amount
    const sum = unpaidBills
      .filter(b => updated.includes(b.id))
      .reduce((acc, b) => acc + b.due_amount, 0);
    setAmountPaid(sum.toFixed(2));
  };

  const handleSelectAllBills = () => {
    if (selectedBillIds.length === unpaidBills.length) {
      setSelectedBillIds([]);
      setAmountPaid('0.00');
    } else {
      const allIds = unpaidBills.map(b => b.id);
      setSelectedBillIds(allIds);
      const totalSum = unpaidBills.reduce((acc, b) => acc + b.due_amount, 0);
      setAmountPaid(totalSum.toFixed(2));
    }
  };

  const handleReset = () => {
    setSelectedCustomer(null);
    setUnpaidBills([]);
    setSelectedBillIds([]);
    setAmountPaid('');
    setNotes('');
    setError(null);
    setSearchTerm('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (unpaidBills.length > 0 && selectedBillIds.length === 0 && (!amountPaid || parseFloat(amountPaid) <= 0)) {
      setError('Please select at least one bill month or enter an advance payment amount.');
      return;
    }

    if (!amountPaid || parseFloat(amountPaid) <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.post('/payments', {
        customer_id: selectedCustomer.id,
        bill_ids: selectedBillIds,
        amount_paid: amountPaid,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        notes: notes,
      });

      setReceiptPayment(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record collection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiptClose = () => {
    setReceiptPayment(null);
    handleReset();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100">Direct Bill & Advance Collection</h2>
        <p className="text-xs text-slate-400 mt-1">Search Customer ID to instantly collect single, multi-month dues or Advance Credit Payments.</p>
      </div>

      {/* 1. Live Autocomplete Customer Search Bar */}
      <div ref={searchContainerRef} className="relative z-30">
        <div className="relative">
          <Search className="w-5 h-5 text-cyan-400 absolute left-4 top-4" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (selectedCustomer && e.target.value !== `${selectedCustomer.customer_code} - ${selectedCustomer.name}`) {
                setSelectedCustomer(null);
              }
            }}
            placeholder="Type Customer ID (e.g. CCL00001), Phone, or Name..."
            className="w-full pl-12 pr-10 py-3.5 bg-slate-900 border-2 border-slate-800 focus:border-cyan-500 rounded-2xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none shadow-lg transition"
          />
          {isSearching ? (
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin absolute right-4 top-4" />
          ) : searchTerm ? (
            <button
              onClick={() => { setSearchTerm(''); setSuggestions([]); handleReset(); }}
              className="absolute right-4 top-4 text-slate-500 hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>
          ) : null}
        </div>

        {/* Live Autocomplete Dropdown List */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
            {suggestions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching subscribers found for "<span className="text-cyan-400 font-semibold">{searchTerm}</span>"
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className="w-full p-3.5 flex items-center justify-between hover:bg-cyan-500/10 text-left transition group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                          {c.customer_code}
                        </span>
                        <span className="font-semibold text-slate-100 text-sm group-hover:text-cyan-300 transition">
                          {c.name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>Phone: {c.phone}</span>
                        <span>•</span>
                        <span>Zone: {c.area?.name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Total Due</span>
                      <span className="text-xs font-bold text-rose-400">৳{parseFloat(c.total_due).toFixed(2)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Default Empty State */}
      {!selectedCustomer && !searchTerm && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
            <DollarSign className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-200 text-base">Direct & Advance Collection Mode</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Type Customer ID above (e.g. <code>CCL00001</code>) and select a subscriber to collect overdue bills or Advance Credit Payments.
          </p>
        </div>
      )}

      {/* 3. Direct Multi-Month & Advance Collection Form */}
      {selectedCustomer && (
        <div className="bg-slate-900 border-2 border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-5 animate-in fade-in duration-200">
          {/* Customer Header */}
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30">
                  {selectedCustomer.customer_code}
                </span>
                <span className="text-xs text-slate-400">{selectedCustomer.area?.name}</span>
              </div>
              <h3 className="font-bold text-slate-100 text-base mt-1">{selectedCustomer.name}</h3>
              <p className="text-xs text-slate-400">{selectedCustomer.phone}</p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to={`/customers/${selectedCustomer.id}`}
                target="_blank"
                className="text-xs text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20"
              >
                View Profile
              </Link>
              <button
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg bg-slate-800"
              >
                Search Another
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
              {error}
            </div>
          )}

          {unpaidBills.length === 0 && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
              <div className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                All Current Monthly Bills Paid!
              </div>
              <p className="text-xs text-slate-300">
                This subscriber has 0 outstanding dues. Enter an amount below to collect an <strong className="text-emerald-400">Advance Credit Payment</strong> which will auto-clear upcoming bills.
              </p>
              {parseFloat(selectedCustomer.advance_balance || 0) > 0 && (
                <div className="text-xs text-emerald-300 pt-1 font-semibold">
                  Existing Advance Credit Balance: ৳{parseFloat(selectedCustomer.advance_balance).toFixed(2)}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Multi-Month Checkbox Selection (Only if unpaid bills exist) */}
            {unpaidBills.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Select Overdue Bill Months ({unpaidBills.length} Available)
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllBills}
                    className="text-xs text-cyan-400 hover:underline font-medium"
                  >
                    {selectedBillIds.length === unpaidBills.length ? 'Deselect All' : 'Select All Dues'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-950/60 rounded-xl border border-slate-800">
                  {unpaidBills.map((b) => {
                    const isChecked = selectedBillIds.includes(b.id);
                    return (
                      <div
                        key={b.id}
                        onClick={() => handleToggleBill(b.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                          isChecked
                            ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
                            : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-cyan-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-500 shrink-0" />
                          )}
                          <span className="font-mono text-xs font-bold">{b.bill_month}</span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-rose-400">৳{b.due_amount.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Amount & Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {unpaidBills.length === 0
                    ? 'Advance Payment Amount (৳)'
                    : `Total Collection Amount (৳) — ${selectedBillIds.length} Month(s)`}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-lg font-bold text-emerald-400 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex flex-col justify-center">
                <div className="text-xs text-slate-400">Collection Purpose:</div>
                <div className="text-xs font-bold text-cyan-400 mt-1 truncate">
                  {unpaidBills.length === 0
                    ? 'Advance Credit Payment'
                    : selectedBillIds.length > 0
                    ? unpaidBills.filter(b => selectedBillIds.includes(b.id)).map(b => b.bill_month).join(', ')
                    : 'Advance Credit Payment'}
                </div>
              </div>
            </div>

            {/* Payment Method Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">Payment Method</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'cash', label: 'Cash', icon: Banknote },
                  { id: 'bkash', label: 'bKash', icon: Wallet },
                  { id: 'nagad', label: 'Nagad', icon: Wallet },
                  { id: 'bank', label: 'Bank', icon: Building2 },
                ].map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={`py-2.5 px-2 rounded-xl border flex flex-col items-center gap-1 text-xs font-semibold transition ${
                        paymentMethod === m.id
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Collection Date *</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Collection Notes / Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid via bKash TrxID #9X8A12 or Notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition"
            >
              {submitting
                ? 'Processing Collection...'
                : unpaidBills.length === 0
                ? `Confirm Advance Collection (৳${parseFloat(amountPaid || 0).toFixed(2)})`
                : `Confirm Collection (৳${parseFloat(amountPaid || 0).toFixed(2)})`}
            </button>
          </form>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {receiptPayment && (
        <ReceiptModal
          payment={receiptPayment}
          onClose={handleReceiptClose}
        />
      )}
    </div>
  );
};

export default QuickCollectionPage;
