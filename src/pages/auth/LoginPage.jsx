import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Tv, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';

const LoginPage = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'collector') {
        navigate('/collector/quick', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, authLoading, navigate]);

  if (authLoading || user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center text-cyan-400 text-xs font-semibold animate-pulse">
          Redirecting to system dashboard...
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await login(phone, password);
      if (userData.role === 'collector') {
        navigate('/collector/quick', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid phone or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (p, pwd) => {
    setPhone(p);
    setPassword(pwd);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-cyan-500/30">
            <Tv className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Cable TV Billing</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in with your phone number</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Phone Number</label>
            <input
              type="text"
              required
              placeholder="e.g. 01700000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-cyan-500/20 transition duration-200 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Quick Fill Demo Roles */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-xs text-slate-400 font-medium mb-3 text-center">Quick Demo Login</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickFill('01700000000', 'password')}
              className="px-2.5 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-medium text-cyan-300 flex flex-col items-center gap-1 transition"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Super Admin
            </button>
            <button
              onClick={() => handleQuickFill('01800000000', 'password')}
              className="px-2.5 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-medium text-emerald-300 flex flex-col items-center gap-1 transition"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Accounts
            </button>
            <button
              onClick={() => handleQuickFill('01711111111', 'password')}
              className="px-2.5 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-medium text-amber-300 flex flex-col items-center gap-1 transition"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Collector
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
