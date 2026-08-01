import React from 'react';
import { X, Printer, CheckCircle, Tv } from 'lucide-react';

const ReceiptModal = ({ payment, onClose }) => {
  if (!payment) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl">
        {/* Header no-print */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center no-print">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            Payment Receipt
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-semibold shadow transition"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div id="receipt-print-area" className="p-6 text-slate-200 bg-white text-slate-900 print:text-black print:p-0">
          <div className="border border-slate-300 p-6 rounded-xl space-y-4">
            {/* Cable TV Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-900 text-cyan-400 rounded-lg">
                  <Tv className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">CABLE TV NETWORK</h2>
                  <p className="text-xs text-slate-600">Customer Money Receipt</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded text-xs">
                  {payment.receipt_no}
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Date: {new Date(payment.payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500 block">Customer Name:</span>
                <span className="font-bold text-slate-900">{payment.customer?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Customer ID:</span>
                <span className="font-bold text-slate-900">{payment.customer?.customer_code}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Phone:</span>
                <span className="font-medium text-slate-900">{payment.customer?.phone}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Area / Zone:</span>
                <span className="font-medium text-slate-900">{payment.customer?.area?.name}</span>
              </div>
            </div>

            {/* Payment Info */}
            <table className="w-full text-xs text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  <th className="p-2 border-r border-slate-200">Bill Month</th>
                  <th className="p-2 border-r border-slate-200">Payment Method</th>
                  <th className="p-2 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-2 border-r border-slate-200 font-semibold">
                    {payment.collected_months || payment.bill?.bill_month}
                  </td>
                  <td className="p-2 border-r border-slate-200 uppercase font-medium">{payment.payment_method}</td>
                  <td className="p-2 text-right font-bold text-emerald-700 text-sm">
                    ৳{parseFloat(payment.total_amount_paid || payment.amount_paid).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Footer Signatures */}
            <div className="pt-8 flex justify-between items-end text-xs text-slate-600">
              <div className="text-center border-t border-slate-300 pt-1 w-32">
                Customer Signature
              </div>
              <div className="text-center border-t border-slate-300 pt-1 w-40">
                <span className="block font-medium text-slate-900">{payment.collector?.name}</span>
                Collector / Accounts
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
