import React, { useState } from 'react';
import api from '../../api/axios';
import { Calendar, CheckCircle2, AlertCircle, Info, Calculator } from 'lucide-react';

const GenerateBillPage = () => {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const defaultDueDate = `${currentMonth}-25`;

  const [billMonth, setBillMonth] = useState(currentMonth);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await api.post('/bills/generate', {
        bill_month: billMonth,
        due_date: dueDate,
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Bill generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Bulk Monthly Bill Generator</h2>
        <p className="text-xs text-slate-400 mt-1">Generate monthly bills for all active subscribers at once.</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
          {error}
        </div>
      )}

      {result && (
        <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            {result.message}
          </div>
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
              <span className="text-slate-400 block">Total Active:</span>
              <strong className="text-cyan-400 text-base">{result.total_active}</strong>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleGenerate} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Bill Month (YYYY-MM)</label>
          <input
            type="month"
            required
            value={billMonth}
            onChange={(e) => {
              setBillMonth(e.target.value);
              setDueDate(`${e.target.value}-25`);
            }}
            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Payment Due Date</label>
          <input
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Business Logic Rules Info */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-400">
          <div className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-cyan-400" />
            Billing Generation Business Rules:
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
            <li>Duplicate prevention constraint: <code>unique(customer_id, bill_month)</code> prevents double billing.</li>
            <li>Disconnected and inactive subscribers are automatically excluded.</li>
            <li>
              <strong>Prorated calculation:</strong> Mid-month connections are prorated based on active days in the month 
              <code> (monthly_rent / days_in_month) * active_days</code>.
            </li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Calendar className="w-4 h-4" />
          {loading ? 'Generating Bills...' : `Generate Bulk Bills for ${billMonth}`}
        </button>
      </form>
    </div>
  );
};

export default GenerateBillPage;
