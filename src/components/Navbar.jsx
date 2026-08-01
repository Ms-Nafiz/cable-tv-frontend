import React from 'react';
import { LogOut, MapPin, Menu, X, Tv } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const Navbar = ({ onToggleMobileMenu, isMobileMenuOpen }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Mobile Brand Title */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="p-1.5 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-lg">
            <Tv className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-100 text-sm tracking-wide">CableTV</span>
        </div>

        {/* Desktop Title & Area Badge */}
        <div className="hidden lg:flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cable TV Billing Portal</span>
          {user?.area && (
            <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700 font-medium">
              <MapPin className="w-3 h-3 text-cyan-400" />
              {user.area.name}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* User Info Pill */}
        <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="text-xs text-left hidden sm:block">
            <div className="font-semibold text-slate-200 truncate max-w-[120px]">{user?.name}</div>
            <div className="text-[10px] text-slate-400 capitalize">{user?.role?.replace('_', ' ')}</div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 sm:px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition duration-200"
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
