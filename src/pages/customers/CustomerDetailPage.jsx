import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import { ArrowLeft, User, Phone, MapPin, Tv, ShieldCheck, Receipt, DollarSign, AlertCircle, RefreshCw, Printer, FileText, Calendar, CheckCircle2, Loader2, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { formatCurrency, formatBillMonth } from '../../utils/formatters';

const CustomerDetailPage = () => {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundData, setRefundData] = useState({
    date: new Date().toISOString().split('T')[0],
    remarks: '',
  });
  const [refundResult, setRefundResult] = useState(null);

  // Single Customer Bill Generation State
  const [showGenerateBillModal, setShowGenerateBillModal] = useState(false);
  const [generateBillForm, setGenerateBillForm] = useState({
    bill_month: new Date().toISOString().slice(0, 7),
    due_date: new Date(new Date().getFullYear(), new Date().getMonth(), 25).toISOString().split('T')[0],
    amount: '',
    previous_dues: '',
  });
  const [generatingBill, setGeneratingBill] = useState(false);
  const [generateBillError, setGenerateBillError] = useState('');
  const [generateBillSuccess, setGenerateBillSuccess] = useState('');

  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);

  const fetchCustomerDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/customers/${id}`);
      setCustomer(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRefundSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/deposits/refund', {
        customer_id: customer.id,
        date: refundData.date,
        remarks: refundData.remarks,
      });
      setRefundResult(res.data);
      fetchCustomerDetails();
    } catch (err) {
      alert(err.response?.data?.message || 'Error processing deposit refund');
    }
  };

  const calculateSuggestedRent = (monthStr) => {
    if (!customer) return '0';
    const rent = parseFloat(customer.monthly_rent || 0);
    if (!customer.connection_date || !monthStr) return rent.toFixed(2);

    const connStr = customer.connection_date.substring(0, 10);
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

  const openGenerateBillModal = () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const dueDate = `${currentMonth}-25`;
    const suggested = calculateSuggestedRent(currentMonth);

    setGenerateBillForm({
      bill_month: currentMonth,
      due_date: dueDate,
      amount: suggested,
      previous_dues: '',
    });
    setGenerateBillError('');
    setGenerateBillSuccess('');
    setShowGenerateBillModal(true);
  };

  const handleBillMonthChange = (newMonth) => {
    const suggested = calculateSuggestedRent(newMonth);
    setGenerateBillForm(prev => ({
      ...prev,
      bill_month: newMonth,
      due_date: `${newMonth}-25`,
      amount: suggested,
    }));
  };

  const handleGenerateBillSubmit = async (e) => {
    e.preventDefault();
    setGeneratingBill(true);
    setGenerateBillError('');
    setGenerateBillSuccess('');

    try {
      const payload = {
        customer_id: customer.id,
        bill_month: generateBillForm.bill_month,
        due_date: generateBillForm.due_date,
      };
      if (generateBillForm.amount !== '' && !isNaN(generateBillForm.amount)) {
        payload.amount = parseFloat(generateBillForm.amount);
      }
      if (generateBillForm.previous_dues !== '' && !isNaN(generateBillForm.previous_dues)) {
        payload.previous_dues = parseFloat(generateBillForm.previous_dues);
      }

      const res = await api.post('/bills/generate-single', payload);
      setGenerateBillSuccess(res.data.message || 'Bill generated successfully!');
      fetchCustomerDetails();
      setTimeout(() => {
        setShowGenerateBillModal(false);
        setGenerateBillSuccess('');
      }, 1500);
    } catch (err) {
      setGenerateBillError(err.response?.data?.message || 'Failed to generate bill for this subscriber.');
    } finally {
      setGeneratingBill(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-cyan-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto"></div>
      </div>
    );
  }

  if (!customer) {
    return <div className="p-8 text-center text-slate-400">Customer not found.</div>;
  }

  const grossDeposit = customer.current_deposit || 0;
  const totalDue = customer.total_due || 0;

  // Build Chronological Double-Entry Ledger Statement (Bills = Dr, Payments = Cr)
  const ledgerEvents = [];

  // 1. Add Bills as Dr (Debit) events
  const sortedBills = [...(customer.bills || [])].sort((a, b) => a.bill_month.localeCompare(b.bill_month));

  sortedBills.forEach((b) => {
    const rawDate = b.generated_at || b.created_at;
    const formattedTxDate = rawDate ? new Date(rawDate).toLocaleDateString('en-GB') : b.bill_month;
    const formattedDueDate = b.due_date ? new Date(b.due_date).toLocaleDateString('en-GB') : b.bill_month;
    const drAmount = parseFloat(b.amount || 0);
    const formattedBillMonth = formatBillMonth(b.bill_month);
    const advanceAdj = parseFloat(b.advance || 0);
    const notesDetail = advanceAdj > 0
      ? `Monthly Cable TV Bill (${formattedBillMonth}) [Advance Adjusted: ৳${formatCurrency(advanceAdj)}]`
      : `Monthly Cable TV Bill (${formattedBillMonth})`;
    const createdTime = rawDate ? new Date(rawDate).getTime() : new Date(b.bill_month + '-01').getTime();

    ledgerEvents.push({
      id: `bill-${b.id}`,
      sortKey: `${b.bill_month}_1_${createdTime}_${b.id}`,
      txDate: formattedTxDate,
      docType: 'Bill',
      docNo: formattedBillMonth,
      date: formattedDueDate,
      notes: notesDetail,
      dr: drAmount,
      cr: 0,
      timestamp: createdTime,
    });
  });

  // 2. Group Payments by Master Receipt Number as Cr (Credit) events
  const paymentGroups = new Map();
  (customer.payments || []).forEach((p) => {
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

    const associatedBill = (customer.bills || []).find(b => b.id === p.bill_id);
    if (associatedBill?.bill_month && !grp.months.includes(associatedBill.bill_month)) {
      grp.months.push(associatedBill.bill_month);
    }
  });

  paymentGroups.forEach((grp) => {
    const formattedDate = grp.rawDate ? new Date(grp.rawDate).toLocaleDateString('en-GB') : '-';
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

    ledgerEvents.push({
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

  // Sort chronologically by bill month & event order (Bills first, then Payments for that month)
  ledgerEvents.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  // Compute running balance per row
  let runningBalance = 0;
  let totalDr = 0;
  let totalCr = 0;

  const statementRows = ledgerEvents.map((ev) => {
    runningBalance += ev.dr - ev.cr;
    totalDr += ev.dr;
    totalCr += ev.cr;
    return {
      ...ev,
      balance: runningBalance,
    };
  });

  const connectionDateFormatted = customer.connection_date
    ? new Date(customer.connection_date).toLocaleDateString('en-GB')
    : '-';

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3">
          <Link
            to="/customers"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-100">{customer.name}</h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {customer.customer_code}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{customer.area?.name} Zone</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasRole('super_admin', 'accounts') && customer.status === 'active' && (
            <button
              onClick={openGenerateBillModal}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition"
              title="Generate Monthly Bill for this subscriber"
            >
              <Calendar className="w-4 h-4" />
              Generate Bill
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            Print Statement
          </button>

          {hasRole('super_admin', 'accounts') && customer.status !== 'disconnected' && (
            <button
              onClick={() => setShowRefundModal(true)}
              className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Disconnect & Refund
            </button>
          )}
        </div>
      </div>

      {/* Customer Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400">Connection Info</div>
          <div className="text-sm font-bold text-slate-100 uppercase">{customer.connection_type}</div>
          {customer.stb_serial && (
            <div className="text-xs text-slate-400 font-mono">STB: {customer.stb_serial}</div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400">Monthly Rent</div>
          <div className="text-lg font-bold text-slate-100">৳{parseFloat(customer.monthly_rent).toFixed(2)}</div>
          <div className="text-xs text-slate-400">Since {customer.connection_date}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400">Current Security Deposit</div>
          <div className="text-lg font-bold text-emerald-400">৳{grossDeposit.toFixed(2)}</div>
          <div className="text-xs text-emerald-400/80">Refundable balance</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400">Total Outstanding Dues</div>
          <div className="text-lg font-bold text-rose-400">৳{totalDue.toFixed(2)}</div>
          <div className="text-xs text-rose-400/80">
            {customer.status === 'disconnected' ? 'Final Status' : 'Outstanding bills'}
          </div>
        </div>

        {parseFloat(customer.advance_balance || 0) > 0 && (
          <div className="bg-slate-900 border border-emerald-500/30 p-5 rounded-2xl space-y-1 col-span-full sm:col-span-1">
            <div className="text-xs text-emerald-400 font-medium">Advance Credit Balance</div>
            <div className="text-lg font-bold text-emerald-400">৳{parseFloat(customer.advance_balance).toFixed(2)}</div>
            <div className="text-[11px] text-emerald-300">Auto-adjusts next bills</div>
          </div>
        )}
      </div>

      {/* Double-Entry Customer Statement Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            Customer Financial Statement & Ledger
          </h3>
          <span className="text-xs text-slate-400">
            Customer: <strong className="text-slate-200">{customer.name} ({customer.customer_code})</strong>
          </span>
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
                    No transactions recorded for this customer yet.
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
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {row.docType}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-cyan-400">{row.docNo}</td>
                    <td className="py-3 px-3 text-slate-400 font-sans">{row.date}</td>
                    <td className="py-3 px-3 text-slate-300 font-sans text-[11px] max-w-xs">{row.notes}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-200">
                      {row.dr > 0 ? `৳${row.dr.toFixed(2)}` : <span className="text-slate-600 font-sans">-</span>}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-400">
                      {row.cr > 0 ? `৳${row.cr.toFixed(2)}` : <span className="text-slate-600 font-sans">-</span>}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-100">
                      {row.balance >= 0
                        ? `${row.balance.toFixed(2)} Dr`
                        : `${Math.abs(row.balance).toFixed(2)} Cr`}
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
                  <td className="py-3.5 px-3 text-right text-slate-100 font-mono">৳{totalDr.toFixed(2)}</td>
                  <td className="py-3.5 px-3 text-right text-emerald-400 font-mono">৳{totalCr.toFixed(2)}</td>
                  <td className="py-3.5 px-3 text-right text-cyan-400 font-mono">
                    {runningBalance >= 0
                      ? `${runningBalance.toFixed(2)} Dr`
                      : `${Math.abs(runningBalance).toFixed(2)} Cr`}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Security Deposit Ledger History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Security Deposit Ledger History
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Remarks</th>
                <th className="py-3 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {customer.deposits?.length === 0 ? (
                <tr><td colSpan="4" className="py-4 text-center text-slate-500">No deposit records found.</td></tr>
              ) : (
                customer.deposits?.map((d) => (
                  <tr key={d.id}>
                    <td className="py-2.5 px-3 text-slate-400">{d.date}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        d.type === 'collected' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {d.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px] truncate max-w-xs">{d.remarks}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-200">৳{parseFloat(d.amount).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disconnection & Deposit Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400" />
              Disconnect & Refund Security Deposit
            </h3>

            {refundResult ? (
              <div className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                <div className="text-emerald-400 font-bold text-sm">Disconnection & Refund Successful!</div>
                <div className="space-y-1 text-slate-300">
                  <p>Gross Deposit: <strong className="text-slate-100">৳{parseFloat(refundResult.gross_deposit).toFixed(2)}</strong></p>
                  <p>Unpaid Dues Deducted: <strong className="text-rose-400">৳{parseFloat(refundResult.unpaid_due_deducted).toFixed(2)}</strong></p>
                  <p>Net Amount Refunded: <strong className="text-emerald-400">৳{parseFloat(refundResult.net_refund_amount).toFixed(2)}</strong></p>
                </div>
                <button
                  onClick={() => { setShowRefundModal(false); setRefundResult(null); }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleRefundSubmit} className="space-y-4 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gross Security Deposit:</span>
                    <span className="font-bold text-emerald-400">৳{grossDeposit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Unpaid Dues:</span>
                    <span className="font-bold text-rose-400">৳{totalDue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-1 font-bold">
                    <span className="text-slate-200">Net Payable Refund:</span>
                    <span className="text-cyan-400">৳{Math.max(0, grossDeposit - totalDue).toFixed(2)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Disconnection Date</label>
                  <input
                    type="date"
                    required
                    value={refundData.date}
                    onChange={(e) => setRefundData({ ...refundData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Remarks / Disconnection Reason</label>
                  <textarea
                    rows="2"
                    placeholder="Reason for disconnection..."
                    value={refundData.remarks}
                    onChange={(e) => setRefundData({ ...refundData, remarks: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRefundModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white font-semibold rounded-xl shadow-lg shadow-rose-500/20"
                  >
                    Confirm Refund & Disconnect
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Single Customer Bill Generation Modal */}
      {showGenerateBillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                Generate Monthly Bill
              </h3>
              <button
                onClick={() => setShowGenerateBillModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subscriber Info Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-cyan-400">{customer.customer_code}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {customer.area?.name} Zone
                </span>
              </div>
              <div className="font-bold text-slate-100 text-sm">{customer.name}</div>
              <div className="text-slate-400 text-[11px] flex items-center justify-between pt-1 border-t border-slate-850">
                <span>Rent: <strong className="text-slate-200 font-mono">৳{formatCurrency(customer.monthly_rent)}</strong>/month</span>
                <span>Connected: <strong className="text-slate-200">{connectionDateFormatted}</strong></span>
              </div>
            </div>

            {generateBillSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {generateBillSuccess}
              </div>
            )}

            {generateBillError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {generateBillError}
              </div>
            )}

            <form onSubmit={handleGenerateBillSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Bill Month (YYYY-MM) *</label>
                  <input
                    type="month"
                    required
                    value={generateBillForm.bill_month}
                    onChange={(e) => handleBillMonthChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-200 focus:outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Payment Due Date *</label>
                  <input
                    type="date"
                    required
                    value={generateBillForm.due_date}
                    onChange={(e) => setGenerateBillForm({ ...generateBillForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Bill Amount (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={generateBillForm.amount}
                    onChange={(e) => setGenerateBillForm({ ...generateBillForm, amount: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-emerald-400 font-bold focus:outline-none"
                  />
                  {parseFloat(generateBillForm.amount) < parseFloat(customer.monthly_rent || 0) && (
                    <p className="text-[10px] text-amber-400 mt-1">Prorated based on connection date.</p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Previous Dues (৳) (Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Auto or Custom..."
                    value={generateBillForm.previous_dues}
                    onChange={(e) => setGenerateBillForm({ ...generateBillForm, previous_dues: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-rose-400 font-semibold focus:outline-none"
                  />
                </div>
              </div>

              {/* Financial Breakdown Preview */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-slate-300 text-[11px]">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Gross Bill Amount:</span>
                  <span className="text-slate-200 font-bold font-mono">
                    ৳{formatCurrency(parseFloat(generateBillForm.amount || 0))}
                  </span>
                </div>
                {parseFloat(customer.advance_balance || 0) > 0 && (
                  <div className="flex justify-between items-center text-cyan-400">
                    <span>Available Advance Credit:</span>
                    <span className="font-bold font-mono">
                      -৳{formatCurrency(Math.min(parseFloat(customer.advance_balance), parseFloat(generateBillForm.amount || 0)))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t border-slate-800 pt-1 font-bold text-xs text-emerald-400">
                  <span>Estimated Net Payable:</span>
                  <span className="font-mono">
                    ৳{formatCurrency(Math.max(0, parseFloat(generateBillForm.amount || 0) - parseFloat(customer.advance_balance || 0)))}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowGenerateBillModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generatingBill}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-1.5 text-xs transition"
                >
                  {generatingBill ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                  {generatingBill ? 'Generating...' : `Generate Bill for ${generateBillForm.bill_month}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetailPage;
