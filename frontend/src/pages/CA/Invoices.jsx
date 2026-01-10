import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';
import * as XLSX from 'xlsx';

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

  // ESC key handler for Create Invoice Modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && showCreateModal) {
        setShowCreateModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showCreateModal]);

  // ESC key handler for View Invoice Modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && showViewModal) {
        setShowViewModal(false);
        setSelectedInvoice(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showViewModal]);

  // ESC key handler for Payment Modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && showPaymentModal) {
        setShowPaymentModal(false);
        setSelectedInvoice(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showPaymentModal]);

  // ESC key handler for Status Change Modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && showStatusModal) {
        setShowStatusModal(false);
        setSelectedInvoice(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showStatusModal]);

  // ESC key handler for Edit Invoice Modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && showEditModal) {
        setShowEditModal(false);
        setSelectedInvoice(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showEditModal]);


  // replace with API call
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        // Fetch from your backend
        const response = await axios.get('http://localhost:5000/api/invoices');
        setInvoices(response.data);
      } catch (error) {
        console.error("Error fetching invoices:", error);
        // Optional: Keep sample data as fallback if server fails
        // setInvoices(sampleInvoices); 
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  // Handle pre-filtering from Payment Report
  useEffect(() => {
    if (location.state?.clientName) {
      setClientFilter(location.state.clientName);
    }
  }, [location.state]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Partial': return 'bg-orange-100 text-orange-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Sent': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Paid': return 'fas fa-check-circle';
      case 'Pending': return 'fas fa-clock';
      case 'Partial': return 'fas fa-hourglass-half';
      case 'Overdue': return 'fas fa-exclamation-triangle';
      case 'Draft': return 'fas fa-edit';
      case 'Sent': return 'fas fa-paper-plane';
      default: return 'fas fa-file-invoice';
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

  const calculateTotals = () => {
    return filteredAndSortedInvoices.reduce((acc, invoice) => {
      // Explicitly convert to numbers to prevent string concatenation
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Invoice Management</h1>
            <p className="text-gray-600">Manage billing and payments</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 font-semibold"
            >
              <i className="fas fa-download"></i>
              Export Excel
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition transform hover:-translate-y-0.5 flex items-center gap-2 font-semibold"
            >
              <i className="fas fa-plus"></i>
              Create Invoice
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Amount</p>
                <p className="text-2xl font-bold tracking-tight">₹{totals.totalAmount.toLocaleString()}</p>
              </div>
              <i className="fas fa-rupee-sign text-3xl text-blue-200"></i>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Paid Amount</p>
                <p className="text-2xl font-bold tracking-tight">₹{totals.paidAmount.toLocaleString()}</p>
              </div>
              <i className="fas fa-check-circle text-3xl text-green-200"></i>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Pending Amount</p>
                <p className="text-2xl font-bold tracking-tight">₹{totals.pendingAmount.toLocaleString()}</p>
              </div>
              <i className="fas fa-clock text-3xl text-orange-200"></i>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
                />
                <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Client</label>
              <Select
                className="w-full text-sm font-medium"
                value={clientFilter === 'all' ? { value: 'all', label: 'All Clients' } : { value: clientFilter, label: clientFilter }}
                onChange={(opt) => setClientFilter(opt ? opt.value : 'all')}
                options={[
                  { value: 'all', label: 'All Clients' },
                  ...uniqueClients.map(client => ({ value: client, label: client }))
                ]}
                isSearchable={true}
                styles={{
                  control: (base) => ({
                    ...base,
                    borderColor: '#D1D5DB',
                    '&:hover': { borderColor: '#6366F1' },
                    borderRadius: '0.5rem',
                    padding: '2px'
                  })
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium"
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
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setClientFilter('all');
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-semibold"
                >
                  <i className="fas fa-times mr-2"></i>
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden  backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">
                    Invoice No
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-black text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                <AnimatePresence>
                  {paginatedInvoices.map((invoice, index) => (
                    <motion.tr
                      key={invoice.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gradient-to-r hover:from-purple-50/30 hover:to-indigo-50/30 transition-all duration-300 group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-base font-bold text-gray-900 tracking-tight">{invoice.invoiceNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-base font-bold text-gray-900 tracking-tight">{invoice.client}</div>
                        <div className="text-sm text-gray-500 font-medium">{invoice.clientEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-base font-bold text-gray-900 tracking-tight">₹{invoice.totalAmount.toLocaleString()}</div>
                        <div className="text-xs text-gray-500 font-medium">Base: ₹{invoice.amount.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-base font-bold text-gray-900 tracking-tight">{new Date(invoice.date).toLocaleDateString('en-GB')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-base font-bold text-gray-900 tracking-tight">{new Date(invoice.dueDate).toLocaleDateString('en-GB')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowStatusModal(true);
                          }}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold cursor-pointer hover:opacity-80 transition ${getStatusColor(invoice.status)}`}
                        >
                          <i className={`${getStatusIcon(invoice.status)} mr-1`}></i>
                          {invoice.status}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={async () => {
                              try {
                                const response = await axios.get(`http://localhost:5000/api/invoices/${invoice.id}`);
                                setSelectedInvoice(response.data);
                                setShowViewModal(true);
                              } catch (error) {
                                console.error("Error fetching invoice details:", error);
                                showToast("Failed to load invoice details", "error");
                              }
                            }}
                            className="w-10 h-10 flex items-center justify-center text-purple-600 hover:bg-purple-100 rounded-xl transition shadow-sm border border-purple-100 bg-white"
                            title="View Invoice"
                          >
                            <i className="fas fa-eye text-base"></i>
                          </button>
                          <button
                            onClick={() => {
                              if (invoice.status !== 'Paid') {
                                setSelectedInvoice(invoice);
                                setShowEditModal(true);
                              }
                            }}
                            disabled={invoice.status === 'Paid'}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition shadow-sm border ${invoice.status === 'Paid' ? 'text-gray-400 bg-gray-50 border-gray-100 cursor-not-allowed opacity-50' : 'text-blue-600 hover:bg-blue-100 border-blue-100 bg-white'}`}
                            title={invoice.status === 'Paid' ? "Cannot edit paid invoice" : "Edit Invoice"}
                          >
                            <i className="fas fa-edit text-base"></i>
                          </button>
                          <button
                            onClick={() => {
                              if (invoice.status !== 'Paid') {
                                setSelectedInvoice(invoice);
                                setShowPaymentModal(true);
                              }
                            }}
                            disabled={invoice.status === 'Paid'}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition shadow-sm border ${invoice.status === 'Paid' ? 'text-gray-400 bg-gray-50 border-gray-100 cursor-not-allowed opacity-50' : 'text-green-600 hover:bg-green-100 border-green-100 bg-white'}`}
                            title={invoice.status === 'Paid' ? "Invoice already paid" : "Add Payment"}
                          >
                            <i className="fas fa-credit-card text-base"></i>
                          </button>
                          <button
                            onClick={() => {
                              if (invoice.status !== 'Paid') {
                                handleDeleteInvoice(invoice.id);
                              }
                            }}
                            disabled={invoice.status === 'Paid'}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition shadow-sm border ${invoice.status === 'Paid' ? 'text-gray-400 bg-gray-50 border-gray-100 cursor-not-allowed opacity-50' : 'text-red-600 hover:bg-red-100 border-red-100 bg-white'}`}
                            title={invoice.status === 'Paid' ? "Cannot delete paid invoice" : "Delete Invoice"}
                          >
                            <i className="fas fa-trash text-base"></i>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Professional Pagination Controls */}
          {filteredAndSortedInvoices.length > 0 && (
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
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Items</span>
                </div>
                <p className="text-sm text-gray-500 font-medium whitespace-nowrap">
                  Showing <span className="text-gray-900 font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(currentPage * itemsPerPage, filteredAndSortedInvoices.length)}</span> of <span className="text-gray-900 font-bold">{filteredAndSortedInvoices.length}</span>
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

        {/* No Results */}
        {filteredAndSortedInvoices.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <i className="fas fa-file-invoice text-6xl text-gray-300 mb-4"></i>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-500 mb-6 font-medium">Try adjusting your search criteria or create a new invoice.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-bold"
            >
              <i className="fas fa-plus mr-2"></i>
              Create First Invoice
            </button>
          </motion.div>
        )}

        {/* Create Invoice Modal */}

        <AnimatePresence>
          {showCreateModal && (
            <CreateInvoiceModal
              onClose={() => setShowCreateModal(false)}
              onSubmit={async (invoiceData) => {
                try {
                  // The backend expects items inside the object
                  const payload = {
                    ...invoiceData,
                    // Ensure frontend maps correctly to backend expectations
                    items: invoiceData.items
                  };

                  await axios.post('http://localhost:5000/api/invoices', payload);

                  // Refresh list
                  const response = await axios.get('http://localhost:5000/api/invoices');
                  setInvoices(response.data);

                  setShowCreateModal(false);
                  showToast('Invoice created successfully', 'success');
                } catch (error) {
                  console.error(error);
                  showToast('Failed to create invoice', 'error');
                }
              }}
              showToast={showToast}
            />
          )}
        </AnimatePresence>

        {/* Edit Invoice Modal */}
        <AnimatePresence>
          {showEditModal && selectedInvoice && (
            <EditInvoiceModal
              invoice={selectedInvoice}
              onClose={() => {
                setShowEditModal(false);
                setSelectedInvoice(null);
              }}
              onSubmit={async (updatedData) => {
                try {
                  const payload = {
                    ...updatedData,
                    items: updatedData.items
                  };

                  await axios.put(`http://localhost:5000/api/invoices/${updatedData.id}`, payload);

                  // Refresh list
                  const response = await axios.get('http://localhost:5000/api/invoices');
                  setInvoices(response.data);

                  setShowEditModal(false);
                  showToast('Invoice updated successfully', 'success');
                } catch (error) {
                  console.error(error);
                  showToast('Failed to update invoice', 'error');
                }
              }}
              showToast={showToast}
            />
          )}
        </AnimatePresence>

        {/* Status Change Modal */}
        <AnimatePresence>
          {showStatusModal && selectedInvoice && (
            <StatusChangeModal
              invoice={selectedInvoice}
              onClose={() => setShowStatusModal(false)}
              onSubmit={(newStatus) => {
                handleStatusUpdate(selectedInvoice.id, newStatus);
                setShowStatusModal(false);
              }}
              showToast={showToast}
            />
          )}
        </AnimatePresence>

        {/* Add Payment Modal */}

        <AnimatePresence>
          {showPaymentModal && selectedInvoice && (
            <AddPaymentModal
              invoice={selectedInvoice}
              onClose={() => setShowPaymentModal(false)}
              onSubmit={async (paymentData) => {
                try {
                  await axios.post(`http://localhost:5000/api/invoices/${selectedInvoice.id}/payments`, paymentData);

                  // Refresh data to recalculate totals
                  const response = await axios.get('http://localhost:5000/api/invoices');
                  setInvoices(response.data);

                  setShowPaymentModal(false);
                  showToast('Payment added successfully', 'success');
                } catch (error) {
                  console.error(error);
                  showToast('Failed to add payment', 'error');
                }
              }}
              showToast={showToast}
            />
          )}
        </AnimatePresence>

        {/* View Invoice Modal */}
        <AnimatePresence>
          {showViewModal && selectedInvoice && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => setShowViewModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 rounded-t-xl">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <i className="fas fa-file-invoice text-white text-lg"></i>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">{selectedInvoice.invoiceNumber}</h2>
                        <p className="text-purple-100 text-xs">Invoice Details</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowViewModal(false)}
                      className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Invoice & Client Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Invoice Number</label>
                      <p className="text-sm font-semibold text-gray-900">{selectedInvoice.invoiceNumber}</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Client Name</label>
                      <p className="text-sm font-semibold text-gray-900">{selectedInvoice.client}</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(selectedInvoice.status)}`}>
                        <i className={`${getStatusIcon(selectedInvoice.status)} mr-1`}></i>
                        {selectedInvoice.status}
                      </span>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Invoice Date</label>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(selectedInvoice.date).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Due Date</label>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(selectedInvoice.dueDate).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Client Email</label>
                      <p className="text-sm font-semibold text-gray-900 truncate">{selectedInvoice.clientEmail || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Invoice Items Table */}
                  {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase">Invoice Items</h4>
                      <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase">Service</th>
                              <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase">Description</th>
                              <th className="px-3 py-2 text-center text-xs font-bold text-gray-600 uppercase">Qty</th>
                              <th className="px-3 py-2 text-right text-xs font-bold text-gray-600 uppercase">Rate</th>
                              <th className="px-3 py-2 text-right text-xs font-bold text-gray-600 uppercase">GST %</th>
                              <th className="px-3 py-2 text-right text-xs font-bold text-gray-600 uppercase">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {selectedInvoice.items.map((item, index) => {
                              const itemAmount = (item.quantity || 0) * (item.rate || 0);
                              const gstRate = (item.gst_rate !== null && item.gst_rate !== undefined) ? item.gst_rate : (item.gst !== null && item.gst !== undefined ? item.gst : 0);
                              const gstAmount = (itemAmount * gstRate) / 100;
                              const totalAmount = itemAmount + gstAmount;

                              return (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 font-medium text-gray-900">{item.service || 'N/A'}</td>
                                  <td className="px-3 py-2 text-gray-600">{item.description || '-'}</td>
                                  <td className="px-3 py-2 text-center text-gray-900">{item.quantity || 0}</td>
                                  <td className="px-3 py-2 text-right text-gray-900">₹{(item.rate || 0).toLocaleString()}</td>
                                  <td className="px-3 py-2 text-right text-gray-600">{(item.gst_rate !== null && item.gst_rate !== undefined) ? item.gst_rate : (item.gst !== null && item.gst !== undefined ? item.gst : 0)}%</td>
                                  <td className="px-3 py-2 text-right font-semibold text-gray-900">₹{totalAmount.toLocaleString()}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Payment Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                      <h4 className="text-xs font-bold text-gray-600 uppercase mb-3">Amount Breakdown</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-semibold text-gray-900">₹{(parseFloat(selectedInvoice.amount) || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax Amount:</span>
                          <span className="font-semibold text-gray-900">₹{(parseFloat(selectedInvoice.taxAmount) || 0).toLocaleString()}</span>
                        </div>
                        <div className="border-t border-blue-200 pt-2 flex justify-between">
                          <span className="font-bold text-gray-900">Total Amount:</span>
                          <span className="font-bold text-lg text-indigo-600">₹{(parseFloat(selectedInvoice.totalAmount) || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                      <h4 className="text-xs font-bold text-gray-600 uppercase mb-3">Payment Status</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Paid Amount:</span>
                          <span className="font-semibold text-green-600">₹{(parseFloat(selectedInvoice.paidAmount) || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Balance:</span>
                          <span className="font-semibold text-orange-600">₹{((parseFloat(selectedInvoice.totalAmount) || 0) - (parseFloat(selectedInvoice.paidAmount) || 0)).toLocaleString()}</span>
                        </div>
                        {selectedInvoice.paymentDate && (
                          <div className="border-t border-green-200 pt-2 flex justify-between text-sm">
                            <span className="text-gray-600">Payment Date:</span>
                            <span className="font-medium text-gray-900">{new Date(selectedInvoice.paymentDate).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment History Section */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                      <h4 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
                        <i className="fas fa-history text-purple-600"></i>
                        Payment History
                      </h4>
                      <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {selectedInvoice.payments ? selectedInvoice.payments.length : 0} Payments
                      </span>
                    </div>

                    {selectedInvoice.payments && selectedInvoice.payments.length > 0 ? (
                      <div className="overflow-x-auto border border-gray-100 rounded-xl shadow-sm bg-gray-50/30">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-100/50">
                            <tr>
                              <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase tracking-wider">Method</th>
                              <th className="px-4 py-3 text-left font-bold text-gray-600 uppercase tracking-wider">Transaction ID</th>
                              <th className="px-4 py-3 text-right font-bold text-gray-600 uppercase tracking-wider">Amount Paid</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {selectedInvoice.payments.map((payment, idx) => (
                              <tr key={idx} className="hover:bg-purple-50/30 transition-colors">
                                <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                                  {new Date(payment.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-100">
                                    {payment.payment_mode || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-600 font-medium">
                                  {payment.transaction_id || '-'}
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-green-600">
                                  ₹{(parseFloat(payment.amount) || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>

                        </table>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-8 text-center border-2 border-dashed border-gray-200">
                        <i className="fas fa-receipt text-3xl text-gray-300 mb-2"></i>
                        <p className="text-gray-500 font-medium text-sm italic">No payment history recorded for this invoice yet.</p>
                      </div>
                    )}
                  </div>


                  {/* Notes */}
                  {selectedInvoice.description && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-6">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Notes</label>
                      <p className="text-sm font-semibold text-gray-900">{selectedInvoice.description}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    {selectedInvoice.status !== 'Paid' && (
                      <button
                        onClick={() => {
                          setShowViewModal(false);
                          setSelectedInvoice(selectedInvoice);
                          setShowEditModal(true);
                        }}
                        className="px-4 py-2 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-all flex items-center gap-2"
                      >
                        <i className="fas fa-edit text-xs"></i>
                        Edit Invoice
                      </button>
                    )}
                    <button
                      onClick={() => setShowViewModal(false)}
                      className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all flex items-center gap-2"
                    >
                      <i className="fas fa-times text-xs"></i>
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default Invoices;

// Status Change Modal Component
function StatusChangeModal({ invoice, onClose, onSubmit, showToast }) {
  // Calculate recommended status based on payment
  const paidAmount = invoice.paidAmount || 0;
  const totalAmount = invoice.totalAmount || 0;
  const balanceAmount = totalAmount - paidAmount;

  const recommendedStatus = useMemo(() => {
    const paid = Number(paidAmount);
    const total = Number(totalAmount);
    if (paid <= 0) return 'Pending';
    if (paid >= total) return 'Paid';
    return 'Partial';
  }, [paidAmount, totalAmount]);

  const [selectedStatus, setSelectedStatus] = useState(recommendedStatus);

  const statusOptions = [
    { value: 'Pending', label: 'Pending', icon: 'fas fa-clock', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
    { value: 'Partial', label: 'Partial', icon: 'fas fa-hourglass-half', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
    { value: 'Paid', label: 'Paid', icon: 'fas fa-check-circle', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    { value: 'Overdue', label: 'Overdue', icon: 'fas fa-exclamation-triangle', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedStatus === invoice.status) {
      showToast('Status is already set to ' + selectedStatus, 'info');
      return;
    }
    onSubmit(selectedStatus);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <i className="fas fa-edit text-white"></i>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Change Status</h3>
                <p className="text-indigo-100 text-sm">{invoice.invoiceNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Payment Information Card */}
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <i className="fas fa-wallet text-blue-600"></i>
              Payment Summary
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-3 border border-blue-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Total Amount</p>
                <p className="text-base font-bold text-gray-900">₹{totalAmount.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Paid Amount</p>
                <p className="text-base font-bold text-green-600">₹{paidAmount.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-orange-100">
                <p className="text-xs text-gray-500 font-medium mb-1">Balance</p>
                <p className="text-base font-bold text-orange-600">₹{balanceAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Recommended Status Badge */}
          {recommendedStatus && (
            <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-center gap-2">
              <i className="fas fa-lightbulb text-indigo-600"></i>
              <span className="text-sm text-gray-700">
                <span className="font-semibold">Recommended:</span>
                <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded font-medium text-xs">
                  {recommendedStatus}
                </span>
              </span>
            </div>
          )}

          <div className="space-y-3">
            {statusOptions.map((status) => (
              <label
                key={status.value}
                className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${selectedStatus === status.value
                  ? `${status.bgColor} ${status.borderColor} shadow-sm`
                  : 'border-gray-200 hover:bg-gray-50'
                  }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={status.value}
                  checked={selectedStatus === status.value}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="mr-3"
                />
                <i className={`${status.icon} ${status.color} mr-3`}></i>
                <span className="font-medium">{status.label}</span>
                {status.value === recommendedStatus && (
                  <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-semibold">
                    Suggested
                  </span>
                )}
              </label>
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition font-medium"
            >
              Update Status
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// Add Payment Modal Component
function AddPaymentModal({ invoice, onClose, onSubmit, showToast }) {
  const [paymentData, setPaymentData] = useState({
    paymentAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bank Transfer',
    transactionId: '',
    notes: ''
  });

  const balanceAmount = invoice.totalAmount - (invoice.paidAmount || 0);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!paymentData.paymentAmount || parseFloat(paymentData.paymentAmount) <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    if (parseFloat(paymentData.paymentAmount) > balanceAmount) {
      showToast('Payment amount cannot exceed balance amount', 'error');
      return;
    }

    if (!paymentData.paymentDate) {
      showToast('Please select payment date', 'error');
      return;
    }

    onSubmit(paymentData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <i className="fas fa-credit-card text-white text-xl"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-white tracking-tight">Add Payment</h3>
                <p className="text-green-100 text-sm font-medium">Record payment for invoice</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-all"
            >
              <i className="fas fa-times text-lg"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-100px)]">
          <div className="p-6 space-y-5">
            {/* Invoice Summary */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
              <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <i className="fas fa-file-invoice text-green-600"></i>
                Invoice Summary
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Invoice ID</label>
                  <p className="text-base font-black text-gray-900 tracking-tight">{invoice.invoiceNumber}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Balance Amount</label>
                  <p className="text-base font-black text-green-600 tracking-tight">₹{balanceAmount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-gray-50 rounded-xl p-5">
              <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <i className="fas fa-money-bill-wave text-green-600"></i>
                Payment Details
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Payment Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={paymentData.paymentAmount}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, paymentAmount: e.target.value }))}
                    placeholder="Enter amount"
                    min="0"
                    max={balanceAmount}
                    step="0.01"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white font-medium text-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={paymentData.paymentDate}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, paymentDate: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white font-medium"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Transaction ID/Reference
                  </label>
                  <input
                    type="text"
                    value={paymentData.transactionId}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, transactionId: e.target.value }))}
                    placeholder="Enter transaction ID"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white font-medium"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes (optional)"
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all resize-none bg-white font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-all font-bold flex items-center gap-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all font-bold flex items-center gap-2"
            >
              <i className="fas fa-plus"></i>
              Add Payment
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// Create Invoice Modal Component
function CreateInvoiceModal({ onClose, onSubmit, showToast }) {
  const [formData, setFormData] = useState({
    client: '',
    clientEmail: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: ''
  });

  const [invoiceItems, setInvoiceItems] = useState([
    { id: 1, serviceId: '', service: '', description: '', quantity: 1, rate: 0, gst: 0 }
  ]);

  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch clients and services from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clientsRes, servicesRes] = await Promise.all([
          axios.get('http://localhost:5000/api/clients'),
          axios.get('http://localhost:5000/api/services')
        ]);

        // Map clients to match expected format
        const clientsData = clientsRes.data.map(client => ({
          name: client.business_name || client.client_name,
          email: client.email || ''
        }));

        setClients(clientsData);
        // Ensure services is an array and has service_name field
        const servicesData = Array.isArray(servicesRes.data) ? servicesRes.data : [];
        setServices(servicesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        console.error('Error details:', error.response?.data || error.message);
        showToast('Failed to load clients and services', 'error');
        // Set empty arrays on error to prevent crashes
        setClients([]);
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [showToast]);

  const handleClientChange = (clientName) => {
    const selectedClient = clients.find(c => c.name === clientName);
    setFormData(prev => ({
      ...prev,
      client: clientName,
      clientEmail: selectedClient ? selectedClient.email : ''
    }));
  };

  const handleServiceChange = (itemId, serviceId) => {
    const selectedService = services.find(s => s.id === parseInt(serviceId));
    if (selectedService) {
      updateInvoiceItem(itemId, 'serviceId', selectedService.id);
      updateInvoiceItem(itemId, 'service', selectedService.service_name);
      updateInvoiceItem(itemId, 'rate', selectedService.default_rate || 0);
      updateInvoiceItem(itemId, 'gst', 0);
    } else {
      updateInvoiceItem(itemId, 'serviceId', '');
      updateInvoiceItem(itemId, 'service', '');
    }
  };

  const addInvoiceItem = () => {
    const newItem = {
      id: invoiceItems.length > 0 ? Math.max(...invoiceItems.map(i => i.id)) + 1 : 1,
      serviceId: '',
      service: '',
      description: '',
      quantity: 1,
      rate: 0,
      gst: 0
    };
    setInvoiceItems(prev => [...prev, newItem]);
  };

  const removeInvoiceItem = (id) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const updateInvoiceItem = (id, field, value) => {
    setInvoiceItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateItemTotal = (item) => {
    const baseAmount = item.quantity * item.rate;
    const gstAmount = (baseAmount * item.gst) / 100;
    return baseAmount + gstAmount;
  };

  const calculateTotals = () => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const totalGst = invoiceItems.reduce((sum, item) => {
      const baseAmount = item.quantity * item.rate;
      return sum + (baseAmount * item.gst) / 100;
    }, 0);
    const total = subtotal + totalGst;

    return { subtotal, totalGst, total };
  };

  const { subtotal, totalGst, total } = calculateTotals();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.client || !formData.date || !formData.dueDate) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    if (invoiceItems.some(item => !item.serviceId || item.rate <= 0)) {
      showToast('Please complete all invoice items', 'error');
      return;
    }

    const invoiceData = {
      ...formData,
      amount: subtotal,
      taxAmount: totalGst,
      totalAmount: total,
      services: invoiceItems.map(item => item.service),
      items: invoiceItems,
      paymentDate: null,
      status: 'Pending',
      description: formData.notes || ''
    };

    onSubmit(invoiceData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Create New Invoice</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client & Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <Select
                  className="w-full text-sm"
                  value={formData.client ? { value: formData.client, label: formData.client } : null}
                  onChange={(opt) => handleClientChange(opt ? opt.value : '')}
                  options={clients.map(client => ({ value: client.name, label: client.name }))}
                  placeholder="Select Client"
                  isSearchable={true}
                  isDisabled={loading}
                  required
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderColor: '#D1D5DB',
                      '&:hover': { borderColor: '#3B82F6' },
                      borderRadius: '0.375rem',
                      padding: '1px'
                    })
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Invoice Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Invoice Items</h3>
                <button
                  type="button"
                  onClick={addInvoiceItem}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all flex items-center gap-2 text-sm font-medium"
                >
                  <i className="fas fa-plus"></i>
                  Add Item
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-24">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Rate (₹)</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">GST %</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">Total</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoiceItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2">
                          <select
                            value={item.serviceId || ''}
                            onChange={(e) => handleServiceChange(item.id, e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm bg-white"
                            required
                            disabled={loading}
                          >
                            <option value="">Select Service</option>
                            {services.length > 0 ? (
                              services.map(service => (
                                <option key={service.id} value={service.id}>{service.service_name}</option>
                              ))
                            ) : (
                              <option value="" disabled>No services available</option>
                            )}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateInvoiceItem(item.id, 'description', e.target.value)}
                            placeholder="Description"
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateInvoiceItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            onFocus={(e) => e.target.select()}
                            min="1"
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm text-center"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => updateInvoiceItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={item.gst}
                            onChange={(e) => updateInvoiceItem(item.id, 'gst', parseFloat(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm bg-white"
                          >
                            {[0, 5, 12, 18, 28].map(val => (
                              <option key={val} value={val}>{val}%</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="text-sm font-medium">₹{calculateItemTotal(item).toFixed(2)}</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeInvoiceItem(item.id)}
                            disabled={invoiceItems.length === 1}
                            className="text-red-500 hover:text-red-700 disabled:text-gray-300"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Section: Notes and Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes or terms"
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Total GST {invoiceItems.length === 1 || new Set(invoiceItems.map(i => i.gst)).size === 1 ? `(${invoiceItems[0].gst}%)` : ''}:
                  </span>
                  <span className="font-medium">₹{totalGst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2 mt-2">
                  <span>Total Amount:</span>
                  <span className="text-indigo-600">₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition transform hover:-translate-y-0.5 font-medium"
              >
                Create Invoice
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Edit Invoice Modal Component
function EditInvoiceModal({ invoice, onClose, onSubmit, showToast }) {
  const [formData, setFormData] = useState({
    client: invoice.client || '',
    clientEmail: invoice.clientEmail || '',
    date: invoice.date ? new Date(invoice.date).toISOString().split('T')[0] : '',
    dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '',
    notes: invoice.description || invoice.notes || '' // Backend sends notes in 'description' field
  });

  const [invoiceItems, setInvoiceItems] = useState(
    (invoice.items && invoice.items.length > 0)
      ? invoice.items.map((item, index) => ({
        ...item,
        id: index + 1,
        gst: (item.gst_rate !== null && item.gst_rate !== undefined) ? parseFloat(item.gst_rate) : (item.gst !== null && item.gst !== undefined ? parseFloat(item.gst) : 0),
        serviceId: item.service_id || '', // Map service_id from DB
        service: item.service || item.description || '' // Fallback for name
      }))
      : [{ id: 1, serviceId: '', service: '', description: '', quantity: 1, rate: 0, gst: 0 }]
  );

  const [clients, setClients] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch clients and services from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [clientsRes, servicesRes] = await Promise.all([
          axios.get('http://localhost:5000/api/clients'),
          axios.get('http://localhost:5000/api/services')
        ]);

        // Map clients to match expected format
        const clientsData = clientsRes.data.map(client => ({
          name: client.business_name || client.client_name,
          email: client.email || ''
        }));

        setClients(clientsData);
        const servicesData = Array.isArray(servicesRes.data) ? servicesRes.data : [];
        setServices(servicesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        showToast('Failed to load clients and services', 'error');
        setClients([]);
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [showToast]);

  const handleClientChange = (clientName) => {
    const selectedClient = clients.find(c => c.name === clientName);
    setFormData(prev => ({
      ...prev,
      client: clientName,
      clientEmail: selectedClient ? selectedClient.email : ''
    }));
  };

  const handleServiceChange = (itemId, serviceId) => {
    const selectedService = services.find(s => s.id === parseInt(serviceId));
    if (selectedService) {
      updateInvoiceItem(itemId, 'serviceId', selectedService.id);
      updateInvoiceItem(itemId, 'service', selectedService.service_name);
      updateInvoiceItem(itemId, 'rate', selectedService.default_rate || 0);
      updateInvoiceItem(itemId, 'gst', 0);
      updateInvoiceItem(itemId, 'description', selectedService.description || '');
    } else {
      updateInvoiceItem(itemId, 'serviceId', '');
      updateInvoiceItem(itemId, 'service', '');
    }
  };

  const addInvoiceItem = () => {
    const newItem = {
      id: invoiceItems.length > 0 ? Math.max(...invoiceItems.map(i => i.id)) + 1 : 1,
      serviceId: '',
      service: '',
      description: '',
      quantity: 1,
      rate: 0,
      gst: 0
    };
    setInvoiceItems(prev => [...prev, newItem]);
  };

  const removeInvoiceItem = (id) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const updateInvoiceItem = (id, field, value) => {
    setInvoiceItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateItemTotal = (item) => {
    const baseAmount = item.quantity * item.rate;
    const gstAmount = (baseAmount * item.gst) / 100;
    return baseAmount + gstAmount;
  };

  const calculateTotals = () => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const totalGst = invoiceItems.reduce((sum, item) => {
      const baseAmount = item.quantity * item.rate;
      return sum + (baseAmount * item.gst) / 100;
    }, 0);
    const total = subtotal + totalGst;

    return { subtotal, totalGst, total };
  };

  const { subtotal, totalGst, total } = calculateTotals();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.client || !formData.date || !formData.dueDate) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    if (invoiceItems.some(item => !item.serviceId || item.rate <= 0)) {
      showToast('Please complete all invoice items', 'error');
      return;
    }

    const updatedInvoiceData = {
      ...invoice,
      ...formData,
      amount: subtotal,
      taxAmount: totalGst,
      totalAmount: total,
      services: invoiceItems.map(item => item.service),
      items: invoiceItems,
      description: formData.notes || '' // Preserve user notes during update
    };

    onSubmit(updatedInvoiceData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Edit Invoice</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client & Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <Select
                  className="w-full text-sm"
                  value={formData.client ? { value: formData.client, label: formData.client } : null}
                  onChange={(opt) => handleClientChange(opt ? opt.value : '')}
                  options={clients.map(client => ({ value: client.name, label: client.name }))}
                  placeholder="Select Client"
                  isSearchable={true}
                  isDisabled={loading}
                  required
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderColor: '#D1D5DB',
                      '&:hover': { borderColor: '#3B82F6' },
                      borderRadius: '0.375rem',
                      padding: '1px'
                    })
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Invoice Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Invoice Items</h3>
                <button
                  type="button"
                  onClick={addInvoiceItem}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all flex items-center gap-2 text-sm font-medium"
                >
                  <i className="fas fa-plus"></i>
                  Add Item
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-24">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Rate (₹)</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">GST %</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">Total</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoiceItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2">
                          <select
                            value={item.serviceId || ''}
                            onChange={(e) => handleServiceChange(item.id, e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm bg-white"
                            required
                            disabled={loading}
                          >
                            <option value="">Select Service</option>
                            {services.length > 0 ? (
                              services.map(service => (
                                <option key={service.id} value={service.id}>{service.service_name}</option>
                              ))
                            ) : (
                              <option value="" disabled>No services available</option>
                            )}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateInvoiceItem(item.id, 'description', e.target.value)}
                            placeholder="Description"
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateInvoiceItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            onFocus={(e) => e.target.select()}
                            min="1"
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm text-center"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => updateInvoiceItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={item.gst}
                            onChange={(e) => updateInvoiceItem(item.id, 'gst', parseFloat(e.target.value))}
                            className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm bg-white"
                          >
                            {[0, 5, 12, 18, 28].map(val => (
                              <option key={val} value={val}>{val}%</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="text-sm font-medium">₹{calculateItemTotal(item).toFixed(2)}</span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeInvoiceItem(item.id)}
                            disabled={invoiceItems.length === 1}
                            className="text-red-500 hover:text-red-700 disabled:text-gray-300"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Section: Notes and Totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes or terms"
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Total GST {invoiceItems.length === 1 || new Set(invoiceItems.map(i => i.gst)).size === 1 ? `(${invoiceItems[0].gst}%)` : ''}:
                  </span>
                  <span className="font-medium">₹{totalGst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2 mt-2">
                  <span>Total Amount:</span>
                  <span className="text-indigo-600">₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition transform hover:-translate-y-0.5 font-medium"
              >
                Update Invoice
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}