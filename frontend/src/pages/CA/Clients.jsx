import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// Constants
const API_BASE_URL = 'http://localhost:5000/api';
const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
];

const INITIAL_FORM_DATA = {
  business_name: '',
  client_name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  pan_number: '',
  aadhar_number: '',
  gstin: '',
  dob: '',
  notes: '',
  client_type: 'individual',
  status: 'active'
};

function Clients() {
  const navigate = useNavigate();
  // State management
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // Auto-hide toast after 3 seconds
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '', type: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // API functions
  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/clients`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setError('Failed to fetch clients. Please try again.');
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);


  const handleDelete = useCallback(async (id, clientName) => {
    if (!window.confirm(`Are you sure you want to delete "${clientName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/clients/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete client');
      }

      await fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      setError(error.message);
    }
  }, [fetchClients]);

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setSelectedClient(null);
    setError(null);
  }, []);

  const openAddModal = useCallback(() => {
    resetForm();
    setShowAddModal(true);
  }, [resetForm]);

  const openEditModal = useCallback((client) => {
    setSelectedClient(client);
    setFormData({
      business_name: client.business_name || '',
      client_name: client.client_name || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      pincode: client.pincode || '',
      pan_number: client.pan || '',
      aadhar_number: client.aadhar || '',
      gstin: client.gstin || '',
      dob: client.dob || '',
      notes: client.notes || '',
      client_type: client.client_type || 'individual',
      status: client.status || 'active'
    });
    setShowEditModal(true);
  }, []);

  const openViewModal = useCallback((client) => {
    setSelectedClient(client);
    setShowViewModal(true);
  }, []);




  const handleSort = useCallback((field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder]);

  // Memoized filtered and sorted clients for performance
  const filteredAndSortedClients = useMemo(() => {
    return clients
      .filter(client => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || [
          client.business_name,
          client.client_name,
          client.email,
          client.phone,
          client.pan,
          client.aadhar
        ].some(field => field?.toLowerCase().includes(searchLower));

        const matchesStatus = filterStatus === 'all' || client.status === filterStatus;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        let aValue = a[sortBy] || '';
        let bValue = b[sortBy] || '';

        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        const comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [clients, searchTerm, filterStatus, sortBy, sortOrder]);

  // Memoized pagination data
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(filteredAndSortedClients.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentClients = filteredAndSortedClients.slice(indexOfFirstItem, indexOfLastItem);

    return {
      totalPages,
      indexOfLastItem,
      indexOfFirstItem,
      currentClients,
      totalItems: filteredAndSortedClients.length
    };
  }, [filteredAndSortedClients, currentPage, itemsPerPage]);

  const { totalPages, indexOfLastItem, indexOfFirstItem, currentClients, totalItems } = paginationData;


  const FormModal = ({ isOpen, onClose, title, selectedClient }) => {
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

      // Client name validation
      if (!localFormData.client_name.trim()) {
        alert('Client name is required');
        return;
      }

      // Other validations
      const errors = [];

      // Mandatory Fields Check
      const mandatoryFields = [
        { field: 'business_name', label: 'Business Name' },
        { field: 'email', label: 'Email' },
        { field: 'phone', label: 'Phone' },
        { field: 'pan_number', label: 'PAN Number' },
        { field: 'aadhar_number', label: 'Aadhaar Number' },
        { field: 'dob', label: 'Date of Birth' },
        { field: 'address', label: 'Address' },
        { field: 'city', label: 'City' },
        { field: 'state', label: 'State' },
        { field: 'pincode', label: 'Pincode' }
      ];

      mandatoryFields.forEach(({ field, label }) => {
        if (!localFormData[field] || !localFormData[field].toString().trim()) {
          errors.push(`${label} is required`);
        }
      });

      if (localFormData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(localFormData.email)) {
        errors.push('Invalid email format');
      }

      if (localFormData.phone && !/^[6-9]\d{9}$/.test(localFormData.phone)) {
        errors.push('Phone must be 10 digits starting with 6-9');
      }

      if (localFormData.pincode && !/^\d{6}$/.test(localFormData.pincode)) {
        errors.push('Pincode must be exactly 6 digits');
      }

      if (localFormData.aadhar_number && !/^\d{12}$/.test(localFormData.aadhar_number)) {
        errors.push('Aadhaar must be 12 digits');
      }

      if (localFormData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(localFormData.pan_number.toUpperCase())) {
        errors.push('PAN format: ABCDE1234F');
      }

      const isBusinessOrCompany = ['company', 'business'].includes(localFormData.client_type);

      if (localFormData.gstin) {
        if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(localFormData.gstin.toUpperCase())) {
          errors.push('GSTIN format: 22AAAAA0000A1Z5');
        }
      } else if (isBusinessOrCompany) {
        errors.push(`GSTIN is required for ${localFormData.client_type} clients`);
      }

      if (errors.length > 0) {
        alert(errors.join('\n'));
        return;
      }

      try {
        const url = selectedClient
          ? `${API_BASE_URL}/clients/${selectedClient.id}`
          : `${API_BASE_URL}/clients`;

        const method = selectedClient ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            business_name: localFormData.business_name,
            client_name: localFormData.client_name,
            email: localFormData.email,
            phone: localFormData.phone,
            address: localFormData.address,
            city: localFormData.city,
            state: localFormData.state,
            pincode: localFormData.pincode,
            pan: localFormData.pan_number,
            aadhar: localFormData.aadhar_number,
            gstin: localFormData.gstin,
            dob: localFormData.dob,
            notes: localFormData.notes,
            client_type: localFormData.client_type,
            status: localFormData.status
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save client');
        }

        // Update the clients list immediately
        if (selectedClient) {
          // Update existing client in the list
          setClients(prevClients =>
            prevClients.map(client =>
              client.id === selectedClient.id
                ? {
                  ...client,
                  business_name: localFormData.business_name,
                  client_name: localFormData.client_name,
                  email: localFormData.email,
                  phone: localFormData.phone,
                  address: localFormData.address,
                  city: localFormData.city,
                  state: localFormData.state,
                  pincode: localFormData.pincode,
                  pan: localFormData.pan_number,
                  aadhar: localFormData.aadhar_number,
                  gstin: localFormData.gstin,
                  dob: localFormData.dob,
                  notes: localFormData.notes,
                  client_type: localFormData.client_type,
                  status: localFormData.status
                }
                : client
            )
          );
        } else {
          // Refresh the entire list for new clients
          await fetchClients();
        }

        // Show success toast
        setToast({
          show: true,
          message: selectedClient ? 'Client updated successfully!' : 'Client created successfully!',
          type: 'success'
        });

        onClose();
      } catch (error) {
        console.error('Error saving client:', error);
        setToast({
          show: true,
          message: error.message,
          type: 'error'
        });
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                  <input
                    type="text"
                    name="business_name"
                    value={localFormData.business_name}
                    onChange={handleLocalInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Business Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                  <input
                    type="text"
                    name="client_name"
                    value={localFormData.client_name}
                    onChange={handleLocalInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Type</label>
                  <select
                    name="client_type"
                    value={localFormData.client_type}
                    onChange={handleLocalInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="individual">Individual</option>
                    <option value="business">Business</option>
                    <option value="company">Company</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={localFormData.email}
                    onChange={handleLocalInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="example@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={localFormData.phone}
                    onChange={handleLocalInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="9876543210"
                    maxLength="10"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number *</label>
                  <input
                    type="text"
                    name="pan_number"
                    value={localFormData.pan_number}
                    onChange={handleLocalInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ABCDE1234F"
                    maxLength="10"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number *</label>
                  <input
                    type="text"
                    name="aadhar_number"
                    value={localFormData.aadhar_number}
                    onChange={handleLocalInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123456789012"
                    maxLength="12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GSTIN {['company', 'business'].includes(localFormData.client_type) && '*'}
                  </label>
                  <input
                    type="text"
                    name="gstin"
                    value={localFormData.gstin}
                    onChange={handleLocalInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="22AAAAA0000A1Z5"
                    maxLength="15"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    name="dob"
                    value={localFormData.dob ? localFormData.dob.split('T')[0] : ''}
                    onChange={handleLocalInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <textarea
                    name="address"
                    value={localFormData.address}
                    onChange={handleLocalInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={localFormData.city}
                    onChange={handleLocalInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <input
                    type="text"
                    name="state"
                    value={localFormData.state}
                    onChange={handleLocalInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                  <input
                    type="text"
                    name="pincode"
                    value={localFormData.pincode}
                    onChange={handleLocalInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>



                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={localFormData.notes}
                    onChange={handleLocalInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={localFormData.status}
                    onChange={handleLocalInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
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
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition transform hover:-translate-y-0.5"
                >
                  {selectedClient ? 'Update Client' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const ViewModal = ({ isOpen, onClose, client }) => {
    useEffect(() => {
      const handleEsc = (e) => {
        if (e.key === 'Escape') onClose();
      };
      if (isOpen) {
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
      }
    }, [isOpen, onClose]);

    if (!isOpen || !client) return null;

    const InfoGroup = ({ label, value, mono = false, icon }) => (
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 mb-1">
          {icon && <i className={`${icon} text-gray-400 text-xs`}></i>}
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        </div>
        <p className={`text-sm text-gray-900 font-medium ${mono ? 'font-mono' : ''} break-words`}>
          {value || <span className="text-gray-400 italic">Not provided</span>}
        </p>
      </div>
    );

    const Section = ({ title, children }) => (
      <div className="mb-6 last:mb-0">
        <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3 border-b border-indigo-50 pb-1">{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
          {children}
        </div>
      </div>
    );

    return (
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                {client.business_name?.charAt(0).toUpperCase() || client.client_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 leading-tight">{client.business_name || 'No Business Name'}</h2>
                <p className="text-sm text-gray-500 font-medium">{client.client_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${(client.client_type || 'individual').toLowerCase() === 'company'
                    ? 'bg-purple-100 text-purple-800'
                    : (client.client_type || 'individual').toLowerCase() === 'business'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                    }`}>
                    {client.client_type ? client.client_type.charAt(0).toUpperCase() + client.client_type.slice(1) : 'Individual'}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${client.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${client.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    {client.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto custom-scrollbar">

            <Section title="Contact Information">
              <InfoGroup label="Email Address" value={client.email} icon="fas fa-envelope" />
              <InfoGroup label="Phone Number" value={client.phone} icon="fas fa-phone" />
            </Section>

            <Section title="Identity & Tax">
              <InfoGroup label="PAN Number" value={client.pan} mono icon="fas fa-id-card" />
              <InfoGroup label="GSTIN" value={client.gstin} mono icon="fas fa-receipt" />
              <InfoGroup label="Aadhaar" value={client.aadhar} mono icon="fas fa-fingerprint" />
              <InfoGroup label="Date of Birth" value={client.dob ? new Date(client.dob).toLocaleDateString() : null} icon="fas fa-calendar" />
            </Section>

            <Section title="Location">
              <div className="sm:col-span-2">
                <InfoGroup label="Address" value={client.address} icon="fas fa-map-marker-alt" />
              </div>
              <InfoGroup label="City" value={client.city} />
              <InfoGroup label="State" value={client.state} />
              <InfoGroup label="Pincode" value={client.pincode} />
            </Section>

            {client.notes && (
              <Section title="Notes">
                <div className="sm:col-span-2">
                  <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-100 italic">
                    {client.notes}
                  </p>
                </div>
              </Section>
            )}

          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button
              onClick={() => {
                onClose();
                openEditModal(client);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              <i className="fas fa-edit"></i>
              Edit Client
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Toast Component
  const Toast = () => {
    if (!toast.show) return null;

    return (
      <div className="fixed top-4 right-4 z-50">
        <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${toast.type === 'success'
          ? 'bg-green-500 text-white'
          : 'bg-red-500 text-white'
          }`}>
          <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'
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
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Management</h1>
            <p className="text-gray-600">Manage your clients and their information</p>
          </div>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition transform hover:-translate-y-0.5"
          >
            <i className="fas fa-plus mr-2"></i>
            Add Client
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <i className="fas fa-exclamation-triangle text-red-500 mr-2"></i>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="fas fa-search text-gray-400"></i>
                </div>
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Professional Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100/50 border-b border-gray-100">
                  <th
                    className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200/50 transition-colors duration-200"
                    onClick={() => handleSort('business_name')}
                  >
                    <div className="flex items-center gap-2">
                      <span>Business / Client</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">
                    PAN Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">
                    Aadhaar Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">
                    Client Type
                  </th>
                  <th
                    className="px-6 py-4 text-center text-xs font-black text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200/50 transition-colors duration-200"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>Status</span>
                      {sortBy === 'status' && (
                        <i className={`fas fa-sort-${sortOrder === 'asc' ? 'up' : 'down'} text-purple-600 text-xs`}></i>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-black text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence>
                  {currentClients.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-400">
                          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <i className="fas fa-users text-2xl"></i>
                          </div>
                          <p className="text-lg font-bold text-gray-600 mb-2">No clients found</p>
                          <p className="text-sm font-medium">Try adjusting your search or filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentClients.map((client, index) => (
                      <motion.tr
                        key={client.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gradient-to-r hover:from-purple-50/30 hover:to-indigo-50/30 transition-all duration-300 group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-700 flex items-center justify-center font-bold text-sm border border-purple-200 shadow-sm flex-shrink-0">
                              {client.business_name?.charAt(0).toUpperCase() || client.client_name?.charAt(0).toUpperCase() || <i className="fas fa-user text-xs opacity-50"></i>}
                            </div>
                            <div className="min-w-0">
                              <p className="text-base font-bold text-gray-900 truncate tracking-tight">{client.business_name || 'N/A'}</p>
                              <p className="text-sm text-gray-500 font-medium truncate">{client.client_name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="min-w-0">
                            <p className="text-base font-bold text-gray-900 truncate tracking-tight">{client.email || 'No email'}</p>
                            <p className="text-sm text-gray-500 font-medium truncate">{client.phone || 'No phone'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-base font-bold text-gray-900 truncate tracking-tight">{client.pan || 'No PAN'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-base font-bold text-gray-900 truncate tracking-tight">{client.aadhar || 'No Aadhaar'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(client.client_type || 'individual').toLowerCase() === 'company'
                            ? 'bg-purple-100 text-purple-800'
                            : (client.client_type || 'individual').toLowerCase() === 'business'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                            }`}>
                            {client.client_type ? client.client_type.charAt(0).toUpperCase() + client.client_type.slice(1) : 'Individual'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-sm font-black px-2 py-1 rounded-lg ${client.status === 'active'
                            ? 'text-green-600 bg-green-100'
                            : 'text-red-600 bg-red-100'
                            }`}>
                            {client.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openViewModal(client)}
                              className="w-10 h-10 flex items-center justify-center text-purple-600 hover:bg-purple-100 rounded-xl transition shadow-sm border border-purple-100 bg-white"
                              title="View Details"
                            >
                              <i className="fas fa-eye text-base"></i>
                            </button>
                            <button
                              onClick={() => openEditModal(client)}
                              className="w-10 h-10 flex items-center justify-center text-blue-600 hover:bg-blue-100 rounded-xl transition shadow-sm border border-blue-100 bg-white"
                              title="Edit Client"
                            >
                              <i className="fas fa-edit text-base"></i>
                            </button>
                            <button
                              onClick={() => navigate('/upload-docs')}
                              className="w-10 h-10 flex items-center justify-center text-green-600 hover:bg-green-100 rounded-xl transition shadow-sm border border-green-100 bg-white"
                              title="Upload Document"
                            >
                              <i className="fas fa-upload text-base"></i>
                            </button>
                            <button
                              onClick={() => handleDelete(client.id, client.business_name)}
                              className="w-10 h-10 flex items-center justify-center text-red-600 hover:bg-red-100 rounded-xl transition shadow-sm border border-red-100 bg-white"
                              title="Delete Client"
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

          {/* Professional Pagination Controls */}
          {filteredAndSortedClients.length > 0 && (
            <div className="px-6 py-4 bg-white border-t border-gray-100 flex flex-col lg:flex-row justify-between items-center gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                <p className="text-sm text-gray-500 font-medium whitespace-nowrap">
                  Showing <span className="text-gray-900 font-bold">{indexOfFirstItem + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(indexOfLastItem, totalItems)}</span> of <span className="text-gray-900 font-bold">{totalItems}</span>
                </p>
              </div>

              {totalPages > 1 && (
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
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
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
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
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
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      <Toast />

      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <FormModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            title="Add New Client"
          />
        )}
        {showEditModal && (
          <FormModal
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            title="Edit Client"
            selectedClient={selectedClient}
          />
        )}
        {showViewModal && (
          <ViewModal
            isOpen={showViewModal}
            onClose={() => setShowViewModal(false)}
            client={selectedClient}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Clients;