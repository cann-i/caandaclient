import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Select from 'react-select';
import {
  Plus,
  Search,
  Filter,
  X,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  User,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { API_BASE_URL } from '../../config';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
  { value: 'in_progress', label: 'In Progress', color: 'bg-accent/10 text-accent border-accent/20', icon: Loader2 },
  { value: 'filled', label: 'Filled', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle },
  { value: 'completed', label: 'Completed', color: 'bg-primary/10 text-primary border-primary/20', icon: CheckCircle }
];

const generateFinancialYears = () => {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 10;
  const endYear = currentYear + 1;
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

  // Handle pre-filtering
  useEffect(() => {
    if (location.state?.clientId) {
      setSelectedClient(location.state.clientId.toString());
    }
  }, [location.state]);

  const getStatusColor = (status) => {
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === status);
    return statusOption ? statusOption.color : 'bg-secondary/10 text-secondary border-secondary/20';
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setSelectedReturn(null);
    setError(null);
  };

  const handleDelete = async (id, returnType) => {
    if (window.confirm(`Are you sure you want to delete this ${returnType} return?`)) {
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

  const openAddModal = () => { resetForm(); setShowAddModal(true); };
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
  const closeAddModal = () => { setShowAddModal(false); resetForm(); };
  const closeEditModal = () => { setShowEditModal(false); resetForm(); };
  const openViewModal = (returnItem) => { setSelectedReturn(returnItem); setShowViewModal(true); };

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

  // Select styles
  const selectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: '#121212',
      borderColor: '#2A2A2A',
      color: '#E0E0E0',
      padding: '2px',
      '&:hover': { borderColor: '#3B82F6' },
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: '#121212',
      border: '1px solid #2A2A2A',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? '#1E1E1E' : '#121212',
      color: '#E0E0E0',
    }),
    singleValue: (base) => ({
      ...base,
      color: '#E0E0E0',
    }),
    input: (base) => ({
      ...base,
      color: '#E0E0E0',
    }),
    placeholder: (base) => ({
        ...base,
        color: '#A0A0A0',
    })
  };

  const FormModal = ({ isOpen, onClose, title }) => {
    const [localFormData, setLocalFormData] = useState(INITIAL_FORM_DATA);

    useEffect(() => {
      if (isOpen) setLocalFormData(formData);
    }, [isOpen]);

    const handleLocalInputChange = (e) => {
      const { name, value } = e.target;
      setLocalFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLocalSubmit = async (e) => {
      e.preventDefault();
      if (!localFormData.client_id) { showToast('Please select a client', 'error'); return; }
      if (!localFormData.return_type_id) { showToast('Please select return type', 'error'); return; }
      if (!localFormData.financial_year.trim()) { showToast('Please select financial year', 'error'); return; }
      if (!localFormData.assessment_year.trim()) { showToast('Please enter assessment year', 'error'); return; }

      setIsSubmitting(true);
      try {
        const url = selectedReturn ? `${API_BASE_URL}/returns/${selectedReturn.id}` : `${API_BASE_URL}/returns`;
        const method = selectedReturn ? 'put' : 'post';
        await axios[method](url, localFormData);
        await fetchReturns();
        showToast(selectedReturn ? 'Return updated successfully!' : 'Return added successfully!', 'success');
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
              <button onClick={onClose}><X size={24} className="text-secondary hover:text-primary"/></button>
            </div>

            <form onSubmit={handleLocalSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-secondary uppercase mb-2">Client *</label>
                  <Select
                    name="client_id"
                    value={clients.find(c => c.id === parseInt(localFormData.client_id)) ? {
                      value: localFormData.client_id,
                      label: clients.find(c => c.id === parseInt(localFormData.client_id)).client_name
                    } : null}
                    onChange={(opt) => setLocalFormData(prev => ({ ...prev, client_id: opt ? opt.value : '' }))}
                    options={clients.map(client => ({ value: client.id, label: client.client_name }))}
                    placeholder="Search client..."
                    isSearchable={true}
                    className="text-sm"
                    styles={selectStyles}
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-secondary uppercase mb-2">Return Type *</label>
                  <Select
                    className="text-sm"
                    value={returnTypes.find(t => t.id === parseInt(localFormData.return_type_id)) ? {
                      value: localFormData.return_type_id,
                      label: returnTypes.find(t => t.id === parseInt(localFormData.return_type_id)).return_name
                    } : null}
                    onChange={(opt) => setLocalFormData(prev => ({ ...prev, return_type_id: opt ? opt.value : '' }))}
                    options={returnTypes.map(type => ({ value: type.id, label: type.return_name }))}
                    placeholder="Select Type..."
                    isSearchable={true}
                    styles={selectStyles}
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-secondary uppercase mb-2">Financial Year *</label>
                  <select
                    name="financial_year"
                    value={localFormData.financial_year}
                    onChange={handleLocalInputChange}
                    required
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent outline-none"
                  >
                    <option value="">Select Financial Year</option>
                    {FINANCIAL_YEARS.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-secondary uppercase mb-2">Assessment Year *</label>
                  <input
                    type="text"
                    name="assessment_year"
                    value={localFormData.assessment_year}
                    onChange={handleLocalInputChange}
                    required
                    placeholder="e.g., 2025-26"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-secondary uppercase mb-2">Status</label>
                  <select
                    name="status"
                    value={localFormData.status}
                    onChange={handleLocalInputChange}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent outline-none"
                  >
                    {STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-mono text-secondary uppercase mb-2">Notes</label>
                  <textarea
                    name="notes"
                    value={localFormData.notes}
                    onChange={handleLocalInputChange}
                    rows="3"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-border">
                <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
                <Button variant="accent" type="submit" disabled={isSubmitting}>
                   {isSubmitting ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                   {selectedReturn ? 'Update Return' : 'Add Return'}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    );
  };

  const ViewModal = ({ isOpen, onClose, returnItem }) => {
    if (!isOpen || !returnItem) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           exit={{ opacity: 0, scale: 0.95 }}
           className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
           onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-border bg-surface-highlight/20 flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                    <FileText size={20} />
                 </div>
                 <div>
                    <h2 className="text-lg font-bold text-primary">{returnItem.return_type}</h2>
                    <p className="text-xs text-secondary">Return Details</p>
                 </div>
              </div>
              <button onClick={onClose}><X size={20} className="text-secondary hover:text-primary"/></button>
          </div>

          <div className="p-6 grid grid-cols-2 gap-4">
             <div className="bg-background border border-border rounded-lg p-3">
                <p className="text-xs font-mono text-secondary uppercase mb-1">Client</p>
                <p className="text-sm font-bold text-primary">{returnItem.client_name}</p>
             </div>
             <div className="bg-background border border-border rounded-lg p-3">
                <p className="text-xs font-mono text-secondary uppercase mb-1">Status</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(returnItem.status)}`}>
                   {STATUS_OPTIONS.find(opt => opt.value === returnItem.status)?.label || returnItem.status}
                </span>
             </div>
             <div className="bg-background border border-border rounded-lg p-3">
                <p className="text-xs font-mono text-secondary uppercase mb-1">Financial Year</p>
                <p className="text-sm font-bold text-primary">{returnItem.financial_year}</p>
             </div>
             <div className="bg-background border border-border rounded-lg p-3">
                <p className="text-xs font-mono text-secondary uppercase mb-1">Assessment Year</p>
                <p className="text-sm font-bold text-primary">{returnItem.assessment_year}</p>
             </div>
             <div className="col-span-2 bg-background border border-border rounded-lg p-3">
                <p className="text-xs font-mono text-secondary uppercase mb-1">Notes</p>
                <p className="text-sm text-primary">{returnItem.notes || 'No notes.'}</p>
             </div>
          </div>

          <div className="p-4 border-t border-border flex justify-end gap-2">
             <Button variant="secondary" size="sm" onClick={() => { onClose(); openEditModal(returnItem); }}>Edit</Button>
             <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>
        </motion.div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary tracking-tight">Returns Management</h2>
          <p className="text-secondary text-sm">Manage tax returns and filings.</p>
        </div>
        <Button variant="accent" onClick={openAddModal} className="gap-2">
          <Plus size={16} /> Add Return
        </Button>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-mono text-secondary uppercase mb-2">Client</label>
            <Select
              className="text-sm"
              value={selectedClient === 'all' ? { value: 'all', label: 'All Clients' } :
                clients.find(c => c.id === parseInt(selectedClient)) ? {
                  value: selectedClient,
                  label: clients.find(c => c.id === parseInt(selectedClient)).client_name
                } : null}
              onChange={(opt) => setSelectedClient(opt ? opt.value : 'all')}
              options={[{ value: 'all', label: 'All Clients' }, ...clients.map(c => ({ value: c.id, label: c.client_name }))]}
              styles={selectStyles}
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-secondary uppercase mb-2">Return Type</label>
            <Select
              className="text-sm"
              value={selectedType === 'all' ? { value: 'all', label: 'All Types' } :
                returnTypes.find(t => t.return_name === selectedType) ? {
                  value: selectedType,
                  label: selectedType
                } : null}
              onChange={(opt) => setSelectedType(opt ? opt.value : 'all')}
              options={[{ value: 'all', label: 'All Types' }, ...returnTypes.map(t => ({ value: t.return_name, label: t.return_name }))]}
              styles={selectStyles}
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-secondary uppercase mb-2">Status</label>
            <select
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent outline-none"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono text-secondary uppercase mb-2">Search</label>
            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={14} />
               <input
                 type="text"
                 placeholder="Search returns..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent outline-none"
               />
            </div>
          </div>
        </div>
        {(selectedClient !== 'all' || selectedType !== 'all' || selectedStatus !== 'all' || searchQuery !== '') && (
           <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-secondary hover:text-primary gap-2">
                 <X size={14} /> Reset Filters
              </Button>
           </div>
        )}
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
             <thead>
                <tr className="border-b border-border bg-surface-highlight/30">
                   <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Client</th>
                   <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Return Details</th>
                   <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">FY / AY</th>
                   <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Status</th>
                   <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-right">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-border">
                {currentReturns.length > 0 ? (
                   currentReturns.map((returnItem) => (
                      <tr key={returnItem.id} className="hover:bg-surface-highlight/50 transition-colors group">
                         <td className="p-4">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded bg-accent/10 text-accent flex items-center justify-center font-bold text-xs border border-accent/20">
                                  {returnItem.client_name?.charAt(0).toUpperCase()}
                               </div>
                               <span className="text-sm font-bold text-primary">{returnItem.client_name}</span>
                            </div>
                         </td>
                         <td className="p-4">
                            <span className="text-sm text-primary">{returnItem.return_type}</span>
                         </td>
                         <td className="p-4">
                            <div className="flex flex-col gap-1">
                               <span className="text-xs text-secondary font-mono">FY: {returnItem.financial_year}</span>
                               <span className="text-xs text-secondary font-mono">AY: {returnItem.assessment_year}</span>
                            </div>
                         </td>
                         <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold border ${getStatusColor(returnItem.status)}`}>
                               {STATUS_OPTIONS.find(opt => opt.value === returnItem.status)?.label || returnItem.status}
                            </span>
                         </td>
                         <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button onClick={() => openViewModal(returnItem)} className="p-1.5 hover:bg-surface-highlight rounded text-secondary hover:text-accent transition-colors"><Eye size={16} /></button>
                               <button onClick={() => openEditModal(returnItem)} className="p-1.5 hover:bg-surface-highlight rounded text-secondary hover:text-accent transition-colors"><Edit size={16} /></button>
                               <button onClick={() => handleDelete(returnItem.id, returnItem.return_type)} className="p-1.5 hover:bg-surface-highlight rounded text-secondary hover:text-error transition-colors"><Trash2 size={16} /></button>
                            </div>
                         </td>
                      </tr>
                   ))
                ) : (
                   <tr>
                      <td colSpan={5} className="p-12 text-center text-secondary">
                         No returns found matching your criteria.
                      </td>
                   </tr>
                )}
             </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredReturns.length > 0 && (
           <div className="p-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <span className="text-xs text-secondary">Rows:</span>
                 <select
                   value={itemsPerPage}
                   onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                   className="bg-background border border-border rounded text-xs text-primary p-1 outline-none"
                 >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                 </select>
                 <span className="text-xs text-secondary ml-4">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredReturns.length)} of {filteredReturns.length}
                 </span>
              </div>
              <div className="flex gap-2">
                 <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft size={16} /></Button>
                 <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight size={16} /></Button>
              </div>
           </div>
        )}
      </div>

      {/* Toast */}
      {toast.show && (
         <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white ${toast.type === 'success' ? 'bg-success' : toast.type === 'error' ? 'bg-error' : 'bg-accent'}`}>
            {toast.message}
         </div>
      )}

      {/* Modals */}
      <AnimatePresence>
         {showAddModal && <FormModal isOpen={showAddModal} onClose={closeAddModal} title="Add New Return" />}
         {showEditModal && <FormModal isOpen={showEditModal} onClose={closeEditModal} title="Edit Return" />}
         {showViewModal && <ViewModal isOpen={showViewModal} onClose={() => setShowViewModal(false)} returnItem={selectedReturn} />}
      </AnimatePresence>
    </div>
  );
}

export default Returns;
