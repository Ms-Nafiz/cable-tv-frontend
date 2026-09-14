import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../auth/AuthContext';
import { Search, Calendar, Filter, Receipt, Eye, X, CheckCircle2, Loader2, Printer, User, Phone, MapPin, Tv, ShieldCheck, AlertCircle, FileText, Download, CreditCard, DollarSign, Upload, FileSpreadsheet, Edit, Trash2, Save, Users } from 'lucide-react';
import Pagination from '../../components/Pagination';
import ConfirmModal from '../../components/ConfirmModal';
import { formatCurrency, formatBillMonth, formatDate } from '../../utils/formatters';

const BillListPage = () => {
  const [bills, setBills] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [monthFilter, setMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [search, setSearch] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // In-Page Generate Bills Modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateMode, setGenerateMode] = useState('bulk'); // 'bulk' | 'single'
  const [generateData, setGenerateData] = useState({
    bill_month: new Date().toISOString().slice(0, 7), // YYYY-MM
    due_date: new Date(new Date().getFullYear(), new Date().getMonth(), 25).toISOString().split('T')[0],
    amount: '',
    previous_dues: '',
  });
  const [genSearchQuery, setGenSearchQuery] = useState('');
  const [genSearchResults, setGenSearchResults] = useState([]);
  const [genSearching, setGenSearching] = useState(false);
  const [genSelectedCustomer, setGenSelectedCustomer] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalResult, setModalResult] = useState(null);
  const [modalError, setModalError] = useState('');

  // Single Bill Details Modal state
  const [selectedBill, setSelectedBill] = useState(null);

  // Direct In-Page Bill Collection Modal state
  const [collectingBill, setCollectingBill] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [paymentError, setPaymentError] = useState('');

  // Bulk Payment Excel Import State
  const [showPaymentImportModal, setShowPaymentImportModal] = useState(false);
  const [paymentImportFile, setPaymentImportFile] = useState(null);
  const [paymentImporting, setPaymentImporting] = useState(false);
  const [paymentImportResult, setPaymentImportResult] = useState(null);

  const { hasRole } = useAuth();

  // Edit Bill Modal state
  const [editingBill, setEditingBill] = useState(null);
  const [editBillForm, setEditBillForm] = useState({
    amount: '',
    previous_dues: '',
    due_date: '',
    status: 'unpaid',
  });
  const [editingSubmitting, setEditingSubmitting] = useState(false);

  // Confirm Modal state
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    confirmText: 'Confirm',
    showCancel: true,
    onConfirm: () => {},
  });

  const showAlert = (title, message, type = 'info') => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      type,
      confirmText: 'OK',
      showCancel: false,
      onConfirm: () => setConfirmConfig(prev => ({ ...prev, isOpen: false })),
    });
  };

  const showConfirm = (title, message, onConfirmAction, type = 'danger', confirmText = 'Delete') => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      type,
      confirmText,
      showCancel: true,
      onConfirm: () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        onConfirmAction();
      },
    });
  };

  const openEditBillModal = (bill) => {
    setEditingBill(bill);
    setEditBillForm({
      amount: bill.amount,
      previous_dues: bill.previous_dues !== undefined && bill.previous_dues !== null ? bill.previous_dues : 0,
      due_date: bill.due_date ? bill.due_date.split('T')[0] : '',
      status: bill.status || 'unpaid',
    });
  };

  const handleEditBillSubmit = async (e) => {
    e.preventDefault();
    if (!editingBill) return;
    setEditingSubmitting(true);
    try {
      await api.put(`/bills/${editingBill.id}`, editBillForm);
      showAlert('Success', `Bill for ${editingBill.customer?.name} updated successfully!`, 'success');
      setEditingBill(null);
      fetchBills();
    } catch (err) {
      console.error(err);
      showAlert('Error', err.response?.data?.message || 'Failed to update bill', 'danger');
    } finally {
      setEditingSubmitting(false);
    }
  };

  const handleDeleteBill = (bill) => {
    showConfirm(
      'Confirm Bill Deletion',
      `Are you sure you want to DELETE the bill (${bill.bill_month}) for ${bill.customer?.name} (${bill.customer?.customer_code})? Any associated payment entries will also be removed.`,
      async () => {
        try {
          await api.delete(`/bills/${bill.id}`);
          showAlert('Deleted', `Bill for ${bill.customer?.name} deleted successfully.`, 'success');
          fetchBills();
        } catch (err) {
          console.error(err);
          showAlert('Error', err.response?.data?.message || 'Failed to delete bill', 'danger');
        }
      },
      'danger',
      'Yes, Delete Bill'
    );
  };

  const handleDownloadPaymentSample = async () => {
    try {
      const response = await api.get('/payments/download-sample-excel', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Sample_Bulk_Payment_Import_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to download sample file');
    }
  };

  const handlePaymentImportSubmit = async (e) => {
    e.preventDefault();
    if (!paymentImportFile) {
      alert('Please select an Excel (.xlsx) file to upload.');
      return;
    }

    setPaymentImporting(true);
    setPaymentImportResult(null);
    const formDataObj = new FormData();
    formDataObj.append('file', paymentImportFile);

    try {
      const res = await api.post('/payments/import-excel', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPaymentImportResult(res.data);
      fetchBills();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to import payments from Excel');
    } finally {
      setPaymentImporting(false);
    }
  };

  useEffect(() => {
    fetchAreas();
  }, []);

  // Live Reactive Auto-Filtering when any filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBills();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, monthFilter, statusFilter, areaFilter]);

  // Live customer search in generate modal
  useEffect(() => {
    if (!genSearchQuery.trim() || generateMode !== 'single') {
      setGenSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setGenSearching(true);
      try {
        const res = await api.get('/customers', {
          params: { search: genSearchQuery.trim() }
        });
        setGenSearchResults(res.data.slice(0, 8));
      } catch (e) {
        console.error(e);
      } finally {
        setGenSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [genSearchQuery, generateMode]);

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

  const handleSelectGenCustomer = (cust) => {
    setGenSelectedCustomer(cust);
    setGenSearchQuery('');
    setGenSearchResults([]);
    const suggested = calculateSuggestedRent(cust, generateData.bill_month);
    setGenerateData(prev => ({ ...prev, amount: suggested }));
  };

  const fetchAreas = async () => {
    try {
      const res = await api.get('/areas');
      setAreas(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBills = async () => {
    setLoading(true);
    try {
      const params = {};
      if (monthFilter) params.bill_month = monthFilter;
      if (statusFilter) params.status = statusFilter;
      if (areaFilter) params.area_id = areaFilter;
      if (search) params.search = search;

      const res = await api.get('/bills', { params });
      setBills(res.data);
      setCurrentPage(1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchBills();
  };

  const handleResetFilters = () => {
    setSearch('');
    setMonthFilter('');
    setStatusFilter('');
    setAreaFilter('');
  };

  const handleExportExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (monthFilter) params.append('bill_month', monthFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (areaFilter) params.append('area_id', areaFilter);
      if (search) params.append('search', search);

      const response = await api.get(`/bills/export-excel?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }));
      const link = document.createElement('a');
      link.href = url;
      const activeMonth = monthFilter || (bills.length > 0 ? bills[0].bill_month : 'All');
      link.setAttribute('download', `Bill_Sheet_${activeMonth}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error(e);
      alert('Error downloading Excel Bill Sheet');
    }
  };

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    setModalSubmitting(true);
    setModalError('');
    setModalResult(null);

    try {
      if (generateMode === 'single') {
        if (!genSelectedCustomer) {
          setModalError('Please select a subscriber first.');
          setModalSubmitting(false);
          return;
        }

        const payload = {
          customer_id: genSelectedCustomer.id,
          bill_month: generateData.bill_month,
          due_date: generateData.due_date,
        };
        if (generateData.amount !== '' && !isNaN(generateData.amount)) {
          payload.amount = parseFloat(generateData.amount);
        }
        if (generateData.previous_dues !== '' && !isNaN(generateData.previous_dues)) {
          payload.previous_dues = parseFloat(generateData.previous_dues);
        }

        const res = await api.post('/bills/generate-single', payload);
        setModalResult(res.data);
      } else {
        const res = await api.post('/bills/generate', {
          bill_month: generateData.bill_month,
          due_date: generateData.due_date,
        });
        setModalResult(res.data);
      }
      fetchBills();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to generate monthly bills');
    } finally {
      setModalSubmitting(false);
    }
  };

  const openCollectModal = (bill) => {
    setCollectingBill(bill);
    setPaymentForm({
      amount_paid: bill.net_total_payable || bill.due_amount,
      payment_method: 'cash',
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setPaymentResult(null);
    setPaymentError('');
  };

  const handleCollectSubmit = async (e) => {
    e.preventDefault();
    if (!collectingBill) return;

    setPaymentSubmitting(true);
    setPaymentError('');
    setPaymentResult(null);

    try {
      const payload = {
        bill_id: collectingBill.id,
        customer_id: collectingBill.customer_id,
        amount_paid: parseFloat(paymentForm.amount_paid),
        payment_method: paymentForm.payment_method,
        payment_date: paymentForm.payment_date,
        notes: paymentForm.notes,
      };

      const res = await api.post('/payments', payload);
      setPaymentResult(res.data);
      fetchBills(); // Refresh bill registry
    } catch (err) {
      setPaymentError(err.response?.data?.message || 'Failed to process bill payment collection.');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const totalBilledAmount = bills.reduce((acc, b) => acc + parseFloat(b.amount), 0);
  const totalPaidAmount = bills.reduce((acc, b) => acc + parseFloat(b.paid_amount || 0), 0);
  const totalDueAmount = bills.reduce((acc, b) => acc + parseFloat(b.net_total_payable || b.due_amount || 0), 0);

  // Pagination calculations
  const totalPages = Math.ceil(bills.length / ITEMS_PER_PAGE);
  const paginatedBills = bills.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Monthly Bill Registry</h2>
          <p className="text-xs text-slate-400 mt-1">View subscriber billing status, previous dues, advance credit, and net payable totals ({bills.length} total).</p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => { setShowPaymentImportModal(true); setPaymentImportResult(null); setPaymentImportFile(null); }}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition"
            title="Import Bulk Payments from Excel File"
          >
            <Upload className="w-4 h-4" />
            Import Bulk Payments
          </button>

          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition"
            title="Download Excel Collection Bill Sheet"
          >
            <FileText className="w-4 h-4" />
            Export Excel Bill Sheet
          </button>

          <button
            onClick={() => {
              setShowGenerateModal(true);
              setGenerateMode('bulk');
              setGenSelectedCustomer(null);
              setGenSearchQuery('');
              setModalResult(null);
              setModalError('');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition"
          >
            <Calendar className="w-4 h-4" />
            Generate Bills
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Total Billed</div>
          <div className="text-lg font-bold text-slate-100 mt-1">৳{formatCurrency(totalBilledAmount)}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Total Collected</div>
          <div className="text-lg font-bold text-emerald-400 mt-1">৳{formatCurrency(totalPaidAmount)}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Total Net Payable Due</div>
          <div className="text-lg font-bold text-rose-400 mt-1">৳{formatCurrency(totalDueAmount)}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Customer Code (e.g. CCL00001) or Name..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-300 focus:outline-none font-semibold"
            />
          </div>

          <div>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-300 focus:outline-none font-semibold"
            >
              <option value="">All Area Zones</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-300 focus:outline-none font-semibold"
            >
              <option value="">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 py-2 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 transition"
            >
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>

            {(search || monthFilter || statusFilter || areaFilter) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                title="Reset All Filters"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Bills Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Bill Month</th>
                <th className="py-3 px-4">Subscriber Info</th>
                <th className="py-3 px-4 text-right">Current Bill</th>
                <th className="py-3 px-4 text-right">Previous Dues</th>
                <th className="py-3 px-4 text-right">Advance Credit</th>
                <th className="py-3 px-4 text-right">Net Payable</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-cyan-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500 mx-auto"></div>
                  </td>
                </tr>
              ) : paginatedBills.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No matching subscriber bills found.
                  </td>
                </tr>
              ) : (
                paginatedBills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-850 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-100">{formatBillMonth(b.bill_month)}</div>
                      <div className="text-[11px] font-mono text-slate-400">{b.bill_month}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100">{b.customer?.name}</div>
                      <div className="text-[11px] font-mono text-cyan-400">{b.customer?.customer_code} • {b.customer?.area?.name}</div>
                      {b.customer?.address && (
                        <div className="text-[10px] text-slate-400 font-medium truncate max-w-xs">{b.customer.address}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-200">
                      ৳{formatCurrency(b.amount)}
                      {parseFloat(b.amount) < parseFloat(b.customer?.monthly_rent || 0) && (
                        <div className="text-[10px] text-amber-400 font-semibold" title="Prorated mid-month bill">Prorated</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-rose-400">
                      ৳{formatCurrency(b.previous_dues || 0)}
                      {b.previous_due_months && b.previous_due_months.length > 0 && (
                        <div className="text-[10px] text-rose-300/80 font-normal mt-0.5">
                          ({b.previous_due_months.join(', ')})
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-cyan-400">
                      ৳{formatCurrency(parseFloat(b.advance || 0) + parseFloat(b.advance_credit || 0))}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400 text-sm">
                      ৳{formatCurrency(b.net_total_payable !== undefined ? b.net_total_payable : b.due_amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          b.status === 'paid'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : b.status === 'partial'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(b.net_total_payable !== undefined ? b.net_total_payable : parseFloat(b.due_amount)) > 0 ? (
                          <button
                            onClick={() => openCollectModal(b)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition"
                            title="Collect Net Payable Bill Amount"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Collect
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-800/80 text-slate-400 rounded text-[10px] font-semibold border border-slate-700/50">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Paid
                          </span>
                        )}

                        <button
                          onClick={() => setSelectedBill(b)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
                          title="View Single Bill Details Modal"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {hasRole('super_admin', 'accounts') && (
                          <button
                            onClick={() => openEditBillModal(b)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
                            title="Edit Bill Details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}

                        {hasRole('super_admin') && (
                          <button
                            onClick={() => handleDeleteBill(b)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            title="Delete Bill (Super Admin Only)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && bills.length > 0 && (
          <div className="border-t border-slate-800">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        )}
      </div>

      {/* Direct In-Page Bill Collection Modal */}
      {collectingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                Collect Bill Payment — {formatBillMonth(collectingBill.bill_month)}
              </h3>
              <button
                onClick={() => setCollectingBill(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {paymentResult ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-3 text-xs">
                <div className="font-bold text-emerald-400 flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Payment Collected Successfully!
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5 text-slate-300">
                  <p>Receipt No: <strong className="font-mono text-cyan-400 font-bold">{paymentResult.receipt_no}</strong></p>
                  <p>Subscriber: <strong className="text-slate-100">{collectingBill.customer?.name} ({collectingBill.customer?.customer_code})</strong></p>
                  <p>Collected Amount: <strong className="text-emerald-400 font-bold">৳{formatCurrency(paymentResult.amount_paid || paymentResult.total_amount_paid)}</strong></p>
                  <p>Payment Method: <span className="uppercase font-semibold text-slate-200">{paymentResult.payment_method || 'CASH'}</span></p>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4 text-cyan-400" />
                    Print Receipt
                  </button>
                  <button
                    onClick={() => setCollectingBill(null)}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCollectSubmit} className="space-y-4 text-xs">
                {paymentError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
                    {paymentError}
                  </div>
                )}

                {/* Subscriber Summary Card */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-cyan-400">{collectingBill.customer?.customer_code}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {collectingBill.customer?.area?.name}
                    </span>
                  </div>
                  <div className="font-bold text-slate-100 text-sm">{collectingBill.customer?.name}</div>
                  <div className="text-slate-400 text-[11px]">{collectingBill.customer?.phone} • {collectingBill.customer?.address}</div>
                </div>

                {/* Subscriber Detailed Financial Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400">Current Bill</div>
                    <div className="font-bold text-slate-200 mt-0.5">৳{formatCurrency(collectingBill.amount)}</div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400">Previous Dues</div>
                    <div className="font-bold text-rose-400 mt-0.5">৳{formatCurrency(collectingBill.previous_dues || 0)}</div>
                    {collectingBill.previous_due_months && collectingBill.previous_due_months.length > 0 && (
                      <div className="text-[9px] text-rose-300/80 font-normal mt-0.5">
                        ({collectingBill.previous_due_months.join(', ')})
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400">Advance Credit</div>
                    <div className="font-bold text-cyan-400 mt-0.5">৳{formatCurrency(collectingBill.advance_credit || 0)}</div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-emerald-500/30 text-center bg-emerald-500/10">
                    <div className="text-[10px] text-emerald-300 font-bold uppercase">Net Payable</div>
                    <div className="font-bold text-emerald-400 mt-0.5 text-sm">৳{formatCurrency(collectingBill.net_total_payable !== undefined ? collectingBill.net_total_payable : collectingBill.due_amount)}</div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Collection Amount (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentForm.amount_paid}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 focus:outline-none focus:border-emerald-500 font-bold text-sm"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Default set to Net Payable amount (৳{formatCurrency(collectingBill.net_total_payable !== undefined ? collectingBill.net_total_payable : collectingBill.due_amount)}). Partial or surplus advance payments allowed.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Payment Method *</label>
                    <select
                      value={paymentForm.payment_method}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 font-semibold uppercase"
                    >
                      <option value="cash">CASH</option>
                      <option value="bkash">BKASH</option>
                      <option value="nagad">NAGAD</option>
                      <option value="bank">BANK</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Payment Date *</label>
                    <input
                      type="date"
                      required
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Collection Notes / Remarks (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Paid via bKash TrxID #9X8A12 or Notes for Accountant..."
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCollectingBill(null)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={paymentSubmitting}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {paymentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {paymentSubmitting ? 'Processing Payment...' : 'Confirm Collection'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Single Bill Details Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Bill Details — {formatBillMonth(selectedBill.bill_month)} ({selectedBill.bill_month})
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                    selectedBill.status === 'paid'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : selectedBill.status === 'partial'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {selectedBill.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedBill(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subscriber Information Card */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30">
                    {selectedBill.customer?.customer_code}
                  </span>
                  <span className="font-bold text-slate-100 text-sm">{selectedBill.customer?.name}</span>
                </div>
                <span className="uppercase text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {selectedBill.customer?.connection_type}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 pt-1">
                <div>
                  <span className="text-slate-500">Phone:</span> <strong className="text-slate-200">{selectedBill.customer?.phone}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Area Zone:</span> <strong className="text-slate-200">{selectedBill.customer?.area?.name}</strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500">Address:</span> <span className="text-slate-300">{selectedBill.customer?.address}</span>
                </div>
                {selectedBill.customer?.stb_serial && (
                  <div className="sm:col-span-2 text-cyan-300 font-mono text-[11px]">
                    STB Serial: {selectedBill.customer.stb_serial}
                  </div>
                )}
              </div>
            </div>

            {/* Prorated Mid-Month Bill Notice (If applicable) */}
            {parseFloat(selectedBill.amount) < parseFloat(selectedBill.customer?.monthly_rent || 0) && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-200">Prorated Mid-Month Bill Notice</div>
                  <p className="text-[11px] text-amber-300/80 mt-0.5">
                    This bill was calculated on a prorated basis because the subscriber joined mid-month on{' '}
                    <strong className="text-amber-200">{formatDate(selectedBill.customer?.connection_date)}</strong>.{' '}
                    (Standard full monthly rent is <strong className="text-amber-200">৳{formatCurrency(selectedBill.customer?.monthly_rent)}</strong>).
                  </p>
                </div>
              </div>
            )}

            {/* Financial Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">Current Bill</div>
                <div className="text-sm font-bold text-slate-100 mt-0.5">৳{formatCurrency(selectedBill.amount)}</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">Previous Dues</div>
                <div className="text-sm font-bold text-rose-400 mt-0.5">৳{formatCurrency(selectedBill.previous_dues || 0)}</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">Advance Credit</div>
                <div className="text-sm font-bold text-cyan-400 mt-0.5">৳{formatCurrency(selectedBill.advance_credit || 0)}</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                <div className="text-[10px] uppercase font-bold text-emerald-300">Net Payable</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">৳{formatCurrency(selectedBill.net_total_payable !== undefined ? selectedBill.net_total_payable : selectedBill.due_amount)}</div>
              </div>
            </div>

            {/* Payments Collected History for this Bill */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Payment Collection History ({selectedBill.payments?.length || 0})
              </h4>

              {(!selectedBill.payments || selectedBill.payments.length === 0) ? (
                <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                  No payment collection records found for this bill.
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
                        <th className="py-2 px-3">Receipt No</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Method</th>
                        <th className="py-2 px-3 text-right">Amount (৳)</th>
                        <th className="py-2 px-3 text-right">Collected By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {selectedBill.payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-900/50">
                          <td className="py-2 px-3 font-mono font-bold text-cyan-400">{p.receipt_no}</td>
                          <td className="py-2 px-3 text-slate-400">
                            {formatDate(p.payment_date)}
                          </td>
                          <td className="py-2 px-3 uppercase font-semibold text-slate-300">{p.payment_method}</td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-400">
                            ৳{formatCurrency(p.amount_paid)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-400">
                            {p.collector?.name || (p.receipt_no?.includes('ADV') ? 'Auto-Adjusted' : 'System')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
              >
                <Printer className="w-4 h-4 text-cyan-400" />
                Print Bill Copy
              </button>

              <button
                onClick={() => setSelectedBill(null)}
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs rounded-xl shadow-md transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-Page Generate Monthly Bills Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                {generateMode === 'bulk' ? 'Generate Bulk Monthly Bills' : 'Generate Single Subscriber Bill'}
              </h3>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 border border-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setGenerateMode('bulk'); setModalError(''); setModalResult(null); }}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                  generateMode === 'bulk'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Bulk (All Active)
              </button>

              <button
                type="button"
                onClick={() => { setGenerateMode('single'); setModalError(''); setModalResult(null); }}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${
                  generateMode === 'single'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Single Subscriber
              </button>
            </div>

            {modalResult ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-emerald-400 flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  {modalResult.message}
                </div>
                {generateMode === 'bulk' ? (
                  <div className="space-y-1 text-slate-300 pt-1">
                    <p>Bills Generated: <strong className="text-slate-100">{modalResult.generated_count}</strong></p>
                    <p>Skipped (Already Existed): <strong className="text-slate-400">{modalResult.skipped_count}</strong></p>
                    {modalResult.advance_adjusted_count > 0 && (
                      <p>Advance Credit Auto-Adjusted: <strong className="text-emerald-400">{modalResult.advance_adjusted_count} subscribers</strong></p>
                    )}
                  </div>
                ) : modalResult.bill ? (
                  <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                    <p>Subscriber: <strong className="text-slate-100">{modalResult.bill.customer?.name} ({modalResult.bill.customer?.customer_code})</strong></p>
                    <p>Bill Month: <strong className="text-slate-100">{formatBillMonth(modalResult.bill.bill_month)}</strong></p>
                    <p>Bill Amount: <strong className="text-emerald-400">৳{formatCurrency(modalResult.bill.amount)}</strong></p>
                    <p>Advance Credit: <strong className="text-cyan-400">৳{formatCurrency(modalResult.bill.advance || 0)}</strong></p>
                  </div>
                ) : null}
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleGenerateSubmit} className="space-y-4 text-xs">
                {modalError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {/* Single Mode Subscriber Search */}
                {generateMode === 'single' && (
                  <div className="space-y-2 pb-2">
                    <label className="block text-slate-300 font-semibold">Search Subscriber *</label>
                    {!genSelectedCustomer ? (
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={genSearchQuery}
                          onChange={(e) => setGenSearchQuery(e.target.value)}
                          placeholder="Search Customer Code (e.g. CCL00001), Name, or Phone..."
                          className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                        {genSearching && (
                          <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin absolute right-3 top-3" />
                        )}

                        {genSearchResults.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-30 max-h-52 overflow-y-auto divide-y divide-slate-850">
                            {genSearchResults.map((c) => (
                              <button
                                type="button"
                                key={c.id}
                                onClick={() => handleSelectGenCustomer(c)}
                                className="w-full p-2.5 text-left hover:bg-slate-900 transition flex items-center justify-between text-xs"
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-100">{c.name}</span>
                                    <span className="font-mono text-[10px] text-cyan-400 font-semibold">({c.customer_code})</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <span>{c.phone}</span>
                                    <span>•</span>
                                    <span>{c.area?.name}</span>
                                    {c.address && (
                                      <>
                                        <span>•</span>
                                        <span className="text-amber-400/90 flex items-center gap-1 font-medium">
                                          <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                                          <span className="line-clamp-1">{c.address}</span>
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <span className="font-bold text-emerald-400 shrink-0 pl-2">৳{formatCurrency(c.monthly_rent)}/mo</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-950 border border-cyan-500/30 rounded-xl p-3 flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-100 flex items-center gap-1.5">
                            <span>{genSelectedCustomer.name}</span>
                            <span className="font-mono text-[10px] text-cyan-400 font-bold">({genSelectedCustomer.customer_code})</span>
                            <span className="text-[9px] uppercase font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded ml-1">
                              {genSelectedCustomer.area?.name}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>Phone: <strong className="text-slate-300 font-medium">{genSelectedCustomer.phone}</strong></span>
                            <span>•</span>
                            <span>Rent: <strong className="text-slate-200 font-medium">৳{formatCurrency(genSelectedCustomer.monthly_rent)}</strong></span>
                          </div>
                          {genSelectedCustomer.address && (
                            <div className="text-[11px] text-amber-400/90 flex items-center gap-1 pt-0.5">
                              <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="font-medium bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{genSelectedCustomer.address}</span>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setGenSelectedCustomer(null)}
                          className="px-2 py-1 text-slate-400 hover:text-rose-400 bg-slate-900 rounded border border-slate-800 text-[11px] shrink-0 ml-2"
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Target Bill Month *</label>
                    <input
                      type="month"
                      required
                      value={generateData.bill_month}
                      onChange={(e) => {
                        const m = e.target.value;
                        setGenerateData(prev => ({
                          ...prev,
                          bill_month: m,
                          due_date: `${m}-25`,
                          amount: genSelectedCustomer ? calculateSuggestedRent(genSelectedCustomer, m) : prev.amount,
                        }));
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Payment Due Date *</label>
                    <input
                      type="date"
                      required
                      value={generateData.due_date}
                      onChange={(e) => setGenerateData({ ...generateData, due_date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {generateMode === 'single' && genSelectedCustomer && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Bill Amount (৳) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={generateData.amount}
                        onChange={(e) => setGenerateData({ ...generateData, amount: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-bold focus:outline-none focus:border-cyan-500"
                      />
                      {parseFloat(generateData.amount) < parseFloat(genSelectedCustomer.monthly_rent || 0) && (
                        <p className="text-[10px] text-amber-400 mt-0.5">Prorated based on connection date.</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Previous Dues (৳) (Optional)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Auto or Custom..."
                        value={generateData.previous_dues}
                        onChange={(e) => setGenerateData({ ...generateData, previous_dues: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-rose-400 font-semibold focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                )}

                {generateMode === 'bulk' && (
                  <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    This will generate monthly bills for all <strong className="text-slate-200">Active Subscribers</strong>. Duplicate bills for the same month will be automatically skipped. Any available Advance Credit Balance will be auto-applied.
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalSubmitting || (generateMode === 'single' && !genSelectedCustomer)}
                    className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {modalSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {modalSubmitting
                      ? 'Generating Bills...'
                      : generateMode === 'single'
                      ? 'Generate Bill for Subscriber'
                      : 'Confirm Bulk Generate'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* Bulk Payment Excel Import Modal */}
      {showPaymentImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-slate-100">Bulk Payment Excel Import</h3>
              </div>
              <button
                onClick={() => setShowPaymentImportModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-emerald-300 font-semibold">1. Download Sample Demo Excel Template</div>
                <button
                  type="button"
                  onClick={handleDownloadPaymentSample}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg shadow transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Sample Template (.xlsx)
                </button>
              </div>
              <p className="text-[11px] text-slate-400">Fill in subscriber codes/phones and payment amounts before uploading.</p>
            </div>

            {paymentImportResult && (
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs space-y-1">
                <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  {paymentImportResult.message}
                </div>
                <div className="text-slate-300 text-[11px]">
                  Imported: <strong className="text-emerald-400">{paymentImportResult.imported_count}</strong> payment(s) | Skipped: <strong className="text-amber-400">{paymentImportResult.skipped_count}</strong> (invalid subscriber/amount).
                </div>
              </div>
            )}

            <form onSubmit={handlePaymentImportSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">2. Select Excel File (.xlsx / .csv) *</label>
                <input
                  type="file"
                  required
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setPaymentImportFile(e.target.files[0])}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 bg-slate-950 p-2 border border-slate-800 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentImportModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={paymentImporting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {paymentImporting ? 'Importing Excel...' : 'Upload & Import Payments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-Page Edit Bill Modal */}
      {editingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-400" />
                Edit Monthly Bill: {formatBillMonth(editingBill.bill_month)}
              </h3>
              <button
                onClick={() => setEditingBill(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subscriber Info Header */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold text-cyan-400">{editingBill.customer?.customer_code}</span>
                <span className="text-[10px] text-slate-400">{editingBill.customer?.area?.name}</span>
              </div>
              <div className="font-bold text-slate-100">{editingBill.customer?.name}</div>
              <div className="text-slate-400 text-[11px]">{editingBill.customer?.phone} • {editingBill.customer?.address}</div>
            </div>

            <form onSubmit={handleEditBillSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Monthly Bill Amount (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editBillForm.amount}
                  onChange={(e) => setEditBillForm({ ...editBillForm, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Previous Dues (পূর্বের বকেয়া) (৳)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editBillForm.previous_dues}
                  onChange={(e) => setEditBillForm({ ...editBillForm, previous_dues: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-rose-400 focus:outline-none focus:border-cyan-500 font-bold"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Bill Payment Due Date</label>
                <input
                  type="date"
                  required
                  value={editBillForm.due_date}
                  onChange={(e) => setEditBillForm({ ...editBillForm, due_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Bill Status</label>
                <select
                  value={editBillForm.status}
                  onChange={(e) => setEditBillForm({ ...editBillForm, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500 font-medium"
                >
                  <option value="unpaid">Unpaid (Outstanding)</option>
                  <option value="partial">Partial (Partially Paid)</option>
                  <option value="paid">Paid (Fully Cleared)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBill(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editingSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/20 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {editingSubmitting ? 'Updating Bill...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Confirm Modal */}
      <ConfirmModal
        {...confirmConfig}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default BillListPage;
