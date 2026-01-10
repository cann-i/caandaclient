import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';
import * as XLSX from 'xlsx';
import {
  Plus,
  Search,
  X,
  Eye,
  Edit,
  Trash2,
  CreditCard,
  Download,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Filter,
  DollarSign,
  MinusCircle
} from 'lucide-react';
import Button from '../../components/ui/Button';

function Invoices({ showToast }) {
  const location = useLocation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // New Invoice State
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [newInvoice, setNewInvoice] = useState({
    clientId: null,
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    items: [],
    notes: ''
  });

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (showCreateModal) setShowCreateModal(false);
        if (showViewModal) setShowViewModal(false);
        if (showPaymentModal) setShowPaymentModal(false);
        if (showStatusModal) setShowStatusModal(false);
        if (showEditModal) setShowEditModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showCreateModal, showViewModal, showPaymentModal, showStatusModal, showEditModal]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/invoices');
      setInvoices(response.data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Fetch clients and services for modal
  useEffect(() => {
    if (showCreateModal || showEditModal) {
      const fetchData = async () => {
        try {
          const [clientsRes, servicesRes] = await Promise.all([
            axios.get('http://localhost:5000/api/clients'),
            axios.get('http://localhost:5000/api/services')
          ]);
          setClients(clientsRes.data);
          setServices(servicesRes.data);
        } catch (error) {
          console.error("Error fetching dependencies:", error);
          showToast('Failed to load form data', 'error');
        }
      };
      fetchData();
    }
  }, [showCreateModal, showEditModal, showToast]);

  useEffect(() => {
    if (location.state?.clientName) {
      setClientFilter(location.state.clientName);
    }
  }, [location.state]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'text-success bg-success/10 border-success/20';
      case 'Pending': return 'text-warning bg-warning/10 border-warning/20';
      case 'Partial': return 'text-warning bg-warning/10 border-warning/20';
      case 'Overdue': return 'text-error bg-error/10 border-error/20';
      case 'Draft': return 'text-secondary bg-surface-highlight border-border';
      case 'Sent': return 'text-accent bg-accent/10 border-accent/20';
      default: return 'text-secondary bg-surface-highlight border-border';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Paid': return <CheckCircle size={14} />;
      case 'Pending': return <Clock size={14} />;
      case 'Partial': return <Clock size={14} />;
      case 'Overdue': return <AlertTriangle size={14} />;
      case 'Draft': return <Edit size={14} />;
      case 'Sent': return <Send size={14} />;
      default: return <FileText size={14} />;
    }
  };

  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = invoices.filter(invoice => {
      const matchesSearch =
        invoice.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
      const matchesClient = clientFilter === 'all' || invoice.client === clientFilter;

      return matchesSearch && matchesStatus && matchesClient;
    });

    return filtered;
  }, [invoices, searchTerm, statusFilter, clientFilter]);

  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedInvoices.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedInvoices, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedInvoices.length / itemsPerPage);
  const uniqueClients = [...new Set(invoices.map(invoice => invoice.client))];

  const exportToExcel = () => {
      const exportData = filteredAndSortedInvoices.map(invoice => ({
        'Invoice Number': invoice.invoiceNumber,
        'Client': invoice.client,
        'Amount': invoice.amount,
        'Tax Amount': invoice.taxAmount,
        'Total Amount': invoice.totalAmount,
        'Date': invoice.date,
        'Due Date': invoice.dueDate,
        'Status': invoice.status,
        'Description': invoice.description,
        'Services': invoice.services.join(', '),
        'Payment Date': invoice.paymentDate || 'Not Paid'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
      XLSX.writeFile(wb, `invoices_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Invoices exported successfully', 'success');
    };

    const handleStatusUpdate = async (invoiceId, newStatus) => {
        try {
          await axios.put(`http://localhost:5000/api/invoices/${invoiceId}/status`, { status: newStatus });
          setInvoices(prev => prev.map(invoice =>
            invoice.id === invoiceId ? { ...invoice, status: newStatus } : invoice
          ));
          showToast(`Invoice status updated to ${newStatus}`, 'success');
        } catch (error) {
          console.error(error);
          showToast('Failed to update status', 'error');
        }
      };

      const handleDeleteInvoice = async (invoiceId) => {
        if (window.confirm('Are you sure you want to delete this invoice?')) {
          try {
            await axios.delete(`http://localhost:5000/api/invoices/${invoiceId}`);
            setInvoices(prev => prev.filter(invoice => invoice.id !== invoiceId));
            showToast('Invoice deleted successfully', 'success');
          } catch (error) {
            console.error(error);
            showToast('Failed to delete invoice', 'error');
          }
        }
      };

  const calculateTotals = () => {
    return filteredAndSortedInvoices.reduce((acc, invoice) => {
      const totalAmount = parseFloat(invoice.totalAmount) || 0;
      const paidAmount = parseFloat(invoice.paidAmount) || 0;
      const pendingAmount = totalAmount - paidAmount;

      acc.totalAmount += totalAmount;
      acc.paidAmount += paidAmount;
      acc.pendingAmount += pendingAmount;

      return acc;
    }, { totalAmount: 0, paidAmount: 0, pendingAmount: 0 });
  };

  const totals = calculateTotals();

  // Create Invoice Logic
  const handleAddItem = () => {
    setNewInvoice(prev => ({
      ...prev,
      items: [...prev.items, { serviceId: '', description: '', quantity: 1, rate: 0, gst: 18 }]
    }));
  };

  const handleRemoveItem = (index) => {
    setNewInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...newInvoice.items];
    updatedItems[index][field] = value;

    // Auto-fill if service selected
    if (field === 'serviceId') {
      const service = services.find(s => s.id === value);
      if (service) {
        updatedItems[index].description = service.service_name;
        updatedItems[index].rate = service.default_rate || 0;
        updatedItems[index].gst = service.gst_rate || 18;
      }
    }

    setNewInvoice(prev => ({ ...prev, items: updatedItems }));
  };

  const calculateInvoiceTotals = (items) => {
    let subtotal = 0;
    let totalTax = 0;

    items.forEach(item => {
      const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
      const tax = (amount * (parseFloat(item.gst) || 0)) / 100;
      subtotal += amount;
      totalTax += tax;
    });

    return { subtotal, totalTax, total: subtotal + totalTax };
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.clientId) {
      showToast('Please select a client', 'error');
      return;
    }
    if (newInvoice.items.length === 0) {
      showToast('Please add at least one item', 'error');
      return;
    }

    const { subtotal, totalTax, total } = calculateInvoiceTotals(newInvoice.items);

    try {
      const payload = {
        clientId: newInvoice.clientId,
        date: newInvoice.date,
        dueDate: newInvoice.dueDate,
        items: newInvoice.items,
        amount: subtotal,
        taxAmount: totalTax,
        totalAmount: total,
        description: newInvoice.notes,
        status: 'Pending'
      };

      await axios.post('http://localhost:5000/api/invoices', payload);
      showToast('Invoice created successfully', 'success');
      setShowCreateModal(false);
      setNewInvoice({ clientId: null, date: new Date().toISOString().split('T')[0], dueDate: '', items: [], notes: '' });
      fetchInvoices();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.error || 'Failed to create invoice', 'error');
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Invoice Management</h1>
          <p className="text-secondary text-sm">Track and manage client billing.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={exportToExcel} className="gap-2">
            <Download size={16} /> Export
          </Button>
          <Button variant="accent" onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus size={16} /> Create Invoice
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-border rounded-xl p-6">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-secondary text-xs font-mono uppercase">Total Billed</p>
                 <h3 className="text-2xl font-bold text-primary mt-1">₹{totals.totalAmount.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><DollarSign size={20} /></div>
           </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{delay: 0.1}} className="bg-surface border border-border rounded-xl p-6">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-secondary text-xs font-mono uppercase">Paid Amount</p>
                 <h3 className="text-2xl font-bold text-success mt-1">₹{totals.paidAmount.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-success/10 text-success rounded-lg"><CheckCircle size={20} /></div>
           </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{delay: 0.2}} className="bg-surface border border-border rounded-xl p-6">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-secondary text-xs font-mono uppercase">Pending</p>
                 <h3 className="text-2xl font-bold text-warning mt-1">₹{totals.pendingAmount.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-warning/10 text-warning rounded-lg"><Clock size={20} /></div>
           </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div>
              <label className="block text-xs font-mono text-secondary uppercase mb-2">Search</label>
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={14} />
                 <input
                   type="text"
                   placeholder="Search invoices..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent outline-none"
                 />
              </div>
           </div>
           <div>
              <label className="block text-xs font-mono text-secondary uppercase mb-2">Client</label>
              <Select
                className="text-sm"
                value={clientFilter === 'all' ? { value: 'all', label: 'All Clients' } : { value: clientFilter, label: clientFilter }}
                onChange={(opt) => setClientFilter(opt ? opt.value : 'all')}
                options={[{ value: 'all', label: 'All Clients' }, ...uniqueClients.map(client => ({ value: client, label: client }))]}
                styles={selectStyles}
              />
           </div>
           <div>
              <label className="block text-xs font-mono text-secondary uppercase mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent outline-none"
              >
                <option value="all">All Status</option>
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
              </select>
           </div>

           {(searchTerm || statusFilter !== 'all' || clientFilter !== 'all') && (
              <div className="flex items-end">
                 <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setClientFilter('all'); }} className="text-secondary hover:text-primary gap-2">
                    <X size={14} /> Clear
                 </Button>
              </div>
           )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-border bg-surface-highlight/30">
                     <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Invoice No</th>
                     <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Client</th>
                     <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Amount</th>
                     <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Date</th>
                     <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Status</th>
                     <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border">
                  {paginatedInvoices.length > 0 ? (
                     paginatedInvoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-surface-highlight/50 transition-colors group">
                           <td className="p-4 font-mono text-sm text-primary font-bold">{invoice.invoiceNumber}</td>
                           <td className="p-4">
                              <p className="text-sm font-bold text-primary">{invoice.client}</p>
                              <p className="text-xs text-secondary">{invoice.clientEmail}</p>
                           </td>
                           <td className="p-4">
                              <p className="text-sm font-bold text-primary">₹{invoice.totalAmount.toLocaleString()}</p>
                              <p className="text-xs text-secondary">Base: ₹{invoice.amount.toLocaleString()}</p>
                           </td>
                           <td className="p-4 text-xs text-secondary font-mono">
                              {new Date(invoice.date).toLocaleDateString()}
                           </td>
                           <td className="p-4">
                              <button
                                onClick={() => { setSelectedInvoice(invoice); setShowStatusModal(true); }}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold border transition-opacity hover:opacity-80 ${getStatusColor(invoice.status)}`}
                              >
                                 {getStatusIcon(invoice.status)}
                                 {invoice.status}
                              </button>
                           </td>
                           <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => { setSelectedInvoice(invoice); setShowViewModal(true); }} className="p-1.5 hover:bg-surface-highlight rounded text-secondary hover:text-accent"><Eye size={16} /></button>
                                 <button onClick={() => { if(invoice.status !== 'Paid') { setSelectedInvoice(invoice); setShowEditModal(true); } }} disabled={invoice.status === 'Paid'} className={`p-1.5 hover:bg-surface-highlight rounded ${invoice.status === 'Paid' ? 'text-border cursor-not-allowed' : 'text-secondary hover:text-accent'}`}><Edit size={16} /></button>
                                 <button onClick={() => { if(invoice.status !== 'Paid') { setSelectedInvoice(invoice); setShowPaymentModal(true); } }} disabled={invoice.status === 'Paid'} className={`p-1.5 hover:bg-surface-highlight rounded ${invoice.status === 'Paid' ? 'text-border cursor-not-allowed' : 'text-secondary hover:text-success'}`}><CreditCard size={16} /></button>
                                 <button onClick={() => { if(invoice.status !== 'Paid') handleDeleteInvoice(invoice.id); }} disabled={invoice.status === 'Paid'} className={`p-1.5 hover:bg-surface-highlight rounded ${invoice.status === 'Paid' ? 'text-border cursor-not-allowed' : 'text-secondary hover:text-error'}`}><Trash2 size={16} /></button>
                              </div>
                           </td>
                        </tr>
                     ))
                  ) : (
                     <tr>
                        <td colSpan={6} className="p-12 text-center text-secondary">No invoices found.</td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>

         {/* Pagination */}
         {totalPages > 1 && (
            <div className="p-4 border-t border-border flex items-center justify-between">
               <div className="flex items-center gap-2 text-xs text-secondary">
                  <span>Rows:</span>
                  <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-background border border-border rounded p-1 outline-none text-primary">
                     <option value={5}>5</option>
                     <option value={10}>10</option>
                     <option value={20}>20</option>
                  </select>
                  <span className="ml-2">{((currentPage-1)*itemsPerPage)+1}-{Math.min(currentPage*itemsPerPage, filteredAndSortedInvoices.length)} of {filteredAndSortedInvoices.length}</span>
               </div>
               <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft size={16} /></Button>
                  <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight size={16} /></Button>
               </div>
            </div>
         )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
           <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-surface border border-border rounded-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-primary">Create Invoice</h2>
                    <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}><X size={20} /></Button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                       <label className="block text-xs font-mono text-secondary uppercase mb-2">Client</label>
                       <Select
                         className="text-sm"
                         options={clients.map(c => ({ value: c.id, label: c.business_name || c.client_name }))}
                         onChange={(opt) => setNewInvoice({ ...newInvoice, clientId: opt?.value })}
                         styles={selectStyles}
                         placeholder="Select Client..."
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-xs font-mono text-secondary uppercase mb-2">Invoice Date</label>
                          <input type="date" className="w-full bg-background border border-border rounded-lg p-2 text-primary text-sm outline-none focus:border-accent"
                             value={newInvoice.date} onChange={(e) => setNewInvoice({ ...newInvoice, date: e.target.value })} />
                       </div>
                       <div>
                          <label className="block text-xs font-mono text-secondary uppercase mb-2">Due Date</label>
                          <input type="date" className="w-full bg-background border border-border rounded-lg p-2 text-primary text-sm outline-none focus:border-accent"
                             value={newInvoice.dueDate} onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })} />
                       </div>
                    </div>
                 </div>

                 <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                       <label className="block text-xs font-mono text-secondary uppercase">Items</label>
                       <Button variant="ghost" size="sm" onClick={handleAddItem} className="text-accent gap-1 text-xs"><Plus size={14} /> Add Item</Button>
                    </div>
                    <div className="bg-background border border-border rounded-lg overflow-hidden">
                       <table className="w-full text-left">
                          <thead className="bg-surface-highlight/30 text-xs font-mono text-secondary uppercase">
                             <tr>
                                <th className="p-3">Service / Description</th>
                                <th className="p-3 w-24">Qty</th>
                                <th className="p-3 w-32">Rate</th>
                                <th className="p-3 w-24">GST %</th>
                                <th className="p-3 w-32 text-right">Amount</th>
                                <th className="p-3 w-10"></th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                             {newInvoice.items.length > 0 ? newInvoice.items.map((item, i) => (
                                <tr key={i}>
                                   <td className="p-2">
                                      <select className="w-full bg-surface border border-border rounded p-1 text-xs text-primary mb-1"
                                         value={item.serviceId} onChange={(e) => handleItemChange(i, 'serviceId', Number(e.target.value))}>
                                         <option value="">Select Service...</option>
                                         {services.map(s => <option key={s.id} value={s.id}>{s.service_name}</option>)}
                                      </select>
                                      <input type="text" placeholder="Description" className="w-full bg-transparent border-b border-border text-xs text-primary outline-none focus:border-accent"
                                         value={item.description} onChange={(e) => handleItemChange(i, 'description', e.target.value)} />
                                   </td>
                                   <td className="p-2">
                                      <input type="number" min="1" className="w-full bg-surface border border-border rounded p-1 text-xs text-primary"
                                         value={item.quantity} onChange={(e) => handleItemChange(i, 'quantity', e.target.value)} />
                                   </td>
                                   <td className="p-2">
                                      <input type="number" min="0" className="w-full bg-surface border border-border rounded p-1 text-xs text-primary"
                                         value={item.rate} onChange={(e) => handleItemChange(i, 'rate', e.target.value)} />
                                   </td>
                                   <td className="p-2">
                                      <input type="number" min="0" className="w-full bg-surface border border-border rounded p-1 text-xs text-primary"
                                         value={item.gst} onChange={(e) => handleItemChange(i, 'gst', e.target.value)} />
                                   </td>
                                   <td className="p-2 text-right text-sm font-mono text-primary">
                                      ₹{((item.quantity * item.rate) * (1 + item.gst/100)).toFixed(2)}
                                   </td>
                                   <td className="p-2 text-center">
                                      <button onClick={() => handleRemoveItem(i)} className="text-secondary hover:text-error"><MinusCircle size={16} /></button>
                                   </td>
                                </tr>
                             )) : (
                                <tr><td colSpan={6} className="p-4 text-center text-xs text-secondary">No items added</td></tr>
                             )}
                          </tbody>
                       </table>
                    </div>
                 </div>

                 <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div className="w-full md:w-1/2">
                       <label className="block text-xs font-mono text-secondary uppercase mb-2">Notes</label>
                       <textarea className="w-full bg-background border border-border rounded-lg p-2 text-primary text-sm h-24 outline-none focus:border-accent resize-none"
                          placeholder="Payment terms, notes..."
                          value={newInvoice.notes} onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                       ></textarea>
                    </div>
                    <div className="w-full md:w-1/3 bg-background border border-border rounded-lg p-4 space-y-2">
                       <div className="flex justify-between text-sm text-secondary">
                          <span>Subtotal</span>
                          <span>₹{calculateInvoiceTotals(newInvoice.items).subtotal.toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between text-sm text-secondary">
                          <span>Tax (GST)</span>
                          <span>₹{calculateInvoiceTotals(newInvoice.items).totalTax.toFixed(2)}</span>
                       </div>
                       <div className="h-px bg-border my-2"></div>
                       <div className="flex justify-between text-lg font-bold text-primary">
                          <span>Total</span>
                          <span>₹{calculateInvoiceTotals(newInvoice.items).total.toFixed(2)}</span>
                       </div>
                    </div>
                 </div>

                 <div className="mt-8 flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                    <Button variant="accent" onClick={handleCreateInvoice}>Create Invoice</Button>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {showViewModal && selectedInvoice && (
           <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="bg-surface border border-border rounded-xl w-full max-w-lg p-6">
                 <h2 className="text-xl font-bold text-primary mb-4">Invoice {selectedInvoice.invoiceNumber}</h2>
                 <p className="text-secondary text-sm mb-4">Client: {selectedInvoice.client}</p>
                 <p className="text-secondary text-sm mb-4">Amount: ₹{selectedInvoice.totalAmount}</p>
                 <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setShowViewModal(false)}>Close</Button>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

    </div>
  );
}

export default Invoices;
