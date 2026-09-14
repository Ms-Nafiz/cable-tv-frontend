import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Search, Filter, Plus, Eye, Edit2, Trash2, MapPin, Tv, AlertCircle, X, CheckCircle2, UserPlus, Upload, FileSpreadsheet, Download } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import Pagination from '../../components/Pagination';
import { formatCurrency } from '../../utils/formatters';

const CustomerListPage = () => {
  const { hasRole } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [areas, setAreas] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Bulk Excel Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const handleExportCustomers = async () => {
    try {
      const response = await api.get('/customers/export-excel', {
        params: {
          area_id: areaFilter,
          status: statusFilter,
          search: search,
        },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Subscriber_Registry_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to export customer registry to Excel');
    }
  };

  const handleDownloadSample = async () => {
    try {
      const response = await api.get('/customers/download-sample-excel', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Sample_Bulk_Customer_Import_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert('Failed to download sample file');
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      alert('Please select an Excel (.xlsx) file to upload.');
      return;
    }

    setImporting(true);
    setImportResult(null);
    const formDataObj = new FormData();
    formDataObj.append('file', importFile);

    try {
      const res = await api.post('/customers/import-excel', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to import customers from Excel');
    } finally {
      setImporting(false);
    }
  };

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    area_id: '',
    connection_type: 'analog',
    stb_serial: '',
    monthly_rent: '500',
    deposit_amount: '500',
    connection_date: new Date().toISOString().split('T')[0],
    assigned_collector_id: '',
    status: 'active',
  });

  // Fetch initial area options & collectors list on component mount
  useEffect(() => {
    fetchAreasAndUsers();
  }, []);

  // Live reactive auto-filtering when any filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, areaFilter, statusFilter, typeFilter]);

  const handleResetFilters = () => {
    setSearch('');
    setAreaFilter('');
    setStatusFilter('');
    setTypeFilter('');
  };

  const fetchAreasAndUsers = async () => {
    try {
      const [areaRes, userRes] = await Promise.all([
        api.get('/areas'),
        api.get('/users'),
      ]);
      setAreas(areaRes.data);
      const collectorList = userRes.data.filter(u => u.role === 'collector');
      setCollectors(collectorList);

      if (areaRes.data.length > 0 && !formData.area_id) {
        setFormData(prev => ({ ...prev, area_id: areaRes.data[0].id }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (areaFilter) params.area_id = areaFilter;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.connection_type = typeFilter;

      const res = await api.get('/customers', { params });
      setCustomers(res.data);
      setCurrentPage(1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      await api.delete(`/customers/${id}`);
      fetchCustomers();
    } catch (e) {
      alert(e.response?.data?.message || 'Error deleting customer');
    }
  };

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      phone: '',
      address: '',
      area_id: areas.length > 0 ? areas[0].id : '',
      connection_type: 'analog',
      stb_serial: '',
      monthly_rent: '500',
      deposit_amount: '500',
      connection_date: new Date().toISOString().split('T')[0],
      assigned_collector_id: collectors.length > 0 ? collectors[0].id : '',
      status: 'active',
    });
    setModalError('');
    setShowAddModal(true);
  };

  const handleOpenEditModal = (c) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name || '',
      phone: c.phone || '',
      address: c.address || '',
      area_id: c.area_id || (areas.length > 0 ? areas[0].id : ''),
      connection_type: c.connection_type || 'analog',
      stb_serial: c.stb_serial || '',
      monthly_rent: c.monthly_rent || '500',
      deposit_amount: c.deposit_amount || '500',
      connection_date: c.connection_date ? c.connection_date.split('T')[0] : new Date().toISOString().split('T')[0],
      assigned_collector_id: c.assigned_collector_id || '',
      status: c.status || 'active',
    });
    setModalError('');
  };

  const handleConnectionTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      connection_type: type,
      monthly_rent: type === 'digital' ? '800' : '500',
      deposit_amount: type === 'digital' ? '1000' : '500',
    }));
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalSubmitting(true);
    setModalError('');

    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, formData);
        setEditingCustomer(null);
      } else {
        await api.post('/customers', formData);
        setShowAddModal(false);
      }
      fetchCustomers();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Error saving customer details');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(customers.length / ITEMS_PER_PAGE);
  const [togglingId, setTogglingId] = useState(null);

  const handleToggleStatus = async (customer) => {
    setTogglingId(customer.id);
    try {
      const res = await api.patch(`/customers/${customer.id}/toggle-status`);
      setCustomers((prev) =>
        prev.map((item) =>
          item.id === customer.id ? { ...item, status: res.data.customer.status } : item
        )
      );
    } catch (err) {
      console.error(err);
      alert('Failed to toggle customer status');
    } finally {
      setTogglingId(null);
    }
  };

  const paginatedCustomers = customers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Customer Management</h2>
          <p className="text-xs text-slate-400 mt-1">Manage analog and digital cable TV subscribers ({customers.length} total).</p>
        </div>

        {hasRole('super_admin', 'accounts') && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCustomers}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition shadow-sm"
              title="Export Customer Registry to Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Export Excel (.xlsx)
            </button>

            <button
              onClick={() => { setShowImportModal(true); setImportResult(null); setImportFile(null); }}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition"
            >
              <Upload className="w-4 h-4" />
              Import Bulk Excel
            </button>

            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              Add New Customer
            </button>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Code (e.g. CCL00001), Name, or Phone..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-300 focus:outline-none font-semibold"
            >
              <option value="">All Areas / Zones</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-300 focus:outline-none font-semibold"
            >
              <option value="">All Connection Types</option>
              <option value="analog">Analog Line</option>
              <option value="digital">Digital (STB)</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-slate-300 focus:outline-none font-semibold"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="disconnected">Disconnected</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 py-2 px-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 transition"
            >
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>

            {(search || areaFilter || statusFilter || typeFilter) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                title="Reset All Filters"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Customers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Code / Subscriber</th>
                <th className="py-3 px-4">Phone / Address</th>
                <th className="py-3 px-4">Area Zone</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Rent</th>
                <th className="py-3 px-4 text-right">Total Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-cyan-400">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-500 mx-auto"></div>
                  </td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No matching subscribers found.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-850 transition">
                    <td className="py-3 px-4">
                      <div className="font-mono text-[11px] text-cyan-400 font-bold">{c.customer_code}</div>
                      <div className="font-semibold text-slate-100 text-xs mt-0.5">{c.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div>{c.phone}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">{c.address}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <MapPin className="w-3 h-3 text-cyan-400" />
                        {c.area?.name || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="uppercase text-[11px] font-semibold text-slate-300">
                        {c.connection_type}
                      </span>
                      {c.stb_serial && (
                        <div className="text-[10px] text-slate-400 font-mono">STB: {c.stb_serial}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-200">
                      ৳{formatCurrency(c.monthly_rent)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-400">
                      ৳{formatCurrency(c.total_due)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(c)}
                        disabled={togglingId === c.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border shadow-sm transition hover:scale-105 active:scale-95 disabled:opacity-50 ${
                          c.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/30 hover:bg-rose-500/30'
                        }`}
                        title={`1-Click to toggle status to ${c.status === 'active' ? 'INACTIVE' : 'ACTIVE'}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${c.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                        {togglingId === c.id ? 'Updating...' : c.status}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/customers/${c.id}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
                          title="View Profile Statement"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {hasRole('super_admin', 'accounts') && (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
                              title="Edit Customer Modal"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                              title="Delete Customer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && customers.length > 0 && (
          <div className="border-t border-slate-800">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
              totalItems={customers.length}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal (In-Page Popup) */}
      {(showAddModal || editingCustomer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-cyan-400" />
                {editingCustomer ? `Edit Customer: ${editingCustomer.customer_code}` : 'Add New Subscriber'}
              </h3>
              <button
                onClick={() => { setShowAddModal(false); setEditingCustomer(null); }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4 text-xs">
              {/* Connection Type Switcher */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Connection Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleConnectionTypeChange('analog')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition ${
                      formData.connection_type === 'analog'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>Analog Cable Line</span>
                    <span className="text-[10px] text-slate-400 font-normal">Default: ৳500 Rent / ৳500 Deposit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleConnectionTypeChange('digital')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition ${
                      formData.connection_type === 'digital'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>Digital STB Line</span>
                    <span className="text-[10px] text-slate-400 font-normal">Default: ৳800 Rent / ৳1000 Deposit</span>
                  </button>
                </div>
              </div>

              {/* Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Subscriber Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Full Name..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="017XXXXXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Address *</label>
                <input
                  type="text"
                  required
                  placeholder="House, Road, Block..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Area & Collector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Area / Zone *</label>
                  <select
                    required
                    value={formData.area_id}
                    onChange={(e) => setFormData({ ...formData, area_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    {areas.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Assigned Collector</label>
                  <select
                    value={formData.assigned_collector_id}
                    onChange={(e) => setFormData({ ...formData, assigned_collector_id: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Unassigned</option>
                    {collectors.map(col => (
                      <option key={col.id} value={col.id}>{col.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Monthly Rent & Security Deposit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Monthly Rent (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.monthly_rent}
                    onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Initial Security Deposit (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    disabled={!!editingCustomer}
                    value={formData.deposit_amount}
                    onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-bold focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* STB Serial (If Digital) */}
              {formData.connection_type === 'digital' && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">STB Serial Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Set Top Box Serial Number..."
                    value={formData.stb_serial}
                    onChange={(e) => setFormData({ ...formData, stb_serial: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              {/* Connection Date & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Connection Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.connection_date}
                    onChange={(e) => setFormData({ ...formData, connection_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {editingCustomer && (
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="disconnected">Disconnected</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingCustomer(null); }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {modalSubmitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Customer Excel Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-slate-100">Bulk Customer Excel Import</h3>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 p-3.5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs text-emerald-300 font-semibold">1. Download Sample Demo Excel Template</div>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg shadow transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Sample Template (.xlsx)
                </button>
              </div>
              <p className="text-[11px] text-slate-400">Fill in subscriber details into the sample sheet format before uploading.</p>
            </div>

            {importResult && (
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs space-y-1">
                <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  {importResult.message}
                </div>
                <div className="text-slate-300 text-[11px]">
                  Imported: <strong className="text-emerald-400">{importResult.imported_count}</strong> subscriber(s) | Skipped: <strong className="text-amber-400">{importResult.skipped_count}</strong> (duplicate/invalid).
                </div>
              </div>
            )}

            <form onSubmit={handleImportSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">2. Select Excel File (.xlsx / .csv) *</label>
                <input
                  type="file"
                  required
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setImportFile(e.target.files[0])}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 bg-slate-950 p-2 border border-slate-800 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {importing ? 'Importing Excel...' : 'Upload & Import Customers'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerListPage;
