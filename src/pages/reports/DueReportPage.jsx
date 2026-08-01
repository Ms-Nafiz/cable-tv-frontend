import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { AlertCircle, Printer, MapPin, Phone } from 'lucide-react';
import Pagination from '../../components/Pagination';

const DueReportPage = () => {
  const [data, setData] = useState({
    total_due_customers: 0,
    total_due_amount: 0,
    customers: [],
  });
  const [areas, setAreas] = useState([]);
  const [areaFilter, setAreaFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    fetchAreas();
    fetchDueReport();
  }, [areaFilter]);

  const fetchAreas = async () => {
    try {
      const res = await api.get('/areas');
      setAreas(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDueReport = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/due-customers', {
        params: { area_id: areaFilter }
      });
      setData(res.data);
      setCurrentPage(1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const customersList = data.customers || [];
  const totalPages = Math.ceil(customersList.length / ITEMS_PER_PAGE);
  const paginatedCustomers = customersList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center no-print">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Outstanding Due Customers Report</h2>
          <p className="text-xs text-slate-400 mt-1">List of subscribers with unpaid monthly bills ({customersList.length} total).</p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
        >
          <Printer className="w-4 h-4 text-cyan-400" />
          Print Due List
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex gap-3 no-print">
        <select
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
        >
          <option value="">All Zones / Areas</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Total Defaulters</div>
          <div className="text-xl font-bold text-slate-100">{data.total_due_customers} Subscribers</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-xs text-slate-400">Total Outstanding Amount</div>
          <div className="text-xl font-bold text-rose-400">৳{data.total_due_amount.toFixed(2)}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Customer Code / Name</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Zone / Area</th>
                <th className="py-3 px-4">Collector</th>
                <th className="py-3 px-4 text-center">Unpaid Months</th>
                <th className="py-3 px-4 text-right">Total Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr><td colSpan="6" className="py-6 text-center text-cyan-400">Loading due report...</td></tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr><td colSpan="6" className="py-6 text-center text-slate-500">No overdue subscribers found.</td></tr>
              ) : (
                paginatedCustomers.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-cyan-400">{c.customer_code}</div>
                      <div className="font-semibold text-slate-200">{c.name}</div>
                    </td>
                    <td className="py-3 px-4 font-mono">{c.phone}</td>
                    <td className="py-3 px-4">{c.area?.name}</td>
                    <td className="py-3 px-4 text-slate-400">{c.collector?.name || 'Unassigned'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[11px]">
                        {c.bills?.length || 0} Month(s)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-400">৳{parseFloat(c.total_due).toFixed(2)}</td>
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
          totalItems={customersList.length}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      </div>
    </div>
  );
};

export default DueReportPage;
