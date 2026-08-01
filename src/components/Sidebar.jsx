import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Tv, 
  Users, 
  UserPlus, 
  Receipt, 
  Calendar, 
  Wallet, 
  FileText, 
  MapPin, 
  UserCheck, 
  LayoutDashboard,
  DollarSign,
  Search,
  X,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const role = user?.role;
  const [isCollapsed, setIsCollapsed] = useState(false);

  const categories = [
    {
      title: 'MAIN NAVIGATION',
      items: [
        {
          name: 'Dashboard',
          path: '/dashboard',
          icon: LayoutDashboard,
          roles: ['super_admin', 'accounts'],
        },
        {
          name: 'Customer List',
          path: '/customers',
          icon: Users,
          roles: ['super_admin', 'accounts'],
        },
      ],
    },
    {
      title: 'BILLING & COLLECTION',
      items: [
        {
          name: 'Search & Collect',
          path: '/billing/quick-collect',
          icon: Search,
          roles: ['collector', 'super_admin', 'accounts'],
        },
        {
          name: 'Monthly Bill Registry',
          path: '/billing/list',
          icon: Receipt,
          roles: ['super_admin', 'accounts'],
        },
        {
          name: 'My Collections',
          path: '/collector/my-collections',
          icon: DollarSign,
          roles: ['collector', 'super_admin', 'accounts'],
        },
      ],
    },
    {
      title: 'REPORTS & STATEMENTS',
      items: [
        {
          name: 'Customer Statement',
          path: '/reports/customer-statement',
          icon: FileText,
          roles: ['super_admin', 'accounts', 'collector'],
        },
        {
          name: 'Collection Summary',
          path: '/reports/collection-summary',
          icon: FileText,
          roles: ['super_admin', 'accounts'],
        },
        {
          name: 'Due List Report',
          path: '/reports/due-list',
          icon: Wallet,
          roles: ['super_admin', 'accounts'],
        },
        {
          name: 'Deposit Ledger',
          path: '/reports/deposit-ledger',
          icon: Receipt,
          roles: ['super_admin', 'accounts'],
        },
      ],
    },
    {
      title: 'SYSTEM SETUP',
      items: [
        {
          name: 'Area / Zone Setup',
          path: '/areas',
          icon: MapPin,
          roles: ['super_admin'],
        },
        {
          name: 'User Management',
          path: '/users',
          icon: UserCheck,
          roles: ['super_admin'],
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-screen transform transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:w-20' : 'w-64'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20 shrink-0">
              <Tv className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <h1 className="font-bold text-slate-100 tracking-wide text-base">CableTV Pro</h1>
                <p className="text-[11px] text-cyan-400 font-medium">Customer & Billing</p>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categorized Navigation List */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
          {categories.map((cat, idx) => {
            const visibleItems = cat.items.filter(item => item.roles.includes(role));
            if (visibleItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                {/* Category Header */}
                {!isCollapsed ? (
                  <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    {cat.title}
                  </div>
                ) : (
                  idx > 0 && <div className="my-2 border-t border-slate-800/80" />
                )}

                {/* Category Links */}
                {visibleItems.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.path}
                      to={link.path}
                      end
                      onClick={onClose}
                      title={isCollapsed ? link.name : undefined}
                      className={({ isActive }) =>
                        `flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'} py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/30 shadow-md'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 text-cyan-400 shrink-0" />
                      {!isCollapsed && <span className="truncate">{link.name}</span>}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* User Role Footer */}
        <div className={`p-4 border-t border-slate-800 bg-slate-950/50 ${isCollapsed ? 'flex flex-col items-center justify-center text-center' : ''}`}>
          {!isCollapsed ? (
            <>
              <div className="text-[11px] text-slate-400">Logged in as:</div>
              <div className="text-xs font-semibold text-slate-200 truncate">{user?.name}</div>
              <span className="inline-block mt-1 px-2 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {user?.role?.replace('_', ' ')}
              </span>
            </>
          ) : (
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs border border-cyan-500/30" title={user?.name}>
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
