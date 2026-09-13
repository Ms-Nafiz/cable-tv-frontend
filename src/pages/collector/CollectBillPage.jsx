import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { ArrowLeft, DollarSign, CheckCircle2, Tv, CreditCard, Wallet, Building2, Banknote, MapPin } from 'lucide-react';
import ReceiptModal from '../../components/ReceiptModal';

const CollectBillPage = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [bills, setBills] = useState([]);
  const [selectedBillId, setSelectedBillId] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receiptPayment, setReceiptPayment] = useState(null);

  useEffect(() => {
    fetchData();
  }, [customerId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [custRes, billRes] = await Promise.all([
        api.get(`/customers/${customerId}`),
        api.get(`/customers/${customerId}/bills`),
      ]);
      setCustomer(custRes.data);
      const unpaidBills = billRes.data.filter(b => b.status !== 'paid');
      setBills(unpaidBills);

      if (unpaidBills.length > 0) {
        setSelectedBillId(unpaidBills[0].id);
        setAmountPaid(unpaidBills[0].due_amount);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBillSelect = (billId) => {
    setSelectedBillId(billId);
    const b = bills.find(x => x.id === parseInt(billId));
    if (b) {
      setAmountPaid(b.due_amount);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBillId || !amountPaid) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await api.post('/payments', {
        bill_id: selectedBillId,
        amount_paid: amountPaid,
        payment_method: paymentMethod,
      });

      setReceiptPayment(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Collection entry failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-cyan-400">Loading collection form...</div>;
  }

  if (!customer) {
    return <div className="p-8 text-center text-slate-400">Customer not found.</div>;
  }

  const selectedBill = bills.find(x => x.id === parseInt(selectedBillId));

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/collector/my-customers"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-100">Bill Collection Entry</h2>
          <p className="text-xs text-slate-400">Record payment and issue instant money receipt.</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Customer Info Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-cyan-400">{customer.customer_code}</span>
            <span className="text-xs text-slate-400 font-semibold">{customer.area?.name}</span>
          </div>
          <h3 className="font-bold text-slate-100 text-base mt-0.5">{customer.name}</h3>
          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <span>{customer.phone}</span>
            {customer.address && (
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                {customer.address}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-400 block">Total Due</span>
          <span className="text-lg font-bold text-rose-400">৳{parseFloat(customer.total_due).toFixed(2)}</span>
        </div>
      </div>

      {bills.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h4 className="font-bold text-slate-200">No Pending Bills Found!</h4>
          <p className="text-xs text-slate-400">This subscriber has paid all generated monthly bills.</p>
          <Link
            to="/collector/my-customers"
            className="inline-block px-4 py-2 bg-slate-800 text-cyan-400 rounded-xl text-xs font-semibold"
          >
            Back to Customers List
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Select Bill Month to Pay</label>
            <select
              value={selectedBillId}
              onChange={(e) => handleBillSelect(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
            >
              {bills.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bill_month} — Total: ৳{parseFloat(b.amount).toFixed(2)} (Remaining Due: ৳{parseFloat(b.due_amount).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Amount Paid (৳)</label>
            <input
              type="number"
              step="0.01"
              required
              max={selectedBill ? selectedBill.due_amount : undefined}
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-emerald-400 focus:outline-none focus:border-cyan-500"
            />
            {selectedBill && (
              <p className="text-[11px] text-slate-400 mt-1">
                Full Bill Amount: ৳{parseFloat(selectedBill.amount).toFixed(2)} | Max collectable: ৳{parseFloat(selectedBill.due_amount).toFixed(2)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Payment Method</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'cash', label: 'Cash', icon: Banknote },
                { id: 'bkash', label: 'bKash', icon: Wallet },
                { id: 'nagad', label: 'Nagad', icon: Wallet },
                { id: 'bank', label: 'Bank', icon: Building2 },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`py-2.5 px-2 rounded-xl border flex flex-col items-center gap-1 text-xs font-semibold transition ${
                      paymentMethod === m.id
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <DollarSign className="w-4 h-4" />
            {submitting ? 'Recording Collection...' : 'Confirm Collection & Generate Receipt'}
          </button>
        </form>
      )}

      {/* Receipt Modal */}
      {receiptPayment && (
        <ReceiptModal
          payment={receiptPayment}
          onClose={() => {
            setReceiptPayment(null);
            navigate('/collector/my-customers');
          }}
        />
      )}
    </div>
  );
};

export default CollectBillPage;
