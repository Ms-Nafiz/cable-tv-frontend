import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Calendar, CheckCircle2, AlertCircle, Info, Calculator, User, Search, Users, Sparkles, Loader2 } from 'lucide-react';
import { formatCurrency, formatBillMonth } from '../../utils/formatters';

const GenerateBillPage = () => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const defaultDueDate = `${currentMonth}-25`;

  // Mode: 'bulk' | 'single'
  const [mode, setMode] = useState('bulk');

  // Shared inputs
  const [billMonth, setBillMonth] = useState(currentMonth);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Single mode specific state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [singleAmount, setSingleAmount] = useState('');
  const [singlePreviousDues, setSinglePreviousDues] = useState('');

  // Live customer search
  useEffect(() => {
    if (!searchQuery.trim() || mode !== 'single') {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get('/customers', {
          params: { search: searchQuery.trim() }
        });
        setSearchResults(res.data.slice(0, 8));
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, mode]);

  const calculateSuggestedRent = (cust, monthStr) => {
    if (!cust) return '0';
    const rent = parseFloat(cust.monthly_rent || 0);
    if (!cust.connection_date || !monthStr) return rent.toFixed(2);

    const connStr = cust.connection_date.substring(0, 10);
    if (connStr.startsWith(monthStr)) {
      const connDay = parseInt(connStr.split('-')[2], 10);
      if (connDay >= 11) {
        const [year, month] = monthStr.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        const activeDays = Math.max(1, daysInMonth - connDay + 1);
        const exact = (rent / daysInMonth) * activeDays;
        return (Math.ceil(exact / 5) * 5).toFixed(2);
      }
    }
    return rent.toFixed(2);
  };

  const handleSelectCustomer = (cust) => {
    setSelectedCustomer(cust);
    setSearchQuery('');
    setSearchResults([]);
    const suggested = calculateSuggestedRent(cust, billMonth);
    setSingleAmount(suggested);
    setError('');
    setResult(null);
  };

  const handleBillMonthChange = (newMonth) => {
    setBillMonth(newMonth);
    setDueDate(`${newMonth}-25`);
    if (selectedCustomer) {
      setSingleAmount(calculateSuggestedRent(selectedCustomer, newMonth));
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      if (mode === 'bulk') {
        const res = await api.post('/bills/generate', {
          bill_month: billMonth,
          due_date: dueDate,
        });
        setResult(res.data);
      } else {
        if (!selectedCustomer) {
          setError('Please select a subscriber first.');
          setLoading(false);
          return;
        }

        const payload = {
          customer_id: selectedCustomer.id,
          bill_month: billMonth,
          due_date: dueDate,
        };

        if (singleAmount !== '' && !isNaN(singleAmount)) {
          payload.amount = parseFloat(singleAmount);
        }
        if (singlePreviousDues !== '' && !isNaN(singlePreviousDues)) {
          payload.previous_dues = parseFloat(singlePreviousDues);
        }

        const res = await api.post('/bills/generate-single', payload);
        setResult(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Bill generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Monthly Bill Generator</h2>
        <p className="text-xs text-slate-400 mt-1">Generate monthly bills for all active subscribers in bulk, or for an individual subscriber.</p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl">
        <button
          type="button"
          onClick={() => { setMode('bulk'); setError(''); setResult(null); }}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
            mode === 'bulk'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          Bulk Generation (All Active Subscribers)
        </button>

        <button
          type="button"
          onClick={() => { setMode('single'); setError(''); setResult(null); }}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
            mode === 'single'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <User className="w-4 h-4" />
          Single Subscriber Generation
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            {result.message}
          </div>

          {mode === 'bulk' && (
            <div className="grid grid-cols-3 gap-3 text-xs text-slate-300 pt-2 border-t border-emerald-500/20">
              <div>
                <span className="text-slate-400 block">Generated:</span>
                <strong className="text-emerald-400 text-base">{result.generated_count}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Skipped (Already Exist):</span>
                <strong className="text-amber-400 text-base">{result.skipped_count}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Advance Adjusted:</span>
                <strong className="text-cyan-400 text-base">{result.advance_adjusted_count || 0}</strong>
              </div>
            </div>
          )}

          {mode === 'single' && result.bill && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300 pt-2 border-t border-emerald-500/20">
              <div>
                <span className="text-slate-400 block text-[11px]">Bill Month:</span>
                <strong className="text-slate-100">{formatBillMonth(result.bill.bill_month)}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Bill Amount:</span>
                <strong className="text-emerald-400">৳{formatCurrency(result.bill.amount)}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Advance Credit:</span>
                <strong className="text-cyan-400">৳{formatCurrency(result.bill.advance || 0)}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Bill Status:</span>
                <span className="uppercase font-bold text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {result.bill.status}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleGenerate} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        {/* Single Mode Subscriber Search */}
        {mode === 'single' && (
          <div className="space-y-3 pb-4 border-b border-slate-800">
            <label className="block text-xs font-semibold text-slate-300">
              Search & Select Subscriber *
            </label>

            {!selectedCustomer ? (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type Customer Code (e.g. CCL00001), Name, or Phone..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
                {searching && (
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin absolute right-3.5 top-3" />
                )}

                {/* Dropdown Results */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-850">
                    {searchResults.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full p-3 text-left hover:bg-slate-900/80 transition flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-100 flex items-center gap-2">
                            <span>{c.name}</span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              {c.customer_code}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {c.phone} • {c.area?.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-400">৳{formatCurrency(c.monthly_rent)}/mo</div>
                          <div className="text-[10px] text-slate-400 uppercase">{c.connection_type}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Subscriber Card */
              <div className="bg-slate-950 border border-cyan-500/30 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/30">
                      {selectedCustomer.customer_code}
                    </span>
                    <strong className="text-slate-100 text-sm">{selectedCustomer.name}</strong>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {selectedCustomer.phone} • {selectedCustomer.area?.name} Zone • Connected: {selectedCustomer.connection_date ? selectedCustomer.connection_date.substring(0, 10) : '-'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400">Standard Rent</div>
                    <div className="font-bold text-slate-100 text-xs">৳{formatCurrency(selectedCustomer.monthly_rent)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="px-2.5 py-1 text-xs text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-slate-850 rounded-lg border border-slate-800 transition"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Bill Month (YYYY-MM) *</label>
            <input
              type="month"
              required
              value={billMonth}
              onChange={(e) => handleBillMonthChange(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Payment Due Date *</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Single Mode Custom Amount & Previous Dues */}
        {mode === 'single' && selectedCustomer && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Bill Amount (৳) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={singleAmount}
                onChange={(e) => setSingleAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-bold focus:outline-none focus:border-cyan-500"
              />
              {parseFloat(singleAmount) < parseFloat(selectedCustomer.monthly_rent || 0) && (
                <p className="text-[10px] text-amber-400 mt-1">Suggested prorated bill based on connection date.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Previous Dues (৳) (Optional)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Auto or Custom..."
                value={singlePreviousDues}
                onChange={(e) => setSinglePreviousDues(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-rose-400 font-semibold focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        )}

        {/* Business Logic Rules Info */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-400">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-cyan-400" />
            Billing Generation Business Rules:
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
            <li>Duplicate prevention constraint: <code>unique(customer_id, bill_month)</code> prevents double billing.</li>
            <li>Disconnected and inactive subscribers are automatically excluded from bulk generation.</li>
            <li>
              <strong>Prorated calculation:</strong> Mid-month connections are prorated based on active days in the month 
              <code> (monthly_rent / days_in_month) * active_days</code>.
            </li>
            <li>
              <strong>Advance credit adjustment:</strong> If subscriber has advance balance, it is automatically deducted from bill.
            </li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading || (mode === 'single' && !selectedCustomer)}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Bill...</span>
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4" />
              <span>
                {mode === 'bulk'
                  ? `Generate Bulk Bills for ${billMonth}`
                  : `Generate Bill for ${selectedCustomer?.name || 'Selected Subscriber'} (${billMonth})`}
              </span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default GenerateBillPage;
