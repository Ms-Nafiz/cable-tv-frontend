import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { ShieldCheck, Printer } from 'lucide-react';
import Pagination from '../../components/Pagination';

const DepositLedgerPage = () => {
  const [data, setData] = useState({
    total_collected: 0,
    total_refunded: 0,
    net_deposit: 0,
    deposits: [],
  });
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    fetchDepositLedger();
  }, []);

  const fetchDepositLedger = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/deposit-ledger');
      setData(res.data);
      setCurrentPage(1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const depositsList = data.deposits || [];
  const totalPages = Math.ceil(depositsList.length / ITEMS_PER_PAGE);
  const paginatedDeposits = depositsList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Deposit Ledger Report</h2>
          <p className="text-xs text-slate-400 mt-1">Audit log of all security deposit collections and disconnection refunds ({depositsList.length} total).</p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
        >
          <Printer className="w-4 h-4 text-cyan-400" />
          Print Ledger
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Total Deposit Collected</div>
          <div className="text-xl font-bold text-emerald-400">৳{data.total_collected.toFixed(2)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Total Deposit Refunded</div>
          <div className="text-xl font-bold text-rose-400">৳{data.total_refunded.toFixed(2)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Net Holding Security Deposit</div>
          <div className="text-xl font-bold text-cyan-400">৳{data.net_deposit.toFixed(2)}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Remarks / Breakdown</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr><td colSpan="6" className="py-6 text-center text-cyan-400">Loading ledger...</td></tr>
              ) : paginatedDeposits.length === 0 ? (
                <tr><td colSpan="6" className="py-6 text-center text-slate-500">No deposit entries recorded.</td></tr>
              ) : (
                paginatedDeposits.map((d) => (
                  <tr key={d.id}>
                    <td className="py-3 px-4 text-slate-400">{d.date}</td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      {d.customer?.name} ({d.customer?.customer_code})
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        d.type === 'collected' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {d.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-[11px] max-w-md">{d.remarks}</td>
                    <td className="py-3 px-4 text-slate-400">{d.creator?.name}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-100">৳{parseFloat(d.amount).toFixed(2)}</td>
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
          totalItems={depositsList.length}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      </div>
    </div>
  );
};

export default DepositLedgerPage;
