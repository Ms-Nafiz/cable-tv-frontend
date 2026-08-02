import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../auth/AuthContext';
import { FileText, DollarSign, Calendar, Filter, Printer, FileSpreadsheet, Edit, Trash2, X, Save } from 'lucide-react';
import Pagination from '../../components/Pagination';

const CollectionReportPage = () => {
  const [data, setData] = useState({
    total_collected: 0,
    cash_total: 0,
    digital_total: 0,
    count: 0,
    payments: [],
  });
  const [areas, setAreas] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    area_id: '',
    collector_id: '',
  });

  const handleExportExcel = async () => {
    try {
      const response = await api.get('/reports/collection-summary/export-excel', {
        params: filters,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Collection_Summary_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to export collection summary report');
    }
  };

  const { hasRole } = useAuth();
  const [editingPayment, setEditingPayment] = useState(null);
  const [editForm, setEditForm] = useState({
    amount_paid: '',
    payment_method: 'cash',
    payment_date: '',
    notes: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const handleOpenEdit = (payment) => {
    setEditingPayment(payment);
    setEditForm({
      amount_paid: payment.amount_paid,
      payment_method: payment.payment_method || 'cash',
      payment_date: payment.payment_date ? payment.payment_date.split('T')[0] : '',
      notes: payment.notes || '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPayment) return;
    setSavingEdit(true);
    try {
      await api.put(`/payments/${editingPayment.id}`, editForm);
      alert('Collection payment updated successfully!');
      setEditingPayment(null);
      fetchReport();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update payment collection');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePayment = async (payment) => {
    if (!window.confirm(`Are you sure you want to DELETE money receipt ${payment.receipt_no}? This action will restore the bill balance as unpaid/partial.`)) {
      return;
    }
    try {
      await api.delete(`/payments/${payment.id}`);
      alert(`Money receipt ${payment.receipt_no} deleted successfully.`);
      fetchReport();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete payment collection');
    }
  };

  useEffect(() => {
    fetchOptions();
    fetchReport();
  }, []);

  const fetchOptions = async () => {
    try {
      const [areaRes, userRes] = await Promise.all([
        api.get('/areas'),
        api.get('/users'),
      ]);
      setAreas(areaRes.data);
      setCollectors(userRes.data.filter(u => u.role === 'collector'));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/collection-summary', { params: filters });
      setData(res.data);
      setCurrentPage(1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchReport();
  };

  const paymentsList = data.payments || [];
  const totalPages = Math.ceil(paymentsList.length / ITEMS_PER_PAGE);
  const paginatedPayments = paymentsList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Collection Summary Report</h2>
          <p className="text-xs text-slate-400 mt-1">Date range, area, and collector wise collection report ({paymentsList.length} total).</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition"
            title="Export Collection Summary to Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-white" />
            Export Excel (.xlsx)
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            Print Report
          </button>
        </div>
      </div>

      {/* Filter Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm no-print">
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Start Date</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">End Date</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Zone / Area</label>
            <select
              value={filters.area_id}
              onChange={(e) => setFilters({ ...filters, area_id: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
            >
              <option value="">All Zones</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Collector</label>
            <select
              value={filters.collector_id}
              onChange={(e) => setFilters({ ...filters, collector_id: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
            >
              <option value="">All Collectors</option>
              {collectors.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20"
            >
              Generate Summary
            </button>
          </div>
        </form>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Total Revenue Collected</div>
          <div className="text-xl font-bold text-emerald-400">৳{data.total_collected.toFixed(2)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Cash Collections</div>
          <div className="text-xl font-bold text-slate-100">৳{data.cash_total.toFixed(2)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Digital Payment (bKash/Nagad/Bank)</div>
          <div className="text-xl font-bold text-cyan-400">৳{data.digital_total.toFixed(2)}</div>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Receipt No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Zone / Area</th>
                <th className="py-3 px-4">Collector</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                {hasRole('super_admin') && <th className="py-3 px-4 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr><td colSpan={hasRole('super_admin') ? 8 : 7} className="py-6 text-center text-cyan-400">Loading summary...</td></tr>
              ) : paginatedPayments.length === 0 ? (
                <tr><td colSpan={hasRole('super_admin') ? 8 : 7} className="py-6 text-center text-slate-500">No collection records found.</td></tr>
              ) : (
                paginatedPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">{p.receipt_no}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(p.payment_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-medium text-slate-200">{p.customer?.name} ({p.customer?.customer_code})</td>
                    <td className="py-3 px-4">{p.customer?.area?.name}</td>
                    <td className="py-3 px-4">{p.collector?.name}</td>
                    <td className="py-3 px-4 uppercase font-medium">{p.payment_method}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">৳{parseFloat(p.amount_paid).toFixed(2)}</td>
                    {hasRole('super_admin') && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 rounded-lg transition"
                            title="Edit Collection (Super Admin Only)"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePayment(p)}
                            className="p-1.5 bg-slate-800 hover:bg-red-950/40 text-red-400 hover:text-red-300 rounded-lg transition"
                            title="Delete Collection (Super Admin Only)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
          totalItems={paymentsList.length}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      </div>

      {/* Super Admin Edit Collection Modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Edit className="w-4 h-4 text-cyan-400" />
                  Edit Collection Payment
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Receipt: <span className="font-mono text-cyan-400 font-bold">{editingPayment.receipt_no}</span>
                </p>
              </div>
              <button
                onClick={() => setEditingPayment(null)}
                className="p-1 text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Subscriber</label>
                <input
                  type="text"
                  disabled
                  value={`${editingPayment.customer?.name || ''} (${editingPayment.customer?.customer_code || ''})`}
                  className="w-full px-3.5 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-400 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Amount Paid (৳)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editForm.amount_paid}
                    onChange={(e) => setEditForm({ ...editForm, amount_paid: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
                  <select
                    value={editForm.payment_method}
                    onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="cash">CASH</option>
                    <option value="bkash">BKASH</option>
                    <option value="nagad">NAGAD</option>
                    <option value="bank">BANK</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Collection Date</label>
                <input
                  type="date"
                  value={editForm.payment_date}
                  onChange={(e) => setEditForm({ ...editForm, payment_date: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Remarks</label>
                <textarea
                  rows="2"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Payment remarks or bKash TrxID..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-600/20 transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingEdit ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionReportPage;
