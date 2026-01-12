import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  Upload,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Briefcase,
  User,
  Building,
  Mail,
  Phone,
  FileText,
  MapPin,
  Calendar,
  X,
  CreditCard,
  Fingerprint,
  Users
} from 'lucide-react';
import Button from '../../components/ui/Button';

// Constants
const API_BASE_URL = API_BASE_URL;
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

  // Auto-hide toast
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

  // Memoized filtered and sorted clients
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
    }, [isOpen]);

    const handleLocalInputChange = (e) => {
      const { name, value } = e.target;
      setLocalFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLocalSubmit = async (e) => {
      e.preventDefault();
      // Validation logic same as before...
      if (!localFormData.client_name.trim()) {
        alert('Client name is required');
        return;
      }

       // Other validations
       const errors = [];
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
          throw new Error('Failed to save client');
        }

        if (selectedClient) {
          setClients(prevClients =>
            prevClients.map(client =>
              client.id === selectedClient.id ? { ...client, ...localFormData, pan: localFormData.pan_number, aadhar: localFormData.aadhar_number } : client
            )
          );
        } else {
          await fetchClients();
        }

        setToast({
          show: true,
          message: selectedClient ? 'Client updated successfully!' : 'Client created successfully!',
          type: 'success'
        });

        onClose();
      } catch (error) {
        console.error('Error saving client:', error);
        setToast({ show: true, message: error.message, type: 'error' });
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-primary">{title}</h2>
              <button onClick={onClose} className="text-secondary hover:text-primary"><X size={24} /></button>
            </div>

            <form onSubmit={handleLocalSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fields - Styled with Tailwind */}
                <div>
                  <label className="block text-xs font-mono text-secondary uppercase mb-1">Business Name *</label>
                  <input
                    type="text"
                    name="business_name"
                    value={localFormData.business_name}
                    onChange={handleLocalInputChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                    placeholder="Enter Business Name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-secondary uppercase mb-1">Client Name *</label>
                  <input
                    type="text"
                    name="client_name"
                    value={localFormData.client_name}
                    onChange={handleLocalInputChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                    placeholder="Enter Client Name"
                  />
                </div>
                 {/* ... More fields styled similarly ... */}
                  <div>
                    <label className="block text-xs font-mono text-secondary uppercase mb-1">Email *</label>
                    <input type="email" name="email" value={localFormData.email} onChange={handleLocalInputChange} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-secondary uppercase mb-1">Phone *</label>
                    <input type="tel" name="phone" value={localFormData.phone} onChange={handleLocalInputChange} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-secondary uppercase mb-1">PAN Number *</label>
                    <input type="text" name="pan_number" value={localFormData.pan_number} onChange={handleLocalInputChange} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none uppercase" />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-secondary uppercase mb-1">Aadhaar Number *</label>
                    <input type="text" name="aadhar_number" value={localFormData.aadhar_number} onChange={handleLocalInputChange} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none" />
                  </div>

                  <div>
                     <label className="block text-xs font-mono text-secondary uppercase mb-1">Date of Birth *</label>
                     <input type="date" name="dob" value={localFormData.dob ? localFormData.dob.split('T')[0] : ''} onChange={handleLocalInputChange} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-secondary uppercase mb-1">GSTIN</label>
                    <input type="text" name="gstin" value={localFormData.gstin} onChange={handleLocalInputChange} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none uppercase" />
                  </div>

                  <div className="md:col-span-2">
                     <label className="block text-xs font-mono text-secondary uppercase mb-1">Address *</label>
                     <textarea name="address" value={localFormData.address} onChange={handleLocalInputChange} rows="2" className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none" />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-secondary uppercase mb-1">City *</label>
                    <input type="text" name="city" value={localFormData.city} onChange={handleLocalInputChange} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-secondary uppercase mb-1">State *</label>
                    <input type="text" name="state" value={localFormData.state} onChange={handleLocalInputChange} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-secondary uppercase mb-1">Pincode *</label>
                    <input type="text" name="pincode" value={localFormData.pincode} onChange={handleLocalInputChange} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none" />
                  </div>

                   <div>
                    <label className="block text-xs font-mono text-secondary uppercase mb-1">Client Type</label>
                    <select name="client_type" value={localFormData.client_type} onChange={handleLocalInputChange} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none">
                      <option value="individual">Individual</option>
                      <option value="business">Business</option>
                      <option value="company">Company</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-secondary uppercase mb-1">Status</label>
                    <select name="status" value={localFormData.status} onChange={handleLocalInputChange} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-border mt-6">
                <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
                <Button variant="accent" type="submit">{selectedClient ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    );
  };

  const ViewModal = ({ isOpen, onClose, client }) => {
    if (!isOpen || !client) return null;

    const InfoGroup = ({ label, value, icon: Icon }) => (
      <div className="flex flex-col mb-4">
        <div className="flex items-center gap-2 mb-1">
          {Icon && <Icon size={14} className="text-secondary" />}
          <span className="text-xs font-mono text-secondary uppercase">{label}</span>
        </div>
        <p className="text-sm font-medium text-primary break-all">{value || '-'}</p>
      </div>
    );

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           exit={{ opacity: 0, scale: 0.95 }}
           className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
           onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface-highlight/20">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold text-lg border border-accent/20">
                 {client.business_name?.charAt(0).toUpperCase() || client.client_name?.charAt(0).toUpperCase()}
               </div>
               <div>
                 <h2 className="text-lg font-bold text-primary">{client.business_name || client.client_name}</h2>
                 <p className="text-xs text-secondary">{client.client_type}</p>
               </div>
             </div>
             <button onClick={onClose}><X size={20} className="text-secondary hover:text-primary" /></button>
          </div>

          <div className="p-6 overflow-y-auto">
             <div className="grid grid-cols-2 gap-4">
               <InfoGroup label="Email" value={client.email} icon={Mail} />
               <InfoGroup label="Phone" value={client.phone} icon={Phone} />
               <InfoGroup label="PAN" value={client.pan} icon={CreditCard} />
               <InfoGroup label="Aadhaar" value={client.aadhar} icon={Fingerprint} />
               <InfoGroup label="GSTIN" value={client.gstin} icon={FileText} />
               <InfoGroup label="DOB" value={client.dob ? new Date(client.dob).toLocaleDateString() : '-'} icon={Calendar} />
               <div className="col-span-2">
                 <InfoGroup label="Address" value={`${client.address}, ${client.city}, ${client.state} - ${client.pincode}`} icon={MapPin} />
               </div>
             </div>
          </div>

          <div className="p-4 border-t border-border bg-surface-highlight/10 flex justify-end gap-2">
             <Button variant="secondary" size="sm" onClick={() => { onClose(); openEditModal(client); }}>Edit</Button>
             <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>
        </motion.div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
       {/* Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
           <h1 className="text-2xl font-bold text-primary tracking-tight">Client Management</h1>
           <p className="text-secondary text-sm">Manage your client database and details.</p>
         </div>
         <Button variant="accent" onClick={openAddModal} className="gap-2">
           <Plus size={16} /> Add Client
         </Button>
       </div>

       {/* Controls */}
       <div className="bg-surface border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={18} />
             <input
               type="text"
               placeholder="Search clients..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent focus:ring-1 focus:ring-accent outline-none"
             />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
             <Filter size={18} className="text-secondary" />
             <select
               value={filterStatus}
               onChange={(e) => setFilterStatus(e.target.value)}
               className="px-3 py-2 bg-background border border-border rounded-lg text-primary outline-none focus:border-accent"
             >
               {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
             </select>
          </div>
       </div>

       {/* Client Grid/List */}
       <div className="grid grid-cols-1 gap-4">
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="border-b border-border bg-surface-highlight/30">
                         <th className="p-4 text-xs font-mono text-secondary uppercase font-medium cursor-pointer hover:text-primary" onClick={() => handleSort('business_name')}>Business / Client</th>
                         <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Contact</th>
                         <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Identifiers</th>
                         <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Type</th>
                         <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Status</th>
                         <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-border">
                      {currentClients.length > 0 ? (
                        currentClients.map((client) => (
                           <tr key={client.id} className="hover:bg-surface-highlight/50 transition-colors group">
                              <td className="p-4">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-accent/10 text-accent flex items-center justify-center font-bold text-xs border border-accent/20">
                                       {client.business_name?.charAt(0).toUpperCase() || client.client_name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                       <p className="text-sm font-bold text-primary">{client.business_name || 'N/A'}</p>
                                       <p className="text-xs text-secondary">{client.client_name}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="p-4">
                                 <div className="flex flex-col gap-1">
                                    <span className="text-xs text-primary flex items-center gap-1"><Mail size={12} className="text-secondary" /> {client.email}</span>
                                    <span className="text-xs text-primary flex items-center gap-1"><Phone size={12} className="text-secondary" /> {client.phone}</span>
                                 </div>
                              </td>
                              <td className="p-4">
                                 <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-mono bg-background px-1.5 py-0.5 rounded border border-border text-secondary inline-block w-fit">PAN: {client.pan}</span>
                                    <span className="text-[10px] font-mono bg-background px-1.5 py-0.5 rounded border border-border text-secondary inline-block w-fit">AAD: {client.aadhar}</span>
                                 </div>
                              </td>
                              <td className="p-4">
                                 <span className="text-xs px-2 py-1 rounded bg-surface-highlight border border-border text-secondary capitalize">
                                    {client.client_type}
                                 </span>
                              </td>
                              <td className="p-4">
                                 <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded border ${
                                    client.status === 'active'
                                    ? 'bg-success/10 text-success border-success/20'
                                    : 'bg-error/10 text-error border-error/20'
                                 }`}>
                                    {client.status}
                                 </span>
                              </td>
                              <td className="p-4 text-right">
                                 <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openViewModal(client)} className="p-1.5 hover:bg-surface-highlight rounded text-secondary hover:text-accent transition-colors"><Eye size={16} /></button>
                                    <button onClick={() => openEditModal(client)} className="p-1.5 hover:bg-surface-highlight rounded text-secondary hover:text-accent transition-colors"><Edit size={16} /></button>
                                    <button onClick={() => navigate('/upload-docs')} className="p-1.5 hover:bg-surface-highlight rounded text-secondary hover:text-success transition-colors"><Upload size={16} /></button>
                                    <button onClick={() => handleDelete(client.id, client.business_name)} className="p-1.5 hover:bg-surface-highlight rounded text-secondary hover:text-error transition-colors"><Trash2 size={16} /></button>
                                 </div>
                              </td>
                           </tr>
                        ))
                      ) : (
                         <tr>
                            <td colSpan={6} className="p-8 text-center text-secondary">
                               <div className="flex flex-col items-center gap-2">
                                  <Users size={32} className="opacity-20" />
                                  <p>No clients found matching your criteria</p>
                               </div>
                            </td>
                         </tr>
                      )}
                   </tbody>
                </table>
             </div>

             {/* Pagination */}
             {totalPages > 1 && (
                <div className="p-4 border-t border-border flex items-center justify-between">
                   <p className="text-xs text-secondary">Page {currentPage} of {totalPages}</p>
                   <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft size={16} /></Button>
                      <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight size={16} /></Button>
                   </div>
                </div>
             )}
          </div>
       </div>

       {/* Modals */}
       <AnimatePresence>
          {showAddModal && <FormModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Client" />}
          {showEditModal && <FormModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Client" selectedClient={selectedClient} />}
          {showViewModal && <ViewModal isOpen={showViewModal} onClose={() => setShowViewModal(false)} client={selectedClient} />}
       </AnimatePresence>

       {/* Toast */}
       {toast.show && (
          <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'success' ? 'bg-success' : 'bg-error'}`}>
             {toast.message}
          </div>
       )}
    </div>
  );
}

export default Clients;
