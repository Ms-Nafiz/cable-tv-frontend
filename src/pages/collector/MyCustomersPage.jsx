import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Search, DollarSign, MapPin, Tv, Phone, CheckCircle2, User, X, Loader2 } from 'lucide-react';

const MyCustomersPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const dropdownRef = useRef(null);

  // Debounced search for suggestions
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get('/collector/customers', {
          params: { search: searchTerm }
        });
        setSuggestions(res.data);
        setShowDropdown(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setShowDropdown(false);
  };

  const handleClearSelection = () => {
    setSelectedCustomer(null);
    setSearchTerm('');
    setSuggestions([]);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Bill Collection Portal</h2>
        <p className="text-xs text-slate-400 mt-1">Search by Customer ID / Code, Phone, or Name to collect monthly bills.</p>
      </div>

      {/* Autocomplete Search Bar */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-cyan-400 absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (selectedCustomer) setSelectedCustomer(null);
            }}
            placeholder="Type Customer ID (e.g. CCL00001), Phone, or Name..."
            className="w-full pl-12 pr-10 py-3.5 bg-slate-900 border-2 border-slate-800 focus:border-cyan-500 rounded-2xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none shadow-lg transition"
          />
          {isSearching ? (
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin absolute right-4" />
          ) : searchTerm && (
            <button
              onClick={handleClearSelection}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 absolute right-3"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Live Autocomplete Suggestion Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-30 max-h-80 overflow-y-auto">
            {suggestions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                No matching subscribers found for "{searchTerm}".
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className="w-full p-3.5 text-left hover:bg-slate-800/80 transition flex items-center justify-between group"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                          {c.customer_code}
                        </span>
                        <span className="font-semibold text-slate-100 text-sm group-hover:text-cyan-300 transition">
                          {c.name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-3">
                        <span>Phone: {c.phone}</span>
                        <span>•</span>
                        <span>Zone: {c.area?.name}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Due Amount</span>
                      <span className="text-xs font-bold text-rose-400">৳{parseFloat(c.total_due).toFixed(2)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Default Idle State - Prompt User */}
      {!selectedCustomer && !searchTerm && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-200 text-base">Search for a Subscriber</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Enter a Customer ID (e.g. <code>CCL00001</code>), phone number, or subscriber name above to load collection details.
          </p>
        </div>
      )}

      {/* Selected Customer Result Card */}
      {selectedCustomer && (
        <div className="bg-slate-900 border-2 border-cyan-500/30 rounded-2xl p-6 shadow-xl space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl text-white font-bold">
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-400 px-2.5 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/30">
                    {selectedCustomer.customer_code}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${
                    selectedCustomer.connection_type === 'digital' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {selectedCustomer.connection_type}
                  </span>
                </div>
                <h3 className="font-bold text-slate-100 text-lg mt-1">{selectedCustomer.name}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  {selectedCustomer.phone}
                </p>
              </div>
            </div>

            <button
              onClick={handleClearSelection}
              className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg bg-slate-800 self-start sm:self-auto"
            >
              Search Another
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="space-y-1">
              <span className="text-slate-400 block">Zone / Address:</span>
              <span className="font-medium text-slate-200 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                {selectedCustomer.address || selectedCustomer.area?.name}
              </span>
            </div>
            <div className="space-y-1 sm:text-right">
              <span className="text-slate-400 block">Monthly Connection Rent:</span>
              <span className="font-bold text-slate-100 text-sm">৳{parseFloat(selectedCustomer.monthly_rent).toFixed(2)}</span>
            </div>
          </div>

          {/* Pending Bills Summary */}
          <div className="flex items-center justify-between p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <div>
              <span className="text-xs text-rose-300 block">Total Pending Dues</span>
              <span className="text-2xl font-bold text-rose-400">৳{parseFloat(selectedCustomer.total_due).toFixed(2)}</span>
              <span className="text-[11px] text-rose-400/80 block mt-0.5">
                {selectedCustomer.bills?.length || 0} Pending Monthly Bill(s)
              </span>
            </div>

            {selectedCustomer.bills?.length > 0 ? (
              <Link
                to={`/collector/collect/${selectedCustomer.id}`}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition"
              >
                <DollarSign className="w-4 h-4" />
                Collect Payment Now
              </Link>
            ) : (
              <span className="px-3.5 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> All Bills Paid
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCustomersPage;
