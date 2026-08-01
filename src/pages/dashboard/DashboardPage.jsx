import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { 
  Users, 
  Tv, 
  DollarSign, 
  AlertCircle, 
  Calendar, 
  UserPlus, 
  FileText,
  TrendingUp,
  Receipt
} from 'lucide-react';

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeAnalog: 0,
    activeDigital: 0,
    totalCollected: 0,
    totalDueAmount: 0,
    totalDueCount: 0,
  });
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/summary');
      const data = res.data;

      setStats({
        totalCustomers: data.totalCustomers || 0,
        activeAnalog: data.activeAnalog || 0,
        activeDigital: data.activeDigital || 0,
        totalCollected: data.totalCollected || 0,
        totalDueAmount: data.totalDueAmount || 0,
        totalDueCount: data.totalDueCount || 0,
      });

      setRecentPayments(data.recentPayments || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-cyan-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-100">Cable TV Management Overview</h2>
          <p className="text-xs text-slate-400 mt-1">Real-time stats for customers, monthly billings, and collections.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Link
            to="/customers/new"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl text-xs font-semibold shadow-lg shadow-cyan-500/20 transition"
          >
            <UserPlus className="w-4 h-4" />
            Add Customer
          </Link>
          <Link
            to="/billing/generate"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Calendar className="w-4 h-4 text-cyan-400" />
            Generate Bills
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-medium">
            <span>Total Customers</span>
            <div className="p-2 bg-slate-800 rounded-lg text-cyan-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{stats.totalCustomers}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1 border-t border-slate-800">
            <span className="text-cyan-400 font-semibold">{stats.activeAnalog} Analog</span>
            <span>•</span>
            <span className="text-blue-400 font-semibold">{stats.activeDigital} Digital</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-medium">
            <span>Total Collected</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">৳{stats.totalCollected.toFixed(2)}</div>
          <div className="text-[11px] text-emerald-400/80 flex items-center gap-1 pt-1 border-t border-slate-800">
            <TrendingUp className="w-3 h-3" />
            <span>Successful collections to date</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-medium">
            <span>Outstanding Dues</span>
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-400">৳{stats.totalDueAmount.toFixed(2)}</div>
          <div className="text-[11px] text-rose-400/80 pt-1 border-t border-slate-800">
            <span>{stats.totalDueCount} customers have pending dues</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-2">
          <div className="flex justify-between items-center text-slate-400 text-xs font-medium">
            <span>Quick Reports</span>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="pt-2 flex flex-col gap-1.5 text-xs">
            <Link to="/reports/collection-summary" className="text-cyan-400 hover:underline">
              → Collection Summary
            </Link>
            <Link to="/reports/due-list" className="text-amber-400 hover:underline">
              → Due List Report
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Collections Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-cyan-400" />
            Recent Collection Activity
          </h3>
          <Link to="/reports/collection-summary" className="text-xs text-cyan-400 hover:underline font-medium">
            View All
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-3">Receipt No</th>
                <th className="pb-3 px-3">Customer</th>
                <th className="pb-3 px-3">Bill Month</th>
                <th className="pb-3 px-3">Collector</th>
                <th className="pb-3 px-3">Method</th>
                <th className="pb-3 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-500">
                    No payment collections recorded yet.
                  </td>
                </tr>
              ) : (
                recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-mono font-semibold text-cyan-400">{p.receipt_no}</td>
                    <td className="py-3 px-3 font-medium text-slate-200">
                      {p.customer?.name} ({p.customer?.customer_code})
                    </td>
                    <td className="py-3 px-3">{p.bill?.bill_month}</td>
                    <td className="py-3 px-3 text-slate-400">{p.collector?.name}</td>
                    <td className="py-3 px-3 uppercase font-medium text-slate-300">{p.payment_method}</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-400">৳{parseFloat(p.amount_paid).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
