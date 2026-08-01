import React, { useEffect, useState } from 'react';
import api from '../../api/axios';
import { MapPin, Plus, Trash2, Edit3, Users } from 'lucide-react';

const AreaManagementPage = () => {
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [name, setName] = useState('');

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    setLoading(true);
    try {
      const res = await api.get('/areas');
      setAreas(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (area = null) => {
    if (area) {
      setEditingArea(area);
      setName(area.name);
    } else {
      setEditingArea(null);
      setName('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingArea) {
        await api.put(`/areas/${editingArea.id}`, { name });
      } else {
        await api.post('/areas', { name });
      }
      setShowModal(false);
      fetchAreas();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save area');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this zone area?')) return;
    try {
      await api.delete(`/areas/${id}`);
      fetchAreas();
    } catch (e) {
      alert(e.response?.data?.message || 'Error deleting area');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Zone & Area Management</h2>
          <p className="text-xs text-slate-400 mt-1">Organize subscriber coverage zones for collector assignments.</p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          Add Zone Area
        </button>
      </div>

      {/* Grid of Areas */}
      {loading ? (
        <div className="p-8 text-center text-cyan-400">Loading areas...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {areas.map((a) => (
            <div
              key={a.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex items-center justify-between hover:border-slate-700 transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">{a.name}</h3>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>{a.customers_count || 0} Customers</span>
                    <span>•</span>
                    <span>{a.collectors_count || 0} Collectors</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenModal(a)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-100">
              {editingArea ? 'Edit Zone Area' : 'Add New Zone Area'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Area Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Banani Zone"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-1/2 py-2 bg-slate-800 text-slate-300 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/20"
                >
                  Save Area
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AreaManagementPage;
