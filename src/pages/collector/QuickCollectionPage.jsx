import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useQueryClient } from '@tanstack/react-query';
import { Search, DollarSign, CheckCircle2, AlertTriangle, User, X, Loader2, Banknote, Wallet, Building2, Phone, MapPin, Printer } from 'lucide-react';
import ReceiptModal from '../../components/ReceiptModal';
import { formatCurrency, formatBillMonth } from '../../utils/formatters';

const QuickCollectionPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Selected customer & bills state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [unpaidBills, setUnpaidBills] = useState([]);
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
    const sortedBills = [...(customer.bills || [])].sort((a, b) => a.bill_month.localeCompare(b.bill_month));

    const dueBills = sortedBills.map((b) => {
      const due = b.calculated_due !== undefined ? parseFloat(b.calculated_due) : parseFloat(b.amount || 0);

      return {
        ...b,
        due_amount: due,
        total_billable: parseFloat(b.amount || 0)
      };
    }).filter(b => b.due_amount > 0);

    setUnpaidBills(dueBills);

    const totalSum = dueBills.reduce((acc, b) => acc + b.due_amount, 0);
    setAmountPaid(totalSum > 0 ? totalSum.toFixed(2) : parseFloat(customer.monthly_rent || 500).toFixed(2));
    setError(null);
  };

  const handleReset = () => {
    setSelectedCustomer(null);
    setUnpaidBills([]);
    setAmountPaid('');
    setNotes('');
    setError(null);
    setSearchTerm('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedCustomer.total_bills_count === 0) {
      setError('Payment collection is disabled because no bill has been generated yet for this customer.');
      return;
    }

    if (!amountPaid || parseFloat(amountPaid) <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const allBillIds = unpaidBills.map(b => b.id);

    try {
      const res = await api.post('/payments', {
        customer_id: selectedCustomer.id,
        bill_ids: allBillIds,
        amount_paid: amountPaid,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        notes: notes,
      });

      setReceiptPayment(res.data);
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['my-collections'] });
      queryClient.invalidateQueries({ queryKey: ['customer', selectedCustomer.id] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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

  const totalDuesSum = unpaidBills.reduce((acc, b) => acc + b.due_amount, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100">Quick Collection Mode</h2>
        <p className="text-xs text-slate-400 mt-1">Search Customer ID to instantly collect overdue monthly dues or Advance Credit Payments.</p>
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
                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                        <span>Phone: {c.phone}</span>
                        <span>•</span>
                        <span>Zone: {c.area?.name}</span>
                        {c.address && (
                          <>
                            <span>•</span>
                            <span className="text-slate-300 flex items-center gap-1 font-medium">
                              <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                              {c.address}
                            </span>
                          </>
                        )}
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
          <h3 className="font-bold text-slate-200 text-base">Direct Collection Mode</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Type Customer ID above (e.g. <code>CCL00001</code>) and select a subscriber to record monthly collections.
          </p>
        </div>
      )}

      {/* 3. Direct Collection Form */}
      {selectedCustomer && (
        <div className="bg-slate-900 border-2 border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-5 animate-in fade-in duration-200">
          {/* Customer Header */}
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30">
                  {selectedCustomer.customer_code}
                </span>
                <span className="text-xs text-slate-400 font-semibold">{selectedCustomer.area?.name}</span>
              </div>
              <h3 className="font-bold text-slate-100 text-base mt-1">{selectedCustomer.name}</h3>
              <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  {selectedCustomer.phone}
                </span>
                {selectedCustomer.address && (
                  <span className="flex items-center gap-1 text-slate-300 font-medium bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    {selectedCustomer.address}
                  </span>
                )}
              </div>
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

          {/* No Bill Generated Notice */}
          {selectedCustomer.total_bills_count === 0 && (
            <div className="p-4 bg-rose-500/15 border border-rose-500/30 rounded-xl space-y-1">
              <div className="font-bold text-rose-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                No Bill Generated Yet! Payment Collection Blocked. (বিল তৈরি হয়নি)
              </div>
              <p className="text-xs text-slate-300">
                This subscriber has 0 generated bills in the system. Payment collection is disabled until a monthly bill is generated.
              </p>
            </div>
          )}

          {/* All Bills Paid Notice */}
          {selectedCustomer.total_bills_count > 0 && unpaidBills.length === 0 && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
              <div className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                All Current Monthly Bills Paid! (সব বিল পরিশোধিত!)
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
            {/* Stat Overview Cards: Monthly Bill, Total Dues & Total Payable */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Monthly Bill */}
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Monthly Bill (মাসিক বিল)</span>
                <div className="text-lg font-bold text-cyan-400">
                  ৳{parseFloat(selectedCustomer.monthly_rent || 0).toFixed(2)}
                </div>
              </div>

              {/* Total Dues */}
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Total Dues (মোট বকেয়া)</span>
                <div className="text-lg font-bold text-rose-400">
                  ৳{totalDuesSum.toFixed(2)}
                </div>
                {parseFloat(selectedCustomer.advance_balance || 0) > 0 && (
                  <span className="text-[10px] text-emerald-400 font-medium block mt-0.5">
                    (Advance Credit: ৳{parseFloat(selectedCustomer.advance_balance).toFixed(2)})
                  </span>
                )}
              </div>

              {/* Total Payable / Collection Amount Input */}
              <div className="p-3.5 bg-slate-950/80 border border-cyan-500/40 rounded-xl">
                <label className="text-[11px] font-semibold text-emerald-400 block mb-1">
                  Total Payable / Collection (৳)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-full px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-lg font-bold text-emerald-300 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Small Month-wise Dues Breakdown List */}
            {unpaidBills.length > 0 && (
              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                  <span>Overdue Month-wise Breakdown ({unpaidBills.length} Month{unpaidBills.length > 1 ? 's' : ''})</span>
                  <span className="text-rose-400 font-bold">Total: ৳{totalDuesSum.toFixed(2)}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {unpaidBills.map((b) => (
                    <div key={b.id} className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-cyan-400">{formatBillMonth(b.bill_month)}</span>
                      <span className="text-slate-600">•</span>
                      <span className="font-bold text-rose-400">৳{b.due_amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
              disabled={submitting || selectedCustomer.total_bills_count === 0}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-emerald-500 disabled:hover:to-teal-600 transition"
            >
              {submitting
                ? 'Processing Collection...'
                : selectedCustomer.total_bills_count === 0
                ? 'Payment Collection Disabled (No Bill Generated)'
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
