import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserPlus, Tv, ShieldCheck } from 'lucide-react';

const CustomerCreatePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: areas = [] } = useQuery({
    queryKey: ['areas'],
    queryFn: async () => (await api.get('/areas')).data,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });

  const collectors = users.filter((u) => u.role === 'collector');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    area_id: '',
    connection_type: 'analog',
    stb_serial: '',
    monthly_rent: '500',
    deposit_amount: '500',
    dues: '0',
    advance: '0',
    connection_date: new Date().toISOString().split('T')[0],
    assigned_collector_id: '',
  });

  // Set default area & collector once available
  useEffect(() => {
    if (areas.length > 0 && !formData.area_id) {
      setFormData((prev) => ({ ...prev, area_id: areas[0].id }));
    }
  }, [areas]);

  useEffect(() => {
    if (collectors.length > 0 && !formData.assigned_collector_id) {
      setFormData((prev) => ({ ...prev, assigned_collector_id: collectors[0].id }));
    }
  }, [collectors]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnectionTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      connection_type: type,
      monthly_rent: type === 'digital' ? '800' : '500',
      deposit_amount: type === 'digital' ? '1000' : '500',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/customers', formData);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/customers');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/customers"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-100">Add New Customer</h2>
          <p className="text-xs text-slate-400">Register new subscriber and record initial deposit entry.</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        {/* Connection Type Switcher */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">Connection Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => handleConnectionTypeChange('analog')}
              className={`p-4 rounded-xl border flex items-center justify-between transition ${
                formData.connection_type === 'analog'
                  ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="font-bold text-sm text-slate-200">Analog Connection</div>
                <div className="text-xs text-slate-400">Default Deposit: ৳500 (Refundable)</div>
              </div>
              <Tv className="w-6 h-6 text-cyan-400" />
            </button>

            <button
              type="button"
              onClick={() => handleConnectionTypeChange('digital')}
              className={`p-4 rounded-xl border flex items-center justify-between transition ${
                formData.connection_type === 'digital'
                  ? 'bg-blue-500/10 border-blue-500 text-blue-400'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="font-bold text-sm text-slate-200">Digital STB Connection</div>
                <div className="text-xs text-slate-400">Default Deposit: ৳1000 (STB Security)</div>
              </div>
              <Tv className="w-6 h-6 text-blue-400" />
            </button>
          </div>
        </div>

        {/* Customer Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Rahim Uddin"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone Number *</label>
            <input
              type="text"
              required
              placeholder="e.g. 01911111111"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Address</label>
            <textarea
              rows="2"
              placeholder="House, Road, Block, Flat details..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            ></textarea>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Zone / Area *</label>
            <select
              required
              value={formData.area_id}
              onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Assigned Collector</label>
            <select
              value={formData.assigned_collector_id}
              onChange={(e) => setFormData({ ...formData, assigned_collector_id: e.target.value })}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">Unassigned</option>
              {collectors.map((col) => (
                <option key={col.id} value={col.id}>{col.name} ({col.phone})</option>
              ))}
            </select>
          </div>

          {formData.connection_type === 'digital' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">STB Serial Number</label>
              <input
                type="text"
                placeholder="e.g. STB-8839210"
                value={formData.stb_serial}
                onChange={(e) => setFormData({ ...formData, stb_serial: e.target.value })}
                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Monthly Rent (৳) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.monthly_rent}
              onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Deposit Amount (৳) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.deposit_amount}
              onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Opening Dues (পূর্বের বকেয়া) (৳)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.dues}
              onChange={(e) => setFormData({ ...formData, dues: e.target.value })}
              placeholder="0.00"
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-rose-400 font-semibold focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Advance Balance (অগ্রিম জমা) (৳)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.advance}
              onChange={(e) => setFormData({ ...formData, advance: e.target.value })}
              placeholder="0.00"
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-cyan-400 font-semibold focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Connection Date *</label>
            <input
              type="date"
              required
              value={formData.connection_date}
              onChange={(e) => setFormData({ ...formData, connection_date: e.target.value })}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Deposit Note */}
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center gap-2 text-cyan-300 text-xs">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>
            Initial deposit entry of <strong>৳{formData.deposit_amount}</strong> will be automatically recorded under this customer.
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
        >
          {loading ? 'Creating Customer...' : 'Save & Register Customer'}
        </button>
      </form>
    </div>
  );
};

export default CustomerCreatePage;
