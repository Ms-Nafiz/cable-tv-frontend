import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { DollarSign, Receipt, Printer, Calendar } from 'lucide-react';
import ReceiptModal from '../../components/ReceiptModal';
import Pagination from '../../components/Pagination';

const MyCollectionsPage = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [dateFilter, setDateFilter] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    fetchCollections();
  }, [dateFilter]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateFilter) params.date = dateFilter;
      const res = await api.get('/payments', { params });
      setPayments(res.data);
      setCurrentPage(1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = payments.reduce((acc, p) => acc + parseFloat(p.amount_paid), 0);

  // Pagination calculations
  const totalPages = Math.ceil(payments.length / ITEMS_PER_PAGE);
  const paginatedPayments = payments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">My Collection History</h2>
          <p className="text-xs text-slate-400 mt-1">Summary of collections made by you ({payments.length} total).</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-cyan-400 hover:underline"
            >
              Clear Date Filter
            </button>
          )}
        </div>
      </div>

      {/* Metric Header */}
      <div className="p-5 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 rounded-2xl flex items-center justify-between shadow-sm">
        <div>
          <div className="text-xs text-emerald-400 font-medium">Total Collections Count</div>
          <div className="text-2xl font-bold text-slate-100 mt-0.5">{payments.length} Payments</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Total Amount Collected</div>
          <div className="text-2xl font-bold text-emerald-400">৳{totalAmount.toFixed(2)}</div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Receipt No</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Bill Month</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4">Collection Date</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr><td colSpan="7" className="py-8 text-center text-cyan-400">Loading collection history...</td></tr>
              ) : paginatedPayments.length === 0 ? (
                <tr><td colSpan="7" className="py-8 text-center text-slate-500">No collections found.</td></tr>
              ) : (
                paginatedPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-400">{p.receipt_no}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-100">{p.customer?.name}</div>
                      <div className="font-mono text-[10px] text-cyan-400">{p.customer?.customer_code} • {p.customer?.area?.name}</div>
                      {p.customer?.address && (
                        <div className="text-[10px] text-slate-400 font-normal truncate max-w-xs">{p.customer.address}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono">{p.bill?.bill_month}</td>
                    <td className="py-3.5 px-4 uppercase font-medium text-slate-300">{p.payment_method}</td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(p.payment_date).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400">৳{parseFloat(p.amount_paid).toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedReceipt(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Receipt
                      </button>
                    </td>
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
          totalItems={payments.length}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      </div>

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          payment={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};

export default MyCollectionsPage;
