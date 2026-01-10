import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

function ClientReturns({ showToast }) {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Filter states
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // View Modal State
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);

  // Initial User Fetch
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Fetch Returns
  const fetchReturns = React.useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/returns', {
        params: { user_id: user.id }
      });
      setReturns(response.data);
    } catch (error) {
      console.error('Error fetching returns:', error);
      showToast('Error loading returns', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowViewModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Filtered Returns
  const filteredReturns = useMemo(() => {
    return returns.filter(ret => {
      const matchesType = selectedType === 'all' || ret.return_type === selectedType;
      const matchesStatus = selectedStatus === 'all' || ret.status === selectedStatus;

      const searchStr = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' ||
        (ret.return_type && ret.return_type.toLowerCase().includes(searchStr)) ||
        (ret.period && ret.period.toLowerCase().includes(searchStr)) ||
        (ret.notes && ret.notes.toLowerCase().includes(searchStr));

      return matchesType && matchesStatus && matchesSearch;
    });
  }, [returns, selectedType, selectedStatus, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: returns.length,
      pending: returns.filter(r => r.status === 'pending').length,
      inProgress: returns.filter(r => r.status === 'in_progress').length,
      completed: returns.filter(r => r.status === 'completed' || r.status === 'filled' || r.status === 'filed').length,
      // Calculate overdue if explicit status doesn't exist? For now relying on status string.
      // If backend marks status as 'overdue', it will show up.
      // Or adding logic:
      overdue: returns.filter(r => r.status === 'overdue' || (
        (r.status === 'pending' || r.status === 'in_progress') &&
        new Date(r.due_date) < new Date() &&
        new Date().setHours(0, 0, 0, 0) > new Date(r.due_date).setHours(0, 0, 0, 0) // simple comparison
      )).length
    };
  }, [returns]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredReturns.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReturns.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Helpers
  const getStatusBadgeClass = (status) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    const s = status.toLowerCase();

    // Check for calculated overdue if status is not explicitly 'overdue' handled in render?
    // But here we just formatting input string.
    if (s === 'pending') return 'bg-amber-100 text-amber-700';
    if (s === 'in_progress') return 'bg-blue-100 text-blue-700';
    if (s === 'completed' || s === 'filled' || s === 'filed') return 'bg-green-100 text-green-700';
    if (s === 'overdue') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  const formatStatus = (status) => {
    if (!status) return '-';
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleOpenView = (ret) => {
    setSelectedReturn(ret);
    setShowViewModal(true);
  };

  const resetFilters = () => {
    setSelectedType('all');
    setSelectedStatus('all');
    setSearchQuery('');
    showToast('Filters reset', 'info');
  };

  const uniqueTypes = useMemo(() => {
    return [...new Set(returns.map(r => r.return_type))].filter(Boolean);
  }, [returns]);

  if (loading && returns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Returns</h2>
          <p className="text-sm text-gray-500 mt-1">Track your GST, Income Tax, and other return filings</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-30 group-hover:scale-110 transition-transform z-0">
            <i className="fas fa-list-ul text-4xl text-white"></i>
          </div>
          <div className="relative z-10">
            <p className="text-purple-100 text-sm font-medium uppercase tracking-wider mb-1">Total Returns</p>
            <h3 className="text-3xl font-black tracking-tight mb-1">{stats.total}</h3>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-30 group-hover:scale-110 transition-transform z-0">
            <i className="fas fa-clock text-4xl text-white"></i>
          </div>
          <div className="relative z-10">
            <p className="text-amber-100 text-sm font-medium uppercase tracking-wider mb-1">Pending</p>
            <h3 className="text-3xl font-black tracking-tight mb-1">{stats.pending}</h3>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-30 group-hover:scale-110 transition-transform z-0">
            <i className="fas fa-spinner text-4xl text-white"></i>
          </div>
          <div className="relative z-10">
            <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-1">In Progress</p>
            <h3 className="text-3xl font-black tracking-tight mb-1">{stats.inProgress}</h3>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-30 group-hover:scale-110 transition-transform z-0">
            <i className="fas fa-check-circle text-4xl text-white"></i>
          </div>
          <div className="relative z-10">
            <p className="text-green-100 text-sm font-medium uppercase tracking-wider mb-1">Completed</p>
            <h3 className="text-3xl font-black tracking-tight mb-1">{stats.completed}</h3>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Return Type</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              value={selectedType} onChange={e => setSelectedType(e.target.value)}
            >
              <option value="all">All Types</option>
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="filled">Filled</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search type, period..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
            />
          </div>
        </div>
        {(selectedType !== 'all' || selectedStatus !== 'all' || searchQuery !== '') && (
          <div className="mt-4 flex justify-end">
            <button onClick={resetFilters} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
              <i className="fas fa-times-circle mr-2"></i>Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100/50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Return Type</th>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Financial Year</th>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Assessment Year</th>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="text-center px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <AnimatePresence>
                {currentItems.length === 0 ? (
                  <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <td colSpan="5" className="py-20 text-center">
                      <div className="flex flex-col items-center">
                        <i className="fas fa-file-invoice text-6xl text-gray-200 mb-4"></i>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No returns found</h3>
                        <p className="text-gray-500">You don't have any returns matching your criteria.</p>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  currentItems.map((ret, idx) => (
                    <motion.tr
                      key={ret.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-purple-50/10 group transition"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <i className="fas fa-file-alt text-sm"></i>
                          </div>
                          <p className="font-bold text-gray-800">{ret.return_type}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {ret.financial_year || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {ret.assessment_year || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(ret.status)}`}>
                          {formatStatus(ret.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenView(ret)}
                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition"
                            title="View Return Details"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredReturns.length > 0 && (
          <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-between items-center">
            <p className="text-sm text-gray-500 font-medium">
              Showing <span className="text-gray-900 font-bold">{indexOfFirstItem + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(indexOfLastItem, filteredReturns.length)}</span> of <span className="text-gray-900 font-bold">{filteredReturns.length}</span>
            </p>
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-2xl border border-gray-100">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-white hover:text-purple-600 hover:shadow-sm'}`}
              >
                <i className="fas fa-chevron-left text-xs"></i>
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => paginate(i + 1)}
                  className={`w-9 h-9 rounded-xl text-xs font-black transition ${currentPage === i + 1 ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-white hover:text-purple-600'}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-white hover:text-purple-600 hover:shadow-sm'}`}
              >
                <i className="fas fa-chevron-right text-xs"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {showViewModal && selectedReturn && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowViewModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold">Return Details</h3>
              <button onClick={() => setShowViewModal(false)} className="hover:rotate-90 transition transform"><i className="fas fa-times"></i></button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">

              {/* Header Info */}
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Return Type</p>
                  <p className="text-lg font-bold text-gray-800">{selectedReturn.return_type}</p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(selectedReturn.status)}`}>
                    {formatStatus(selectedReturn.status)}
                  </span>
                </div>
              </div>

              {/* Years Info */}
              <div className="flex gap-4">
                <div className="bg-gray-50 px-4 py-3 rounded-xl border border-gray-100 flex-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Financial Year</p>
                  <p className="text-sm font-bold text-gray-800">
                    {selectedReturn.financial_year || '-'}
                  </p>
                </div>
                <div className="bg-gray-50 px-4 py-3 rounded-xl border border-gray-100 flex-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Assessment Year</p>
                  <p className="text-sm font-bold text-gray-800">
                    {selectedReturn.assessment_year || '-'}
                  </p>
                </div>
              </div>

              {/* Notes Section */}
              {selectedReturn.notes && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Notes</p>
                  <p className="text-sm text-blue-900 leading-relaxed font-medium whitespace-pre-wrap">
                    {selectedReturn.notes}
                  </p>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <button
                onClick={() => setShowViewModal(false)}
                className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition shadow-sm"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default ClientReturns;
