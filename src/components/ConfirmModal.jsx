import React from 'react';
import { AlertTriangle, CheckCircle2, Info, X, HelpCircle } from 'lucide-react';

const ConfirmModal = ({
  isOpen,
  title = 'Confirmation Required',
  message = 'Are you sure you want to proceed?',
  type = 'danger', // 'danger' | 'warning' | 'info' | 'success'
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  showCancel = true,
  loading = false,
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          bgIcon: 'bg-red-950/60 border-red-800/60 text-red-400',
          btnConfirm: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-red-600/20',
          icon: <AlertTriangle className="w-6 h-6 text-red-400" />,
        };
      case 'warning':
        return {
          bgIcon: 'bg-amber-950/60 border-amber-800/60 text-amber-400',
          btnConfirm: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-amber-500/20',
          icon: <HelpCircle className="w-6 h-6 text-amber-400" />,
        };
      case 'success':
        return {
          bgIcon: 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400',
          btnConfirm: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/20',
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
        };
      case 'info':
      default:
        return {
          bgIcon: 'bg-cyan-950/60 border-cyan-800/60 text-cyan-400',
          btnConfirm: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20',
          icon: <Info className="w-6 h-6 text-cyan-400" />,
        };
    }
  };

  const style = getTypeStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative transform transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-xl transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl border ${style.bgIcon} shrink-0`}>
            {style.icon}
          </div>

          <div className="flex-1 pr-4">
            <h3 className="text-base font-bold text-slate-100">{title}</h3>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-800/80">
          {showCancel && (
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition"
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 font-semibold text-xs rounded-xl shadow-lg transition ${style.btnConfirm} disabled:opacity-50`}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
