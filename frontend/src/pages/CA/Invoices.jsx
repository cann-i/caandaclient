import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../../api/axios';
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
  MinusCircle,
  Calendar,
  User,
  Mail,
  Receipt
} from 'lucide-react';
import Button from '../../components/ui/Button';
import { API_BASE_URL } from '../../config';

function Invoices({ showToast }) {
  const location = useLocation();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Data for forms
  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);

  // Form States
  const [invoiceForm, setInvoiceForm] = useState({
    clientId: null,
    clientName: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    items: [],
    notes: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'Bank Transfer',
    transactionId: '',
    notes: ''
  });

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowCreateModal(false);
        setShowViewModal(false);
        setShowPaymentModal(false);
        setShowStatusModal(false);
        setShowEditModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/invoices');
      setInvoices(response.data);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      showToast?.('Failed to fetch invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Fetch clients and services when needed
  useEffect(() => {
    if (showCreateModal || showEditModal) {
      const fetchData = async () => {
        try {
          const [clientsRes, servicesRes] = await Promise.all([
            axios.get('/clients'),
            axios.get('/services')
          ]);
          setClients(clientsRes.data);
          setServices(servicesRes.data);
        } catch (error) {
          console.error("Error fetching dependencies:", error);
          showToast?.('Failed to load form data', 'error');
        }
      };
      fetchData();
    }
  }, [showCreateModal, showEditModal]);

  useEffect(() => {
    if (location.state?.clientName) {
      setClientFilter(location.state.clientName);
    }
  }, [location.state]);

  // View Modal Logic - Fetch details
  useEffect(() => {
    if ((showViewModal || showEditModal) && selectedInvoice) {
      const fetchDetails = async () => {
        try {
          const res = await axios.get(`${API_BASE_URL}/invoices/${selectedInvoice.id}`);
          const fullInvoice = res.data;

          setSelectedInvoice(fullInvoice); // Update with full details (items, payments)

          if (showEditModal) {
            // Populate Edit Form
            setInvoiceForm({
              clientId: fullInvoice.clientId || clients.find(c => c.business_name === fullInvoice.client)?.id,
              clientName: fullInvoice.client,
              date: fullInvoice.date,
              dueDate: fullInvoice.dueDate,
              items: fullInvoice.items.map(item => ({
                serviceId: item.service_id,
                description: item.description,
                quantity: item.quantity,
                rate: item.rate,
                gst: item.gst_rate
              })),
              notes: fullInvoice.description
            });
          }
        } catch (error) {
          console.error("Error fetching invoice details:", error);
          showToast?.('Failed to load invoice details', 'error');
        }
      };
      fetchDetails();
    }
  }, [showViewModal, showEditModal, selectedInvoice?.id]);

  // Payment Modal Init
  useEffect(() => {
      if (showPaymentModal && selectedInvoice) {
          setPaymentForm({
              amount: selectedInvoice.balanceAmount || 0,
              date: new Date().toISOString().split('T')[0],
              method: 'Bank Transfer',
              transactionId: '',
              notes: ''
          });
      }
  }, [showPaymentModal, selectedInvoice]);


  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'Pending': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'Partial': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'Overdue': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      case 'Draft': return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
      case 'Sent': return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
      default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
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
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());

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
        'Payment Date': invoice.paymentDate || 'Not Paid'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
      XLSX.writeFile(wb, `invoices_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast?.('Invoices exported successfully', 'success');
    };

    const handleStatusUpdate = async (newStatus) => {
        if (!selectedInvoice) return;
        try {
          await axios.put(`${API_BASE_URL}/invoices/${selectedInvoice.id}/status`, { status: newStatus });
          setInvoices(prev => prev.map(invoice =>
            invoice.id === selectedInvoice.id ? { ...invoice, status: newStatus } : invoice
          ));
          if (selectedInvoice) setSelectedInvoice(prev => ({...prev, status: newStatus}));
          showToast?.(`Invoice status updated to ${newStatus}`, 'success');
          setShowStatusModal(false);
        } catch (error) {
          console.error(error);
          showToast?.('Failed to update status', 'error');
        }
      };

      const handleDeleteInvoice = async (invoiceId) => {
        if (window.confirm('Are you sure you want to delete this invoice?')) {
          try {
            await axios.delete(`${API_BASE_URL}/invoices/${invoiceId}`);
            setInvoices(prev => prev.filter(invoice => invoice.id !== invoiceId));
            showToast?.('Invoice deleted successfully', 'success');
          } catch (error) {
            console.error(error);
            showToast?.('Failed to delete invoice', 'error');
          }
        }
      };

  const totals = useMemo(() => {
    return filteredAndSortedInvoices.reduce((acc, invoice) => {
      const totalAmount = parseFloat(invoice.totalAmount) || 0;
      const paidAmount = parseFloat(invoice.paidAmount) || 0;
      const pendingAmount = totalAmount - paidAmount;

      acc.totalAmount += totalAmount;
      acc.paidAmount += paidAmount;
      acc.pendingAmount += pendingAmount;

      return acc;
    }, { totalAmount: 0, paidAmount: 0, pendingAmount: 0 });
  }, [filteredAndSortedInvoices]);


  // --- FORM HANDLERS ---

  const handleAddItem = () => {
    setInvoiceForm(prev => ({
      ...prev,
      items: [...prev.items, { serviceId: '', description: '', quantity: 1, rate: 0, gst: 18 }]
    }));
  };

  const handleRemoveItem = (index) => {
    setInvoiceForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...invoiceForm.items];
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

    setInvoiceForm(prev => ({ ...prev, items: updatedItems }));
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
    if (!invoiceForm.clientId) {
      showToast?.('Please select a client', 'error');
      return;
    }
    if (invoiceForm.items.length === 0) {
      showToast?.('Please add at least one item', 'error');
      return;
    }

    const { subtotal, totalTax, total } = calculateInvoiceTotals(invoiceForm.items);

    try {
      const payload = {
        clientId: invoiceForm.clientId,
        date: invoiceForm.date,
        dueDate: invoiceForm.dueDate,
        items: invoiceForm.items,
        amount: subtotal,
        taxAmount: totalTax,
        totalAmount: total,
        description: invoiceForm.notes,
        status: 'Pending'
      };

      await axios.post('/invoices', payload);
      showToast?.('Invoice created successfully', 'success');
      setShowCreateModal(false);
      setInvoiceForm({ clientId: null, date: new Date().toISOString().split('T')[0], dueDate: '', items: [], notes: '' });
      fetchInvoices();
    } catch (error) {
      console.error(error);
      showToast?.(error.response?.data?.error || 'Failed to create invoice', 'error');
    }
  };

  const handleUpdateInvoice = async () => {
      if (!invoiceForm.clientId) {
        showToast?.('Please select a client', 'error');
        return;
      }
      const { subtotal, totalTax, total } = calculateInvoiceTotals(invoiceForm.items);
      try {
        const payload = {
            clientId: invoiceForm.clientId,
            client: invoiceForm.clientName,
            date: invoiceForm.date,
            dueDate: invoiceForm.dueDate,
            items: invoiceForm.items,
            amount: subtotal,
            taxAmount: totalTax,
            totalAmount: total,
            description: invoiceForm.notes,
            notes: invoiceForm.notes
        };
        await axios.put(`${API_BASE_URL}/invoices/${selectedInvoice.id}`, payload);
        showToast?.('Invoice updated successfully', 'success');
        setShowEditModal(false);
        fetchInvoices();
      } catch (error) {
        console.error(error);
        showToast?.('Failed to update invoice', 'error');
      }
  };

  const handleAddPayment = async () => {
      if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
          showToast?.('Please enter a valid amount', 'error');
          return;
      }
      try {
          await axios.post(`${API_BASE_URL}/invoices/${selectedInvoice.id}/payments`, {
            paymentAmount: paymentForm.amount,
            paymentDate: paymentForm.date,
            paymentMethod: paymentForm.method,
            transactionId: paymentForm.transactionId,
            notes: paymentForm.notes
          });
          showToast?.('Payment recorded successfully', 'success');
          setShowPaymentModal(false);
          fetchInvoices();
      } catch (error) {
          console.error(error);
          showToast?.(error.response?.data?.error || 'Failed to record payment', 'error');
      }
  };


  // Select styles
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: '#18181b', // zinc-900
      borderColor: state.isFocused ? '#3b82f6' : '#27272a', // zinc-800
      color: '#e4e4e7', // zinc-200
      padding: '2px',
      boxShadow: 'none',
      '&:hover': { borderColor: '#3f3f46' }, // zinc-700
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: '#18181b',
      border: '1px solid #27272a',
      zIndex: 50
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? '#27272a' : '#18181b',
      color: '#e4e4e7',
      cursor: 'pointer'
    }),
    singleValue: (base) => ({
      ...base,
      color: '#e4e4e7',
    }),
    input: (base) => ({
        ...base,
        color: '#e4e4e7',
      }),
    placeholder: (base) => ({
          ...base,
          color: '#a1a1aa', // zinc-400
      })
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Invoice Management</h1>
          <p className="text-zinc-400 text-sm">Track and manage client billing.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={exportToExcel} className="gap-2">
            <Download size={16} /> Export
          </Button>
          <Button variant="accent" onClick={() => {
              setInvoiceForm({ clientId: null, date: new Date().toISOString().split('T')[0], dueDate: '', items: [], notes: '' });
              setShowCreateModal(true);
          }} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white border-none">
            <Plus size={16} /> Create Invoice
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-zinc-500 text-xs font-mono uppercase">Total Billed</p>
                 <h3 className="text-2xl font-bold text-white mt-1">₹{totals.totalAmount.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><DollarSign size={20} /></div>
           </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{delay: 0.1}} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-zinc-500 text-xs font-mono uppercase">Paid Amount</p>
                 <h3 className="text-2xl font-bold text-emerald-500 mt-1">₹{totals.paidAmount.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><CheckCircle size={20} /></div>
           </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{delay: 0.2}} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-zinc-500 text-xs font-mono uppercase">Pending</p>
                 <h3 className="text-2xl font-bold text-amber-500 mt-1">₹{totals.pendingAmount.toLocaleString()}</h3>
              </div>
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg"><Clock size={20} /></div>
           </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div>
              <label className="block text-xs font-mono text-zinc-500 uppercase mb-2">Search</label>
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
                 <input
                   type="text"
                   placeholder="Search invoices..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-9 pr-3 py-2 bg-black border border-zinc-800 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                 />
              </div>
           </div>
           <div>
              <label className="block text-xs font-mono text-zinc-500 uppercase mb-2">Client</label>
              <Select
                className="text-sm"
                value={clientFilter === 'all' ? { value: 'all', label: 'All Clients' } : { value: clientFilter, label: clientFilter }}
                onChange={(opt) => setClientFilter(opt ? opt.value : 'all')}
                options={[{ value: 'all', label: 'All Clients' }, ...uniqueClients.map(client => ({ value: client, label: client }))]}
                styles={selectStyles}
              />
           </div>
           <div>
              <label className="block text-xs font-mono text-zinc-500 uppercase mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
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
                 <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setClientFilter('all'); }} className="text-zinc-400 hover:text-white gap-2">
                    <X size={14} /> Clear
                 </Button>
              </div>
           )}
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-800/50">
                     <th className="p-4 text-xs font-mono text-zinc-500 uppercase font-medium">Invoice No</th>
                     <th className="p-4 text-xs font-mono text-zinc-500 uppercase font-medium">Client</th>
                     <th className="p-4 text-xs font-mono text-zinc-500 uppercase font-medium">Amount</th>
                     <th className="p-4 text-xs font-mono text-zinc-500 uppercase font-medium">Date</th>
                     <th className="p-4 text-xs font-mono text-zinc-500 uppercase font-medium">Status</th>
                     <th className="p-4 text-xs font-mono text-zinc-500 uppercase font-medium text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-zinc-800">
                  {paginatedInvoices.length > 0 ? (
                     paginatedInvoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-zinc-800/30 transition-colors group">
                           <td className="p-4 font-mono text-sm text-white font-bold">{invoice.invoiceNumber}</td>
                           <td className="p-4">
                              <p className="text-sm font-bold text-white">{invoice.client}</p>
                              <p className="text-xs text-zinc-500">{invoice.clientEmail}</p>
                           </td>
                           <td className="p-4">
                              <p className="text-sm font-bold text-white">₹{parseFloat(invoice.totalAmount).toLocaleString()}</p>
                              <p className="text-xs text-zinc-500">Base: ₹{parseFloat(invoice.amount).toLocaleString()}</p>
                           </td>
                           <td className="p-4 text-xs text-zinc-500 font-mono">
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
                                 <button title="View" onClick={() => { setSelectedInvoice(invoice); setShowViewModal(true); }} className="p-1.5 hover:bg-zinc-800 rounded text-zinc-400 hover:text-blue-400"><Eye size={16} /></button>
                                 <button title="Edit" onClick={() => { if(invoice.status !== 'Paid') { setSelectedInvoice(invoice); setShowEditModal(true); } }} disabled={invoice.status === 'Paid'} className={`p-1.5 hover:bg-zinc-800 rounded ${invoice.status === 'Paid' ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-white'}`}><Edit size={16} /></button>
                                 <button title="Add Payment" onClick={() => { if(invoice.status !== 'Paid') { setSelectedInvoice(invoice); setShowPaymentModal(true); } }} disabled={invoice.status === 'Paid'} className={`p-1.5 hover:bg-zinc-800 rounded ${invoice.status === 'Paid' ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-emerald-400'}`}><CreditCard size={16} /></button>
                                 <button title="Delete" onClick={() => { if(invoice.status !== 'Paid') handleDeleteInvoice(invoice.id); }} disabled={invoice.status === 'Paid'} className={`p-1.5 hover:bg-zinc-800 rounded ${invoice.status === 'Paid' ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-400 hover:text-rose-400'}`}><Trash2 size={16} /></button>
                              </div>
                           </td>
                        </tr>
                     ))
                  ) : (
                     <tr>
                        <td colSpan={6} className="p-12 text-center text-zinc-500">No invoices found.</td>
                     </tr>
                  )}
               </tbody>
            </table>
         </div>

         {/* Pagination */}
         {totalPages > 1 && (
            <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
               <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <span>Rows:</span>
                  <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-black border border-zinc-800 rounded p-1 outline-none text-white">
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

      {/* --- MODALS --- */}

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {(showCreateModal || showEditModal) && (
           <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">{showEditModal ? 'Edit Invoice' : 'Create Invoice'}</h2>
                    <Button variant="ghost" size="sm" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}><X size={20} /></Button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                       <label className="block text-xs font-mono text-zinc-500 uppercase mb-2">Client *</label>
                       {showEditModal ? (
                           // In Edit mode, client is read-only or selectable. Let's make it selectable but prefilled.
                           <Select
                             className="text-sm"
                             value={clients.find(c => c.id === invoiceForm.clientId) ?
                                    { value: invoiceForm.clientId, label: clients.find(c => c.id === invoiceForm.clientId).business_name } :
                                    { value: invoiceForm.clientId, label: invoiceForm.clientName } // Fallback
                                   }
                             options={clients.map(c => ({ value: c.id, label: c.business_name || c.client_name }))}
                             onChange={(opt) => setInvoiceForm({ ...invoiceForm, clientId: opt?.value, clientName: opt?.label })}
                             styles={selectStyles}
                           />
                       ) : (
                           <Select
                             className="text-sm"
                             options={clients.map(c => ({ value: c.id, label: c.business_name || c.client_name }))}
                             onChange={(opt) => setInvoiceForm({ ...invoiceForm, clientId: opt?.value })}
                             styles={selectStyles}
                             placeholder="Select Client..."
                           />
                       )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-xs font-mono text-zinc-500 uppercase mb-2">Invoice Date *</label>
                          <input type="date" className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-white text-sm outline-none focus:border-blue-500"
                             value={invoiceForm.date} onChange={(e) => setInvoiceForm({ ...invoiceForm, date: e.target.value })} />
                       </div>
                       <div>
                          <label className="block text-xs font-mono text-zinc-500 uppercase mb-2">Due Date *</label>
                          <input type="date" className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-white text-sm outline-none focus:border-blue-500"
                             value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} />
                       </div>
                    </div>
                 </div>

                 <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                       <label className="block text-xs font-mono text-zinc-500 uppercase">Invoice Items</label>
                       <Button variant="ghost" size="sm" onClick={handleAddItem} className="text-blue-500 gap-1 text-xs hover:text-blue-400 hover:bg-blue-500/10"><Plus size={14} /> Add Item</Button>
                    </div>
                    <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden">
                       <table className="w-full text-left">
                          <thead className="bg-zinc-800/30 text-xs font-mono text-zinc-500 uppercase">
                             <tr>
                                <th className="p-3">Service / Description</th>
                                <th className="p-3 w-24">Qty</th>
                                <th className="p-3 w-32">Rate (₹)</th>
                                <th className="p-3 w-24">GST %</th>
                                <th className="p-3 w-32 text-right">Total</th>
                                <th className="p-3 w-10"></th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800">
                             {invoiceForm.items.length > 0 ? invoiceForm.items.map((item, i) => (
                                <tr key={i}>
                                   <td className="p-2">
                                      <select className="w-full bg-zinc-900 border border-zinc-800 rounded p-1 text-xs text-white mb-1"
                                         value={item.serviceId} onChange={(e) => handleItemChange(i, 'serviceId', Number(e.target.value))}>
                                         <option value="">Select Service...</option>
                                         {services.map(s => <option key={s.id} value={s.id}>{s.service_name}</option>)}
                                      </select>
                                      <input type="text" placeholder="Description" className="w-full bg-transparent border-b border-zinc-800 text-xs text-white outline-none focus:border-blue-500"
                                         value={item.description} onChange={(e) => handleItemChange(i, 'description', e.target.value)} />
                                   </td>
                                   <td className="p-2">
                                      <input type="number" min="1" className="w-full bg-zinc-900 border border-zinc-800 rounded p-1 text-xs text-white"
                                         value={item.quantity} onChange={(e) => handleItemChange(i, 'quantity', e.target.value)} />
                                   </td>
                                   <td className="p-2">
                                      <input type="number" min="0" className="w-full bg-zinc-900 border border-zinc-800 rounded p-1 text-xs text-white"
                                         value={item.rate} onChange={(e) => handleItemChange(i, 'rate', e.target.value)} />
                                   </td>
                                   <td className="p-2">
                                      <select className="w-full bg-zinc-900 border border-zinc-800 rounded p-1 text-xs text-white"
                                        value={item.gst} onChange={(e) => handleItemChange(i, 'gst', e.target.value)}>
                                        <option value="0">0%</option>
                                        <option value="5">5%</option>
                                        <option value="12">12%</option>
                                        <option value="18">18%</option>
                                        <option value="28">28%</option>
                                      </select>
                                   </td>
                                   <td className="p-2 text-right text-sm font-mono text-white">
                                      ₹{((item.quantity * item.rate) * (1 + item.gst/100)).toFixed(2)}
                                   </td>
                                   <td className="p-2 text-center">
                                      <button onClick={() => handleRemoveItem(i)} className="text-zinc-500 hover:text-rose-500"><Trash2 size={16} /></button>
                                   </td>
                                </tr>
                             )) : (
                                <tr><td colSpan={6} className="p-4 text-center text-xs text-zinc-500">No items added</td></tr>
                             )}
                          </tbody>
                       </table>
                    </div>
                 </div>

                 <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div className="w-full md:w-1/2">
                       <label className="block text-xs font-mono text-zinc-500 uppercase mb-2">Notes</label>
                       <textarea className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-white text-sm h-24 outline-none focus:border-blue-500 resize-none"
                          placeholder="Additional notes or terms"
                          value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                       ></textarea>
                    </div>
                    <div className="w-full md:w-1/3 bg-black border border-zinc-800 rounded-lg p-4 space-y-2">
                       <div className="flex justify-between text-sm text-zinc-400">
                          <span>Subtotal:</span>
                          <span>₹{calculateInvoiceTotals(invoiceForm.items).subtotal.toFixed(2)}</span>
                       </div>
                       <div className="flex justify-between text-sm text-zinc-400">
                          <span>Total GST:</span>
                          <span>₹{calculateInvoiceTotals(invoiceForm.items).totalTax.toFixed(2)}</span>
                       </div>
                       <div className="h-px bg-zinc-800 my-2"></div>
                       <div className="flex justify-between text-lg font-bold text-white">
                          <span>Total Amount:</span>
                          <span className="text-blue-500">₹{calculateInvoiceTotals(invoiceForm.items).total.toFixed(2)}</span>
                       </div>
                    </div>
                 </div>

                 <div className="mt-8 flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}>Cancel</Button>
                    {showEditModal ? (
                         <button onClick={handleUpdateInvoice} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">Update Invoice</button>
                    ) : (
                         <Button variant="accent" onClick={handleCreateInvoice}>Create Invoice</Button>
                    )}
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* View Modal (Detailed) */}
      <AnimatePresence>
        {showViewModal && selectedInvoice && (
           <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto overflow-hidden">
                 {/* Header */}
                 <div className="bg-purple-600/20 p-6 flex justify-between items-start border-b border-purple-500/20">
                    <div className="text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <FileText size={20} className="text-purple-400" />
                            <h2 className="text-xl font-bold text-purple-100">{selectedInvoice.invoiceNumber}</h2>
                        </div>
                        <p className="text-purple-300 text-sm">Invoice Details</p>
                    </div>
                    <button onClick={() => setShowViewModal(false)} className="text-zinc-400 hover:text-white"><X size={24} /></button>
                 </div>

                 <div className="p-6 space-y-6">
                     {/* Info Grid */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         <div className="bg-black/50 p-4 rounded-lg border border-zinc-800">
                             <p className="text-xs font-bold text-zinc-500 uppercase mb-1">Invoice Number</p>
                             <p className="text-zinc-200 font-bold">{selectedInvoice.invoiceNumber}</p>
                             <p className="text-xs font-bold text-zinc-500 uppercase mt-4 mb-1">Invoice Date</p>
                             <p className="text-zinc-200">{new Date(selectedInvoice.date).toLocaleDateString()}</p>
                         </div>
                         <div className="bg-black/50 p-4 rounded-lg border border-zinc-800">
                             <p className="text-xs font-bold text-zinc-500 uppercase mb-1">Client Name</p>
                             <p className="text-zinc-200 font-bold">{selectedInvoice.client}</p>
                             <p className="text-xs font-bold text-zinc-500 uppercase mt-4 mb-1">Due Date</p>
                             <p className="text-zinc-200">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
                         </div>
                         <div className="bg-black/50 p-4 rounded-lg border border-zinc-800">
                             <p className="text-xs font-bold text-zinc-500 uppercase mb-1">Status</p>
                             <div className="mb-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    selectedInvoice.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                    selectedInvoice.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                    selectedInvoice.status === 'Overdue' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                    'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                                }`}>{selectedInvoice.status}</span>
                             </div>
                             <p className="text-xs font-bold text-zinc-500 uppercase mb-1">Client Email</p>
                             <p className="text-zinc-200">{selectedInvoice.clientEmail || 'N/A'}</p>
                         </div>
                     </div>

                     {/* Items Table */}
                     <div>
                         <h3 className="text-sm font-bold text-zinc-400 mb-3 uppercase">Invoice Items</h3>
                         <div className="bg-black/30 border border-zinc-800 rounded-lg overflow-hidden">
                             <table className="w-full text-left">
                                 <thead className="bg-zinc-800/50 border-b border-zinc-800">
                                     <tr>
                                         <th className="p-3 text-xs font-bold text-zinc-500 uppercase">Service</th>
                                         <th className="p-3 text-xs font-bold text-zinc-500 uppercase">Description</th>
                                         <th className="p-3 text-xs font-bold text-zinc-500 uppercase">Qty</th>
                                         <th className="p-3 text-xs font-bold text-zinc-500 uppercase">Rate</th>
                                         <th className="p-3 text-xs font-bold text-zinc-500 uppercase">GST %</th>
                                         <th className="p-3 text-xs font-bold text-zinc-500 uppercase text-right">Amount</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-zinc-800 text-zinc-300 text-sm">
                                     {selectedInvoice.items && selectedInvoice.items.map((item, i) => (
                                         <tr key={i}>
                                             <td className="p-3 font-medium text-white">{item.service || 'Custom Service'}</td>
                                             <td className="p-3 text-zinc-400">{item.description}</td>
                                             <td className="p-3">{item.quantity}</td>
                                             <td className="p-3">₹{parseFloat(item.rate).toLocaleString()}</td>
                                             <td className="p-3">{item.gst_rate}%</td>
                                             <td className="p-3 text-right font-bold text-white">₹{((item.quantity * item.rate) * (1 + item.gst_rate/100)).toLocaleString()}</td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>
                     </div>

                     {/* Totals & Breakdown */}
                     <div className="flex flex-col md:flex-row gap-6">
                         <div className="w-full md:w-1/2 bg-blue-500/5 p-4 rounded-lg border border-blue-500/10">
                             <h4 className="text-xs font-bold text-zinc-500 uppercase mb-4">Amount Breakdown</h4>
                             <div className="space-y-2 text-sm">
                                 <div className="flex justify-between text-zinc-300">
                                     <span>Subtotal:</span>
                                     <span className="font-medium">₹{parseFloat(selectedInvoice.amount).toLocaleString()}</span>
                                 </div>
                                 <div className="flex justify-between text-zinc-300">
                                     <span>Tax Amount:</span>
                                     <span className="font-medium">₹{parseFloat(selectedInvoice.taxAmount).toLocaleString()}</span>
                                 </div>
                                 <div className="h-px bg-blue-500/20 my-2"></div>
                                 <div className="flex justify-between text-lg font-bold text-blue-400">
                                     <span>Total Amount:</span>
                                     <span>₹{parseFloat(selectedInvoice.totalAmount).toLocaleString()}</span>
                                 </div>
                             </div>
                         </div>
                         <div className="w-full md:w-1/2 bg-emerald-500/5 p-4 rounded-lg border border-emerald-500/10">
                             <h4 className="text-xs font-bold text-zinc-500 uppercase mb-4">Payment Status</h4>
                             <div className="space-y-2 text-sm">
                                 <div className="flex justify-between text-zinc-300">
                                     <span>Paid Amount:</span>
                                     <span className="font-medium text-emerald-400">₹{parseFloat(selectedInvoice.paidAmount || 0).toLocaleString()}</span>
                                 </div>
                                 <div className="flex justify-between text-zinc-300">
                                     <span>Balance:</span>
                                     <span className="font-bold text-rose-400">₹{parseFloat(selectedInvoice.balanceAmount || 0).toLocaleString()}</span>
                                 </div>
                             </div>
                         </div>
                     </div>

                     {/* Payment History */}
                     <div>
                         <div className="flex justify-between items-center mb-3">
                             <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-400 uppercase">
                                 <Clock size={16} /> Payment History
                             </h3>
                             <span className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-500">{selectedInvoice.payments ? selectedInvoice.payments.length : 0} Payments</span>
                         </div>
                         <div className="bg-black/20 border border-zinc-800 border-dashed rounded-lg p-6 flex flex-col items-center justify-center min-h-[100px]">
                             {selectedInvoice.payments && selectedInvoice.payments.length > 0 ? (
                                 <table className="w-full text-left text-sm">
                                     <thead>
                                         <tr className="text-zinc-500 text-xs uppercase">
                                             <th className="pb-2">Date</th>
                                             <th className="pb-2">Method</th>
                                             <th className="pb-2">Ref ID</th>
                                             <th className="pb-2 text-right">Amount</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-zinc-800/50">
                                         {selectedInvoice.payments.map((pay, i) => (
                                             <tr key={i} className="text-zinc-300">
                                                 <td className="py-2">{new Date(pay.payment_date).toLocaleDateString()}</td>
                                                 <td className="py-2">{pay.payment_mode}</td>
                                                 <td className="py-2 font-mono text-xs text-zinc-500">{pay.transaction_id || '-'}</td>
                                                 <td className="py-2 text-right font-medium text-emerald-400">₹{parseFloat(pay.amount).toLocaleString()}</td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             ) : (
                                 <div className="text-center">
                                     <Receipt size={32} className="mx-auto text-zinc-700 mb-2" />
                                     <p className="text-zinc-600 italic text-sm">No payment history recorded for this invoice yet.</p>
                                 </div>
                             )}
                         </div>
                     </div>

                     <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-zinc-800">
                         {selectedInvoice.status !== 'Paid' && (
                            <Button variant="secondary" className="bg-blue-600/10 text-blue-400 hover:bg-blue-600/20 border-blue-600/20" onClick={() => { setShowViewModal(false); setShowEditModal(true); }}>
                                <Edit size={16} className="mr-2" /> Edit Invoice
                            </Button>
                         )}
                         <Button variant="ghost" onClick={() => setShowViewModal(false)} className="hover:bg-zinc-800 text-zinc-400 hover:text-white">
                             <X size={16} className="mr-2" /> Close
                         </Button>
                     </div>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
          {showPaymentModal && selectedInvoice && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden">
                   <div className="bg-emerald-600/20 p-4 flex justify-between items-center text-white border-b border-emerald-500/20">
                       <div className="flex items-center gap-2">
                           <CreditCard size={20} className="text-emerald-400" />
                           <div>
                               <h2 className="text-lg font-bold text-emerald-100">Add Payment</h2>
                               <p className="text-emerald-300/70 text-xs">Record payment for invoice</p>
                           </div>
                       </div>
                       <button onClick={() => setShowPaymentModal(false)} className="text-zinc-400 hover:text-white"><X size={20} /></button>
                   </div>

                   <div className="p-6">
                       {/* Invoice Summary */}
                       <div className="bg-emerald-500/5 rounded-lg p-4 mb-6 border border-emerald-500/10 flex justify-between items-center">
                           <div>
                               <p className="text-xs font-bold text-zinc-500 uppercase">Invoice ID</p>
                               <p className="text-zinc-200 font-bold">{selectedInvoice.invoiceNumber}</p>
                           </div>
                           <div className="text-right">
                               <p className="text-xs font-bold text-zinc-500 uppercase">Balance Amount</p>
                               <p className="text-emerald-400 font-bold text-lg">₹{parseFloat(selectedInvoice.balanceAmount).toLocaleString()}</p>
                           </div>
                       </div>

                       <div className="space-y-4">
                           <div className="flex items-center gap-2 text-zinc-300 font-bold text-sm mb-2">
                               <DollarSign size={16} className="text-emerald-500" /> Payment Details
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                               <div>
                                   <label className="block text-xs font-bold text-zinc-500 mb-1">Payment Amount *</label>
                                   <input type="number" className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none focus:border-emerald-500"
                                      placeholder="Enter amount"
                                      value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})} />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-zinc-500 mb-1">Payment Date *</label>
                                   <input type="date" className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none focus:border-emerald-500"
                                      value={paymentForm.date} onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})} />
                               </div>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                               <div>
                                   <label className="block text-xs font-bold text-zinc-500 mb-1">Payment Method</label>
                                   <select className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none focus:border-emerald-500"
                                      value={paymentForm.method} onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})}>
                                      <option>Bank Transfer</option>
                                      <option>Cash</option>
                                      <option>Cheque</option>
                                      <option>UPI</option>
                                      <option>Credit Card</option>
                                   </select>
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-zinc-500 mb-1">Transaction ID</label>
                                   <input type="text" className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none focus:border-emerald-500"
                                      placeholder="Enter ref ID"
                                      value={paymentForm.transactionId} onChange={(e) => setPaymentForm({...paymentForm, transactionId: e.target.value})} />
                               </div>
                           </div>
                           <div>
                               <label className="block text-xs font-bold text-zinc-500 mb-1">Notes</label>
                               <textarea className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none focus:border-emerald-500 h-20 resize-none"
                                  placeholder="Additional notes (optional)"
                                  value={paymentForm.notes} onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}></textarea>
                           </div>
                       </div>

                       <div className="flex justify-end gap-3 mt-6">
                           <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 border border-zinc-800 rounded-lg text-zinc-400 hover:bg-zinc-800 font-medium text-sm">Cancel</button>
                           <button onClick={handleAddPayment} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-sm flex items-center gap-2">
                               <Plus size={16} /> Add Payment
                           </button>
                       </div>
                   </div>
               </motion.div>
            </div>
          )}
      </AnimatePresence>

      {/* Status Modal */}
      <AnimatePresence>
          {showStatusModal && selectedInvoice && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm p-6">
                      <h3 className="text-lg font-bold text-white mb-4">Update Status</h3>
                      <p className="text-sm text-zinc-400 mb-6">Change status for invoice <span className="text-white font-mono">{selectedInvoice.invoiceNumber}</span></p>

                      <div className="space-y-2">
                          {['Draft', 'Sent', 'Pending', 'Partial', 'Paid', 'Overdue'].map(status => (
                              <button key={status} onClick={() => handleStatusUpdate(status)}
                                className={`w-full p-3 rounded-lg text-left text-sm font-medium transition-colors ${selectedInvoice.status === status ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                              >
                                  {status}
                              </button>
                          ))}
                      </div>
                      <div className="mt-6">
                          <Button variant="ghost" onClick={() => setShowStatusModal(false)} className="w-full">Cancel</Button>
                      </div>
                  </motion.div>
              </div>
          )}
      </AnimatePresence>

    </div>
  );
}

export default Invoices;
