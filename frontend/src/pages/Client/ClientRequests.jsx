import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

function ClientRequests({ showToast }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [requestType, setRequestType] = useState('Document Request');
  const [priority, setPriority] = useState('Normal');
  const [financialYear, setFinancialYear] = useState('');

  const [description, setDescription] = useState('');

  // Filter & Pagination States
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedType, setSelectedType] = useState('All Types');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Generate Financial Year options (e.g., "2024-2025", "2023-2024")
  const financialYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const options = [];
    for (let i = 0; i < 5; i++) {
      const start = currentYear - i;
      options.push(`${start}-${start + 1}`);
    }
    return options;
  }, []);

  useEffect(() => {
    if (financialYearOptions.length > 0 && !financialYear) {
      setFinancialYear(financialYearOptions[0]);
    }
  }, [financialYearOptions, financialYear]);

  // Fetch requests
  const fetchRequests = React.useCallback(async () => {
    try {
      setLoading(true);
      const storedUser = JSON.parse(localStorage.getItem('user'));

      if (!storedUser) {
        setLoading(false);
        return;
      }

      // Check if user is CA (admin) or Client
      // Assuming 'role' property exists or checking specific email for CA as fallback if needed
      // For now, if role is 'admin' or 'CA', fetch all. Otherwise fetch specific.
      const isCA = storedUser.role === 'admin' || storedUser.role === 'CA';

      let url = 'http://localhost:5000/api/requests';
      if (!isCA) {
        url = `http://localhost:5000/api/requests/user/${storedUser.id}`;
      }

      const res = await axios.get(url);
      setRequests(res.data);

    } catch (error) {
      console.error('Error fetching requests:', error);
      showToast('Error loading requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description) {
      showToast('Please enter a description', 'error');
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser || !storedUser.id) {
      showToast('User not identified', 'error');
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/requests', {
        client_id: storedUser.id,
        request_type: requestType,
        description: description,
        priority: priority,
        financial_year: financialYear
      });
      showToast('Request submitted successfully!', 'success');
      setDescription('');
      setIsModalOpen(false);
      fetchRequests();
    } catch (error) {
      console.error('Error submitting request:', error);
      showToast('Error submitting request', 'error');
    }
  };

  const stats = useMemo(() => {
    return {
      pending: requests.filter(r => r.status === 'Pending').length,
      inProgress: requests.filter(r => r.status === 'In Progress').length,
      resolved: requests.filter(r => r.status === 'Resolved').length
    };
  }, [requests]);

  // Unique Types for Filter
  const uniqueTypes = useMemo(() => {
    const types = new Set(requests.map(r => r.request_type));
    return ['All Types', ...Array.from(types).sort()];
  }, [requests]);

  // Filter Logic
  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchesStatus = selectedStatus === 'All Status' || req.status === selectedStatus;
      const matchesType = selectedType === 'All Types' || req.request_type === selectedType;

      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        (req.description && req.description.toLowerCase().includes(searchLower)) ||
        (req.request_type && req.request_type.toLowerCase().includes(searchLower));

      return matchesStatus && matchesType && matchesSearch;
    });
  }, [requests, selectedStatus, selectedType, searchQuery]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const resetFilters = () => {
    setSelectedStatus('All Status');
    setSelectedType('All Types');
    setSearchQuery('');
    setCurrentPage(1);
    showToast('Filters reset', 'info');
  };


  const handleViewRequest = (req) => {
    setSelectedRequest(req);
    setIsViewModalOpen(true);
  };

  // Close modals on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setIsViewModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleDownload = async (documentPath) => {
    try {
      if (!documentPath) return;
      const fileName = documentPath.split(/[/\\]/).pop();

      showToast('Downloading document...', 'info');
      const fileUrl = `http://localhost:5000/${documentPath}`;

      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Network response was not ok');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast('Download completed', 'success');
    } catch (error) {
      console.error('Download failed:', error);
      showToast('Failed to download document', 'error');
    }
  };

  if (loading && requests.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Requests</h1>
          <p className="text-gray-600">Manage and track your service requests</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition transform hover:-translate-y-0.5 font-semibold flex items-center gap-2"
        >
          <i className="fas fa-plus"></i>
          Create Request1
        </button>
      </div>

      {/* Request Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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
          transition={{ delay: 0.2 }}
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
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-30 group-hover:scale-110 transition-transform z-0">
            <i className="fas fa-check-circle text-4xl text-white"></i>
          </div>
          <div className="relative z-10">
            <p className="text-green-100 text-sm font-medium uppercase tracking-wider mb-1">Resolved</p>
            <h3 className="text-3xl font-black tracking-tight mb-1">{stats.resolved}</h3>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Request Type</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
            >
              {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            >
              <option>All Status</option>
              <option>Pending</option>
              <option>In Progress</option>
              <option>Resolved</option>
              <option>Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Search description or type..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
            </div>
          </div>
        </div>
        {(selectedStatus !== 'All Status' || selectedType !== 'All Types' || searchQuery !== '') && (
          <div className="mt-4 flex justify-end">
            <button onClick={resetFilters} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
              <i className="fas fa-times-circle mr-2"></i>Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-xl font-bold text-gray-800 font-primary tracking-tight">Recent Requests</h3>
          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
            Total: {filteredRequests.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          {requests.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-inbox text-2xl text-gray-300"></i>
              </div>
              <p className="text-gray-500 text-lg mb-2">No requests found</p>
              <p className="text-sm text-gray-400 mb-6 max-w-xs mx-auto">Create a new request to get started with your document processing or queries.</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline"
              >
                Create Request
              </button>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Request Type</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>

                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Priority</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Request Date</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Completed Date</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {currentItems.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition duration-150 ease-in-out">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{req.request_type}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-md line-clamp-2" title={req.description}>
                        {req.description}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${req.priority === 'Urgent' ? 'bg-rose-100 text-rose-700' :
                        req.priority === 'Normal' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                        {req.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${req.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                        req.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                          req.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                        }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 font-medium">
                        {req.created_at ? new Date(req.created_at).toLocaleDateString('en-GB') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 font-medium">
                        {req.completed_at ? new Date(req.completed_at).toLocaleDateString('en-GB') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">

                      <div className="flex justify-end gap-2">
                        {/* View Request Details */}
                        <button
                          onClick={() => handleViewRequest(req)}
                          className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition"
                          title="View Request Details"
                        >
                          <i className="fas fa-eye"></i>
                        </button>

                        {/* Download Document */}
                        {req.document && (
                          <button
                            onClick={() => handleDownload(req.document)}
                            className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 p-2 rounded-lg transition inline-flex items-center justify-center"
                            title="Download Document"
                          >
                            <i className="fas fa-download"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {filteredRequests.length > 0 && (
          <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-between items-center">
            <p className="text-sm text-gray-500 font-medium">
              Showing <span className="text-gray-900 font-bold">{indexOfFirstItem + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(indexOfLastItem, filteredRequests.length)}</span> of <span className="text-gray-900 font-bold">{filteredRequests.length}</span>
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

      {/* Create Request Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            ></motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden z-10"
            >
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Create New Request</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Request Type</label>
                      <div className="relative">
                        <select
                          value={requestType}
                          onChange={(e) => setRequestType(e.target.value)}
                          className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white transition"
                        >
                          <option>Document Request</option>
                          <option>Query</option>
                          <option>Appointment</option>
                          <option>Consultation</option>
                          <option>Other</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                          <i className="fas fa-chevron-down text-xs"></i>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Priority</label>
                      <div className="relative">
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value)}
                          className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white transition"
                        >
                          <option>Low</option>
                          <option>Normal</option>
                          <option>Urgent</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                          <i className="fas fa-chevron-down text-xs"></i>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Financial Year</label>
                    <div className="relative">
                      <select
                        value={financialYear}
                        onChange={(e) => setFinancialYear(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white transition"
                      >
                        {financialYearOptions.map(fy => (
                          <option key={fy} value={fy}>{fy}</option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500">
                        <i className="fas fa-chevron-down text-xs"></i>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition"
                      rows="4"
                      placeholder="Please describe your request in detail..."
                      required
                    ></textarea>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg transition transform hover:-translate-y-0.5"
                    >
                      Submit Request
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Request Modal */}
      <AnimatePresence>
        {isViewModalOpen && selectedRequest && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsViewModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">Request Details</h3>

                </div>
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition backdrop-blur-sm"
                >
                  <i className="fas fa-times text-sm"></i>
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Header Info */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Type</span>
                    <span className="font-bold text-gray-800">{selectedRequest.request_type}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Status</span>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${selectedRequest.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                      selectedRequest.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                        selectedRequest.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                      }`}>
                      {selectedRequest.status}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Description</span>
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{selectedRequest.description}</p>
                </div>

                {/* Reply Section */}
                {selectedRequest.reply ? (
                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <span className="text-xs font-black text-indigo-400 uppercase tracking-widest block mb-2 flex items-center gap-1">
                      <i className="fas fa-reply"></i> CA Reply
                    </span>
                    <p className="text-indigo-900 text-sm leading-relaxed whitespace-pre-wrap font-medium">{selectedRequest.reply}</p>

                    {/* Attachment in Reply */}
                    {selectedRequest.document && (
                      <div className="mt-4 pt-3 border-t border-indigo-200">
                        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                          <div className="flex items-center gap-2 text-indigo-700">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                              <i className="fas fa-file-alt"></i>
                            </div>
                            <span className="text-xs font-bold uppercase">Attachment</span>
                          </div>
                          <div className="flex gap-2">
                            <a
                              href={`http://localhost:5000/${selectedRequest.document}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                              title="View Document"
                            >
                              <i className="fas fa-eye"></i>
                            </a>

                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl">
                    <p className="text-gray-400 text-sm italic">No reply from CA yet.</p>
                  </div>
                )}

                {/* Dates Footer */}
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  <div>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Requested</span>
                    <span className="text-sm font-bold text-gray-600">
                      {selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleDateString('en-GB') : '-'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">Completed</span>
                    <span className="text-sm font-bold text-gray-600">
                      {selectedRequest.completed_at ? new Date(selectedRequest.completed_at).toLocaleDateString('en-GB') : '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-5 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition shadow-sm text-sm"
                >
                  Close
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div >
  );
}

export default ClientRequests;
