import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Select from 'react-select';

const API_BASE_URL = 'http://localhost:5000/api';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'filled', label: 'Filled', color: 'bg-green-100 text-green-800' },
  { value: 'completed', label: 'Completed', color: 'bg-purple-100 text-purple-800' }
];

const generateFinancialYears = () => {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 10;
  const endYear = currentYear;
  const years = [];

  for (let y = endYear; y >= startYear; y--) {
    const nextYearShort = (y + 1).toString().slice(-2);
    years.push(`${y}-${nextYearShort}`);
  }
  return years;
};

const FINANCIAL_YEARS = generateFinancialYears();

const INITIAL_FORM_DATA = {
  client_id: '',
  return_type_id: '',
  financial_year: '',
  assessment_year: '',
  status: 'pending',
  notes: ''
};

function Returns() {
  const location = useLocation();
  const [returns, setReturns] = useState([]);
  const [clients, setClients] = useState([]);
  const [returnTypes, setReturnTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // Filter states
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-hide toast
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '', type: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
  };

  // Fetch data
  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/returns`);
      setReturns(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching returns:', error);
      setError('Failed to fetch returns');
      showToast('Error loading returns', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/clients`);
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  }, []);

  const fetchReturnTypes = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/returns/types`);
      setReturnTypes(response.data);
    } catch (error) {
      console.error('Error fetching return types:', error);
    }
  }, []);

  useEffect(() => {
    fetchReturns();
    fetchClients();
    fetchReturnTypes();
  }, [fetchReturns, fetchClients, fetchReturnTypes]);

  // Handle pre-filtering from Client Report
  useEffect(() => {
    if (location.state?.clientId) {
      setSelectedClient(location.state.clientId.toString());
    }
  }, [location.state]);

  // Helper functions
  const getStatusColor = (status) => {
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
    return statusOption ? statusOption.color : 'bg-gray-100 text-gray-800';
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setSelectedReturn(null);
    setError(null);
  };

  // CRUD operations
  const handleDelete = async (id, returnType) => {
    if (window.confirm(`Are you sure you want to delete this ${returnType} return? This action cannot be undone.`)) {
      try {
        await axios.delete(`${API_BASE_URL}/returns/${id}`);
        await fetchReturns();
        showToast('Return deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting return:', error);
        showToast('Error deleting return', 'error');
      }
    }
  };

  // Modal handlers
  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (returnItem) => {
    setSelectedReturn(returnItem);
    setFormData({
      client_id: returnItem.client_id || '',
      return_type_id: returnItem.return_type_id || '',
      financial_year: returnItem.financial_year || '',
      assessment_year: returnItem.assessment_year || '',
      status: returnItem.status || 'pending',
      notes: returnItem.notes || ''
    });
    setShowEditModal(true);
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    resetForm();
  };

  const openViewModal = (returnItem) => {
    setSelectedReturn(returnItem);
    setShowViewModal(true);
  };

  // Filtered returns
  const filteredReturns = useMemo(() => {
    return returns.filter(returnItem => {
      const matchesClient = selectedClient === 'all' || returnItem.client_id === parseInt(selectedClient);
      const matchesType = selectedType === 'all' || returnItem.return_type === selectedType;
      const matchesStatus = selectedStatus === 'all' || returnItem.status === selectedStatus;

      const searchStr = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' ||
        (returnItem.client_name && returnItem.client_name.toLowerCase().includes(searchStr)) ||
        (returnItem.return_type && returnItem.return_type.toLowerCase().includes(searchStr)) ||
        (returnItem.financial_year && returnItem.financial_year.toLowerCase().includes(searchStr)) ||
        (returnItem.assessment_year && returnItem.assessment_year.toLowerCase().includes(searchStr)) ||
        (returnItem.notes && returnItem.notes.toLowerCase().includes(searchStr));

      return matchesClient && matchesType && matchesStatus && matchesSearch;
    });
  }, [returns, selectedClient, selectedType, selectedStatus, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredReturns.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentReturns = filteredReturns.slice(indexOfFirstItem, indexOfLastItem);

  const resetFilters = () => {
    setSelectedClient('all');
    setSelectedType('all');
    setSelectedStatus('all');
    setSearchQuery('');
    showToast('Filters reset', 'info');
  };

  // Form Modal Component
  const FormModal = ({ isOpen, onClose, title }) => {
    const [localFormData, setLocalFormData] = useState(INITIAL_FORM_DATA);

    useEffect(() => {
      if (isOpen) {
        setLocalFormData(formData);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useEffect(() => {
      const handleEsc = (e) => {
        if (e.key === 'Escape') onClose();
      };
      if (isOpen) {
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
      }
    }, [isOpen, onClose]);

    const handleLocalInputChange = (e) => {
      const { name, value } = e.target;
      setLocalFormData(prev => ({
        ...prev,
        [name]: value
      }));
    };

    const handleLocalSubmit = async (e) => {
      e.preventDefault();

      if (!localFormData.client_id) {
        showToast('Please select a client', 'error');
        return;
      }

      if (!localFormData.return_type_id) {
        showToast('Please select return type', 'error');
        return;
      }

      if (!localFormData.financial_year.trim()) {
        showToast('Please select financial year', 'error');
        return;
      }

      if (!localFormData.assessment_year.trim()) {
        showToast('Please enter assessment year', 'error');
        return;
      }

      setIsSubmitting(true);

      try {
        const url = selectedReturn
          ? `${API_BASE_URL}/returns/${selectedReturn.id}`
          : `${API_BASE_URL}/returns`;

        const method = selectedReturn ? 'put' : 'post';

        await axios[method](url, localFormData);

        await fetchReturns();
        showToast(
          selectedReturn ? 'Return updated successfully!' : 'Return added successfully!',
          'success'
        );
        onClose();
        resetForm();
      } catch (error) {
        console.error('Error saving return:', error);
        showToast('Error saving return', 'error');
      } finally {
        setIsSubmitting(false);
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <form onSubmit={handleLocalSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                  <Select
                    name="client_id"
                    value={clients.find(c => c.id === parseInt(localFormData.client_id)) ? {
                      value: localFormData.client_id,
                      label: clients.find(c => c.id === parseInt(localFormData.client_id)).client_name
                    } : null}
                    onChange={(selectedOption) => {
                      setLocalFormData(prev => ({
                        ...prev,
                        client_id: selectedOption ? selectedOption.value : ''
                      }));
                    }}
                    options={clients.map(client => ({
                      value: client.id,
                      label: client.client_name
                    }))}
                    placeholder="Search client..."
                    isSearchable={true}
                    className="w-full text-sm"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: '#D1D5DB',
                        '&:hover': { borderColor: '#A5B4FC' },
                        borderRadius: '0.375rem',
                        padding: '1px'
                      }),
                      placeholder: (base) => ({
                        ...base,
                        color: '#9CA3AF'
                      })
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Type *</label>
                  <Select
                    className="w-full text-sm"
                    value={returnTypes.find(t => t.id === parseInt(localFormData.return_type_id)) ? {
                      value: localFormData.return_type_id,
                      label: returnTypes.find(t => t.id === parseInt(localFormData.return_type_id)).return_name
                    } : null}
                    onChange={(opt) => {
                      setLocalFormData(prev => ({
                        ...prev,
                        return_type_id: opt ? opt.value : ''
                      }));
                    }}
                    options={returnTypes.map(type => ({
                      value: type.id,
                      label: type.return_name
                    }))}
                    placeholder="Select Type..."
                    isSearchable={true}
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: '#D1D5DB',
                        '&:hover': { borderColor: '#A5B4FC' },
                        borderRadius: '0.375rem',
                        padding: '1px'
                      })
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year *</label>
                  <select
                    name="financial_year"
                    value={localFormData.financial_year}
                    onChange={handleLocalInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select Financial Year</option>
                    {FINANCIAL_YEARS.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Year *</label>
                  <input
                    type="text"
                    name="assessment_year"
                    value={localFormData.assessment_year}
                    onChange={handleLocalInputChange}
                    required
                    placeholder="e.g., 2025-26"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={localFormData.status}
                    onChange={handleLocalInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={localFormData.notes}
                    onChange={handleLocalInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      {selectedReturn ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    selectedReturn ? 'Update Return' : 'Add Return'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // View Modal Component
  const ViewModal = ({ isOpen, onClose, returnItem }) => {
    useEffect(() => {
      const handleEsc = (e) => {
        if (e.key === 'Escape') onClose();
      };
      if (isOpen) {
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
      }
    }, [isOpen, onClose]);

    if (!isOpen || !returnItem) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 rounded-t-xl">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <i className="fas fa-file-invoice text-white text-lg"></i>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{returnItem.return_type}</h2>
                  <p className="text-purple-100 text-xs">Return Details</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all">
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Client Name</label>
                <p className="text-sm font-semibold text-gray-900">{returnItem.client_name || 'N/A'}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Return Type</label>
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                  {returnItem.return_type}
                </span>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Financial Year</label>
                <p className="text-sm font-semibold text-gray-900">{returnItem.financial_year || 'N/A'}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assessment Year</label>
                <p className="text-sm font-semibold text-gray-900">{returnItem.assessment_year || 'N/A'}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                <span className={`inline-flex items-center px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(returnItem.status)}`}>
                  <div className={`w-1.5 h-1.5 rounded-full mr-1 ${returnItem.status === 'completed' ? 'bg-purple-500' :
                    returnItem.status === 'filled' ? 'bg-green-500' :
                      returnItem.status === 'pending' ? 'bg-yellow-500' :
                        returnItem.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-500'
                    }`}></div>
                  {STATUS_OPTIONS.find(opt => opt.value === returnItem.status)?.label || returnItem.status}
                </span>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Created Date</label>
                <p className="text-sm font-semibold text-gray-900">
                  {returnItem.created_at ? new Date(returnItem.created_at).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : 'N/A'}
                </p>
              </div>

              <div className="col-span-2 bg-gray-50 rounded-lg p-3">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes</label>
                <p className="text-sm font-semibold text-gray-900">{returnItem.notes || 'No notes available'}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
              <button
                onClick={() => {
                  onClose();
                  openEditModal(returnItem);
                }}
                className="px-4 py-2 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-all flex items-center gap-2"
              >
                <i className="fas fa-edit text-xs"></i>
                Edit Return
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all flex items-center gap-2"
              >
                <i className="fas fa-times text-xs"></i>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
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
          <h2 className="text-2xl font-bold text-gray-800">Returns Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage tax returns and filings</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition transform hover:-translate-y-0.5"
        >
          <i className="fas fa-plus mr-2"></i>Add Return
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
            <Select
              className="w-full text-sm"
              value={selectedClient === 'all' ? { value: 'all', label: 'All Clients' } :
                clients.find(c => c.id === parseInt(selectedClient)) ? {
                  value: selectedClient,
                  label: clients.find(c => c.id === parseInt(selectedClient)).client_name
                } : null}
              onChange={(opt) => setSelectedClient(opt ? opt.value : 'all')}
              options={[
                { value: 'all', label: 'All Clients' },
                ...clients.map(c => ({ value: c.id, label: c.client_name }))
              ]}
              isSearchable={true}
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: '#D1D5DB',
                  '&:hover': { borderColor: '#A5B4FC' },
                  borderRadius: '0.5rem',
                  padding: '2px'
                })
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Return Type</label>
            <Select
              className="w-full text-sm"
              value={selectedType === 'all' ? { value: 'all', label: 'All Types' } :
                returnTypes.find(t => t.return_name === selectedType) ? {
                  value: selectedType,
                  label: selectedType
                } : null}
              onChange={(opt) => setSelectedType(opt ? opt.value : 'all')}
              options={[
                { value: 'all', label: 'All Types' },
                ...returnTypes.map(t => ({ value: t.return_name, label: t.return_name }))
              ]}
              isSearchable={true}
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: '#D1D5DB',
                  '&:hover': { borderColor: '#A5B4FC' },
                  borderRadius: '0.5rem',
                  padding: '2px'
                })
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search returns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
            />
          </div>
        </div>
        {(selectedClient !== 'all' || selectedType !== 'all' || selectedStatus !== 'all' || searchQuery !== '') && (
          <div className="mt-4 flex justify-end">
            <button onClick={resetFilters} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
              <i className="fas fa-times-circle mr-2"></i>Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100/50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Client</th>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Return Type</th>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Financial Year</th>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Assessment Year</th>
                <th className="text-center px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="text-center px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <AnimatePresence>
                {currentReturns.length === 0 ? (
                  <motion.tr
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan="6" className="py-20 text-center">
                      <div className="flex flex-col items-center">
                        <i className="fas fa-file-invoice text-6xl text-gray-200 mb-4"></i>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No returns found</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                          {searchQuery || selectedClient !== 'all' || selectedType !== 'all' || selectedStatus !== 'all'
                            ? 'Try adjusting your filters or search query.'
                            : 'Add your first return to get started.'}
                        </p>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  currentReturns.map((returnItem, idx) => (
                    <motion.tr
                      key={returnItem.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-purple-50/30 group transition"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-700 flex items-center justify-center font-bold text-sm border border-purple-200 shadow-sm flex-shrink-0">
                            {returnItem.client_name?.charAt(0).toUpperCase() || <i className="fas fa-user text-xs opacity-50"></i>}
                          </div>
                          <div className="text-base font-bold text-gray-900">{returnItem.client_name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-base font-bold text-gray-900">{returnItem.return_type}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-base font-bold text-gray-900">{returnItem.financial_year}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-base font-bold text-gray-900">{returnItem.assessment_year}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(returnItem.status)}`}>
                          {STATUS_OPTIONS.find(opt => opt.value === returnItem.status)?.label || returnItem.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openViewModal(returnItem)}
                            className="w-10 h-10 flex items-center justify-center text-purple-600 hover:bg-purple-100 rounded-xl transition shadow-sm border border-purple-100 bg-white"
                            title="View Details"
                          >
                            <i className="fas fa-eye text-base"></i>
                          </button>
                          <button
                            onClick={() => openEditModal(returnItem)}
                            className="w-10 h-10 flex items-center justify-center text-blue-600 hover:bg-blue-100 rounded-xl transition shadow-sm border border-blue-100 bg-white"
                            title="Edit Return"
                          >
                            <i className="fas fa-edit text-base"></i>
                          </button>
                          <button
                            onClick={() => handleDelete(returnItem.id, returnItem.return_type)}
                            className="w-10 h-10 flex items-center justify-center text-red-600 hover:bg-red-100 rounded-xl transition shadow-sm border border-red-100 bg-white"
                            title="Delete Return"
                          >
                            <i className="fas fa-trash text-base"></i>
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
          <div className="px-6 py-4 bg-white border-t border-gray-100 flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-sm font-bold text-purple-600 outline-none cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Returns</span>
              </div>
              <p className="text-sm text-gray-500 font-medium whitespace-nowrap">
                Showing <span className="text-gray-900 font-bold">{indexOfFirstItem + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(indexOfLastItem, filteredReturns.length)}</span> of <span className="text-gray-900 font-bold">{filteredReturns.length}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-50 p-1 rounded-2xl border border-gray-100 shadow-sm">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed opacity-50' : 'text-gray-600 hover:bg-white hover:text-purple-600 hover:shadow-sm'}`}
                >
                  <i className="fas fa-angle-double-left text-xs"></i>
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed opacity-50' : 'text-gray-600 hover:bg-white hover:text-purple-600 hover:shadow-sm'}`}
                >
                  <i className="fas fa-chevron-left text-xs"></i>
                </button>
                <div className="flex items-center gap-1 mx-1">
                  {[...Array(totalPages)].map((_, i) => {
                    if (totalPages > 7 && i + 1 !== 1 && i + 1 !== totalPages && Math.abs(currentPage - (i + 1)) > 1) {
                      if (i + 1 === 2 || i + 1 === totalPages - 1) return <span key={i} className="text-gray-300 px-1 font-black">·</span>;
                      return null;
                    }
                    return (
                      <button
                        key={i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className={`w-9 h-9 rounded-xl text-xs font-black transition-all duration-300 transform active:scale-95 ${currentPage === i + 1 ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-white hover:text-purple-600 hover:shadow-sm'}`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed opacity-50' : 'text-gray-600 hover:bg-white hover:text-purple-600 hover:shadow-sm'}`}
                >
                  <i className="fas fa-chevron-right text-xs"></i>
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed opacity-50' : 'text-gray-600 hover:bg-white hover:text-purple-600 hover:shadow-sm'}`}
                >
                  <i className="fas fa-angle-double-right text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <FormModal
            isOpen={showAddModal}
            onClose={closeAddModal}
            title="Add New Return"
          />
        )}
        {showEditModal && (
          <FormModal
            isOpen={showEditModal}
            onClose={closeEditModal}
            title="Edit Return"
          />
        )}
        {showViewModal && (
          <ViewModal
            isOpen={showViewModal}
            onClose={() => setShowViewModal(false)}
            returnItem={selectedReturn}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${toast.type === 'success'
            ? 'bg-green-500 text-white'
            : toast.type === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-blue-500 text-white'
            }`}>
            <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' :
              toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'
              }`}></i>
            <span>{toast.message}</span>
            <button
              onClick={() => setToast({ show: false, message: '', type: '' })}
              className="ml-2 text-white hover:text-gray-200"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Returns;