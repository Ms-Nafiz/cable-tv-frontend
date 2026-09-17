import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { Search, Printer, FileText, Calendar, Filter, X, Loader2, User, Phone, MapPin } from 'lucide-react';
import { formatCurrency, formatBillMonth } from '../../utils/formatters';

const CustomerStatementPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  const handleSelectCustomer = async (c) => {
    setShowDropdown(false);
    setSearchTerm(`${c.customer_code} - ${c.name}`);
    setLoadingCustomer(true);
    try {
      const res = await api.get(`/customers/${c.id}`);
      setSelectedCustomer(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCustomer(false);
    }
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
  };

  // Build Double-Entry Ledger Events Timeline
  const allEvents = [];

  if (selectedCustomer) {
    // 1. Add Bills as Dr
    const sortedBills = [...(selectedCustomer.bills || [])].sort((a, b) => a.bill_month.localeCompare(b.bill_month));

    sortedBills.forEach((b) => {
      const rawDate = b.generated_at || b.created_at;
      const formattedTxDate = rawDate ? new Date(rawDate).toISOString().split('T')[0] : b.bill_month + '-01';
      const formattedDueDate = b.due_date ? new Date(b.due_date).toISOString().split('T')[0] : b.bill_month + '-25';

      const rent = parseFloat(b.amount || 0);
      const adj = parseFloat(b.adjustment || 0);
      const adjType = b.adjustment_type;
      const formattedBillMonth = formatBillMonth(b.bill_month);
      const createdTime = rawDate ? new Date(rawDate).getTime() : new Date(b.bill_month + '-01').getTime();

      // Bill row represents the periodic monthly charge (DR)
      allEvents.push({
        id: `bill-${b.id}`,
        sortKey: `${b.bill_month}_1_${createdTime}_${b.id}`,
        txDate: formattedTxDate,
        docType: 'Bill',
        docNo: formattedBillMonth,
        date: formattedDueDate,
        notes: `Monthly Bill (${formattedBillMonth}) [Rent: ৳${formatCurrency(rent)}]`,
        dr: rent,
        cr: 0,
        timestamp: createdTime,
      });

      // If bill has an adjustment, add a distinct Adjustment event
      if (adj > 0 && adjType) {
        const isDebit = adjType.toLowerCase() === 'debit';
        allEvents.push({
          id: `adj-${b.id}`,
          sortKey: `${b.bill_month}_1b_${createdTime}_${b.id}`,
          txDate: formattedTxDate,
          docType: 'Adjustment',
          docNo: formattedBillMonth,
          date: formattedDueDate,
          notes: `Bill Adjustment (${isDebit ? 'Debit' : 'Credit'}) for ${formattedBillMonth}`,
          dr: isDebit ? adj : 0,
          cr: !isDebit ? adj : 0,
          timestamp: createdTime + 1,
        });
      }
    });

    // 2. Group Payments by Master Receipt Number as Cr (Credit) events
    const paymentGroups = new Map();
    (selectedCustomer.payments || []).forEach((p) => {
      const masterReceipt = p.receipt_no ? p.receipt_no : `RCPT-${p.id}`;
      if (!paymentGroups.has(masterReceipt)) {
        paymentGroups.set(masterReceipt, {
          id: `pay-group-${masterReceipt}`,
          docNo: masterReceipt,
          rawDate: p.payment_date || p.created_at,
          paymentMethod: p.payment_method,
          collectorName: p.collector?.name,
          totalAmount: 0,
          months: [],
          isAdvance: !p.bill_id || p.receipt_no?.includes('ADV'),
        });
      }
      const grp = paymentGroups.get(masterReceipt);
      grp.totalAmount += parseFloat(p.amount_paid || 0);

      const associatedBill = (selectedCustomer.bills || []).find(b => b.id === p.bill_id);
      if (associatedBill?.bill_month && !grp.months.includes(associatedBill.bill_month)) {
        grp.months.push(associatedBill.bill_month);
      }
    });

    paymentGroups.forEach((grp) => {
      const formattedDate = grp.rawDate ? new Date(grp.rawDate).toISOString().split('T')[0] : '-';
      const payTs = grp.rawDate ? new Date(grp.rawDate).getTime() : Date.now();
      const payMonthStr = grp.rawDate ? grp.rawDate.substring(0, 7) : null;

      const sortedGrpMonths = [...grp.months].sort();
      const lastBillMonth = sortedGrpMonths.length > 0 ? sortedGrpMonths[sortedGrpMonths.length - 1] : null;

      let targetMonth = lastBillMonth || payMonthStr || '9999-12';

      const formattedMonthsStr = grp.months.map(m => formatBillMonth(m)).join(', ');
      const monthStr = formattedMonthsStr ? ` (${formattedMonthsStr})` : '';

      const notesText = grp.isAdvance && grp.months.length === 0
        ? `Advance Credit Payment via ${grp.paymentMethod?.toUpperCase()}${grp.collectorName ? ' (Collector: ' + grp.collectorName + ')' : ''}`
        : `Bill Payment${monthStr} via ${grp.paymentMethod?.toUpperCase()}${grp.collectorName ? ' (Collector: ' + grp.collectorName + ')' : ''}`;

      allEvents.push({
        id: grp.id,
        sortKey: `${targetMonth}_2_${payTs}_${grp.docNo}`,
        txDate: formattedDate,
        docType: 'Payment',
        docNo: grp.docNo,
        date: formattedDate,
        notes: notesText,
        dr: 0,
        cr: grp.totalAmount,
        timestamp: payTs,
      });
    });
  }

  // Sort chronologically by bill month & event order (Bills first, then Payments for that month)
  allEvents.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  // Filter events by start & end date if selected
  let filteredEvents = allEvents;
  let runningBalance = 0;
  let totalDr = 0;
  let totalCr = 0;

  if (startDate) {
    const startTs = new Date(startDate).getTime();
    filteredEvents = allEvents.filter((ev) => {
      if (ev.timestamp < startTs) {
        runningBalance += ev.dr - ev.cr;
        return false;
      }
      return true;
    });
  }

  if (endDate) {
    const endTs = new Date(endDate + 'T23:59:59').getTime();
    filteredEvents = filteredEvents.filter(ev => ev.timestamp <= endTs);
  }

  const statementRows = filteredEvents.map((ev) => {
    runningBalance += ev.dr - ev.cr;
    totalDr += ev.dr;
    totalCr += ev.cr;
    return {
      ...ev,
      balance: runningBalance,
    };
  });

  const connectionDateFormatted = selectedCustomer?.connection_date
    ? new Date(selectedCustomer.connection_date).toLocaleDateString('en-GB')
    : '-';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Customer Statement Ledger
          </h2>
          <p className="text-xs text-slate-400 mt-1">Search Customer ID to view & print chronological financial statement statement (Dr / Cr / Running Balance).</p>
        </div>

        {selectedCustomer && (
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition self-start sm:self-auto"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            Print Ledger Statement
          </button>
        )}
      </div>

      {/* 1. Live Customer Search & Date Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 no-print">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {/* Customer Search Bar */}
          <div ref={searchContainerRef} className="lg:col-span-2 relative">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Search Subscriber</label>
            <div className="relative">
              <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type Customer ID (e.g. CCL00001), Phone, or Name..."
                className="w-full pl-10 pr-9 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition"
              />
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-cyan-400 animate-spin absolute right-3 top-3" />
              ) : searchTerm ? (
                <button
                  onClick={() => { setSearchTerm(''); setSuggestions([]); handleClearCustomer(); }}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>

            {/* Dropdown Suggestions */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50 max-h-64 overflow-y-auto">
                {suggestions.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-400">
                    No matching subscribers found.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/60">
                    {suggestions.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full p-2.5 flex items-center justify-between hover:bg-cyan-500/10 text-left transition group text-xs"
                      >
                        <div>
                          <span className="font-mono font-bold text-cyan-400 mr-2">{c.customer_code}</span>
                          <span className="font-semibold text-slate-100">{c.name}</span>
                          <span className="text-slate-400 ml-2">({c.phone})</span>
                        </div>
                        <span className="text-[11px] font-bold text-rose-400">৳{formatCurrency(c.total_due)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Start Date Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Loading Spinner */}
      {loadingCustomer && (
        <div className="p-8 text-center text-cyan-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="text-xs text-slate-400 mt-2">Loading customer ledger statement...</p>
        </div>
      )}

      {/* 2. Empty State when no customer is selected */}
      {!selectedCustomer && !loadingCustomer && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-200 text-base">Select a Subscriber to Load Financial Statement</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Type Customer ID above (e.g. <code>CCL00001</code>), phone number, or subscriber name to load their complete Dr / Cr statement ledger.
          </p>
        </div>
      )}

      {/* 3. Selected Customer Ledger Statement View */}
      {selectedCustomer && !loadingCustomer && (
        <div className="space-y-6">
          {/* Customer Profile Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30">
                  {selectedCustomer.customer_code}
                </span>
                <h3 className="text-base font-bold text-slate-100">{selectedCustomer.name}</h3>
              </div>
              <p className="text-xs text-slate-400">Phone: <strong className="text-slate-300">{selectedCustomer.phone}</strong> | Address: {selectedCustomer.address}</p>
              <p className="text-xs text-slate-400">Zone: <strong className="text-slate-300">{selectedCustomer.area?.name}</strong> | Type: <span className="uppercase text-cyan-400 font-bold">{selectedCustomer.connection_type}</span></p>
            </div>

            <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-5">
              <div>
                <div className="text-[11px] text-slate-400">Monthly Rent</div>
                <div className="text-sm font-bold text-slate-100">৳{formatCurrency(selectedCustomer.monthly_rent)}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Security Deposit</div>
                <div className="text-sm font-bold text-emerald-400">৳{formatCurrency(selectedCustomer.current_deposit)}</div>
              </div>
              {parseFloat(selectedCustomer.advance_balance || 0) > 0 && (
                <div>
                  <div className="text-[11px] text-emerald-400 font-medium">Advance Credit</div>
                  <div className="text-sm font-bold text-emerald-400">৳{formatCurrency(selectedCustomer.advance_balance)}</div>
                </div>
              )}
              <div>
                <div className="text-[11px] text-slate-400">Current Net Due</div>
                <div className={`text-sm font-bold ${parseFloat(selectedCustomer.total_due || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ৳{formatCurrency(selectedCustomer.total_due)}
                </div>
              </div>
            </div>
          </div>

          {/* Double-Entry Financial Statement Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h4 className="text-xs uppercase tracking-wider font-bold text-slate-300">
                Financial Statement (Dr / Cr / Running Balance)
              </h4>
              <button
                onClick={handleClearCustomer}
                className="text-xs text-cyan-400 hover:underline"
              >
                Clear Selection
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <th className="py-3 px-3">Transaction Date</th>
                    <th className="py-3 px-3">Document Type</th>
                    <th className="py-3 px-3">Document Number</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Notes</th>
                    <th className="py-3 px-3 text-right">Dr (৳)</th>
                    <th className="py-3 px-3 text-right">Cr (৳)</th>
                    <th className="py-3 px-3 text-right">Balance (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                  {statementRows.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-6 text-center text-slate-500 font-sans">
                        No financial transactions matching the selected date criteria.
                      </td>
                    </tr>
                  ) : (
                    statementRows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 text-slate-400 font-sans">{row.txDate}</td>
                        <td className="py-3 px-3 font-sans">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            row.docType === 'Bill'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : row.docType === 'Adjustment'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}>
                            {row.docType}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-cyan-400">{row.docNo}</td>
                        <td className="py-3 px-3 text-slate-400 font-sans">{row.date}</td>
                        <td className="py-3 px-3 text-slate-300 font-sans text-[11px] max-w-xs">{row.notes}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-200">
                          {row.dr > 0 ? `৳${formatCurrency(row.dr)}` : <span className="text-slate-600 font-sans">-</span>}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-400">
                          {row.cr > 0 ? `৳${formatCurrency(row.cr)}` : <span className="text-slate-600 font-sans">-</span>}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-100">
                          {row.balance >= 0
                            ? `${formatCurrency(row.balance)} Dr`
                            : `${formatCurrency(Math.abs(row.balance))} Cr`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Statement Summary Footer */}
                {statementRows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-950 font-bold text-xs border-t-2 border-slate-800 text-slate-200">
                      <td colSpan="5" className="py-3.5 px-3 uppercase text-slate-400 text-right font-sans">
                        Statement Totals:
                      </td>
                      <td className="py-3.5 px-3 text-right text-slate-100 font-mono">৳{formatCurrency(totalDr)}</td>
                      <td className="py-3.5 px-3 text-right text-emerald-400 font-mono">৳{formatCurrency(totalCr)}</td>
                      <td className="py-3.5 px-3 text-right text-cyan-400 font-mono">
                        {runningBalance >= 0
                          ? `${formatCurrency(runningBalance)} Dr`
                          : `${formatCurrency(Math.abs(runningBalance))} Cr`}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerStatementPage;
