import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

function ClientInvoices({ showToast }) {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    // Filter states
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // View Modal State
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    // Initial User Fetch
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // Fetch Invoices
    const fetchInvoices = React.useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            // Ideally backend filters, but if not we filter here
            const response = await axios.get('http://localhost:5000/api/invoices');
            // Filter by client name or email. Assuming 'client' in invoice matches user.name
            // Adjust this based on actual data: invoice.client === user.name
            const clientInvoices = response.data.filter(inv =>
                inv.client === user.name || inv.clientEmail === user.email
            );
            setInvoices(clientInvoices);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            showToast('Error loading invoices', 'error');
        } finally {
            setLoading(false);
        }
    }, [user, showToast]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

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

    // Filtered Invoices
    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const matchesStatus = selectedStatus === 'all' || inv.status === selectedStatus;

            const searchStr = searchQuery.toLowerCase();
            const matchesSearch = searchQuery === '' ||
                (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(searchStr)) ||
                (inv.description && inv.description.toLowerCase().includes(searchStr));

            return matchesStatus && matchesSearch;
        });
    }, [invoices, selectedStatus, searchQuery]);

    // Stats
    const stats = useMemo(() => {
        const totalInvoiced = invoices.reduce((acc, inv) => {
            return acc + (parseFloat(inv.totalAmount) || 0);
        }, 0);

        const totalOutstanding = invoices.reduce((acc, inv) => {
            const balance = (parseFloat(inv.totalAmount || 0) - parseFloat(inv.paidAmount || 0));
            return acc + (balance > 0 ? balance : 0);
        }, 0);

        const totalPaid = invoices.reduce((acc, inv) => {
            return acc + (parseFloat(inv.paidAmount) || 0);
        }, 0);

        return {
            totalCount: invoices.length,
            totalInvoiced: totalInvoiced,
            outstandingAmount: totalOutstanding,
            paidAmount: totalPaid,
            pendingCount: invoices.filter(inv => inv.status === 'Pending' || inv.status === 'Overdue' || inv.status === 'Sent').length,
            paidCount: invoices.filter(inv => inv.status === 'Paid').length
        };
    }, [invoices]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // Helpers
    const getStatusBadgeClass = (status) => {
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

    const handleOpenView = (inv) => {
        setSelectedInvoice(inv);
        setShowViewModal(true);
    };

    const resetFilters = () => {
        setSelectedStatus('all');
        setSearchQuery('');
        showToast('Filters reset', 'info');
    };

    if (loading && invoices.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">My Invoices</h2>
                    <p className="text-sm text-gray-500 mt-1">View and manage your invoices and payments</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Total Amount</p>
                            <p className="text-2xl font-bold tracking-tight">₹{stats.totalInvoiced.toLocaleString()}</p>
                        </div>
                        <i className="fas fa-rupee-sign text-3xl text-blue-200"></i>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-sm font-medium">Paid Amount</p>
                            <p className="text-2xl font-bold tracking-tight">₹{stats.paidAmount.toLocaleString()}</p>
                        </div>
                        <i className="fas fa-check-circle text-3xl text-green-200"></i>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white shadow-lg"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-orange-100 text-sm font-medium">Pending Amount</p>
                            <p className="text-2xl font-bold tracking-tight">₹{stats.outstandingAmount.toLocaleString()}</p>
                        </div>
                        <i className="fas fa-clock text-3xl text-orange-200"></i>
                    </div>
                </motion.div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Search Invoice</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by invoice number or description..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                            />
                            <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                            value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="Paid">Paid</option>
                            <option value="Pending">Pending</option>
                            <option value="Partial">Partial</option>
                            <option value="Overdue">Overdue</option>
                            <option value="Sent">Sent</option>
                        </select>
                    </div>
                </div>
                {(selectedStatus !== 'all' || searchQuery !== '') && (
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
                        <thead className="bg-gray-50/50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Invoice</th>
                                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Date</th>
                                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Due Date</th>
                                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Total Amount</th>
                                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Paid Amount</th>
                                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Due Amount</th>
                                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Status</th>
                                <th className="text-center px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            <AnimatePresence>
                                {currentItems.length === 0 ? (
                                    <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <td colSpan="8" className="py-20 text-center">
                                            <div className="flex flex-col items-center">
                                                <i className="fas fa-file-invoice text-6xl text-gray-200 mb-4"></i>
                                                <h3 className="text-xl font-semibold text-gray-700 mb-2">No invoices found</h3>
                                                <p className="text-gray-500">You don't have any invoices matching your criteria.</p>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ) : (
                                    currentItems.map((inv, idx) => (
                                        <motion.tr
                                            key={inv.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="hover:bg-indigo-50/30 group transition"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                        <i className="fas fa-file-alt text-sm"></i>
                                                    </div>
                                                    <p className="font-bold text-gray-800">{inv.invoiceNumber}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-600">
                                                    {new Date(inv.date).toLocaleDateString('en-GB')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-600">
                                                    {new Date(inv.dueDate).toLocaleDateString('en-GB')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-bold text-gray-800">
                                                    ₹{inv.totalAmount.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-bold text-green-600">
                                                    ₹{(inv.paidAmount || 0).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-bold text-amber-600">
                                                    ₹{((inv.totalAmount || 0) - (inv.paidAmount || 0)).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${getStatusBadgeClass(inv.status)}`}>
                                                    <i className={`${getStatusIcon(inv.status)} text-[10px]`}></i>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleOpenView(inv)}
                                                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition"
                                                        title="View Invoice Details"
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
                {filteredInvoices.length > 0 && (
                    <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-between items-center">
                        <p className="text-sm text-gray-500 font-medium">
                            Showing <span className="text-gray-900 font-bold">{indexOfFirstItem + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(indexOfLastItem, filteredInvoices.length)}</span> of <span className="text-gray-900 font-bold">{filteredInvoices.length}</span>
                        </p>
                        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-2xl border border-gray-100">
                            <button
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className={`w-9 h-9 flex items-center justify-center rounded-xl transition ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm'}`}
                            >
                                <i className="fas fa-chevron-left text-xs"></i>
                            </button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => paginate(i + 1)}
                                    className={`w-9 h-9 rounded-xl text-xs font-black transition ${currentPage === i + 1 ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg' : 'text-gray-500 hover:bg-white hover:text-indigo-600'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className={`w-9 h-9 flex items-center justify-center rounded-xl transition ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm'}`}
                            >
                                <i className="fas fa-chevron-right text-xs"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* View Modal */}
            {showViewModal && selectedInvoice && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setShowViewModal(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex justify-between items-center shrink-0">
                            <h3 className="text-xl font-bold">Invoice Details</h3>
                            <button onClick={() => setShowViewModal(false)} className="hover:rotate-90 transition transform"><i className="fas fa-times"></i></button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto">

                            {/* Header Info */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Invoice Number</p>
                                    <p className="text-lg font-bold text-gray-800">{selectedInvoice.invoiceNumber}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(selectedInvoice.status)}`}>
                                        {selectedInvoice.status}
                                    </span>
                                </div>
                            </div>

                            {/* Dates Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Invoice Date</p>
                                    <p className="text-sm font-bold text-gray-800">
                                        {new Date(selectedInvoice.date).toLocaleDateString('en-GB')}
                                    </p>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Due Date</p>
                                    <p className="text-sm font-bold text-gray-800">
                                        {new Date(selectedInvoice.dueDate).toLocaleDateString('en-GB')}
                                    </p>
                                </div>
                            </div>

                            {/* Payment Breakdown */}
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-2xl border border-indigo-100">
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <i className="fas fa-wallet"></i>
                                    Payment Breakdown
                                </h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-white px-4 py-3 rounded-xl border border-indigo-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Amount</p>
                                        <p className="text-lg font-bold text-gray-800">₹{selectedInvoice.totalAmount.toLocaleString()}</p>
                                    </div>
                                    <div className="bg-white px-4 py-3 rounded-xl border border-green-100">
                                        <p className="text-[10px] font-bold text-green-400 uppercase tracking-wider mb-1">Paid Amount</p>
                                        <p className="text-lg font-bold text-green-600">₹{(selectedInvoice.paidAmount || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="bg-white px-4 py-3 rounded-xl border border-amber-100">
                                        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Due Amount</p>
                                        <p className="text-lg font-bold text-amber-600">₹{((selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0)).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>




                            {/* Items Table */}
                            {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-bold text-gray-700 mb-3 border-b border-gray-100 pb-2 flex items-center gap-2">
                                        <i className="fas fa-list-ul text-indigo-600"></i>
                                        Invoice Items
                                    </h4>
                                    <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 text-gray-600">
                                                <tr>
                                                    <th className="text-left py-3 px-4 font-bold">#</th>
                                                    <th className="text-left py-3 px-4 font-bold">Service / Description</th>
                                                    <th className="text-right py-3 px-4 font-bold">Qty</th>
                                                    <th className="text-right py-3 px-4 font-bold">Rate</th>
                                                    <th className="text-right py-3 px-4 font-bold">GST %</th>
                                                    <th className="text-right py-3 px-4 font-bold">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 bg-white">
                                                {selectedInvoice.items.map((item, i) => {
                                                    const itemAmount = (item.quantity || 0) * (item.rate || 0);
                                                    const gstAmount = (itemAmount * (item.gst_rate || 0)) / 100;
                                                    const totalWithGst = itemAmount + gstAmount;

                                                    return (
                                                        <tr key={i} className="hover:bg-indigo-50/30 transition">
                                                            <td className="py-3 px-4 text-gray-500 font-medium">{i + 1}</td>
                                                            <td className="py-3 px-4">
                                                                <div>
                                                                    {item.service && (
                                                                        <p className="font-bold text-gray-800">{item.service}</p>
                                                                    )}
                                                                    {item.description && (
                                                                        <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 text-right text-gray-700 font-medium">{item.quantity || 0}</td>
                                                            <td className="py-3 px-4 text-right text-gray-700">₹{(item.rate || 0).toLocaleString()}</td>
                                                            <td className="py-3 px-4 text-right">
                                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold">
                                                                    {item.gst_rate || 0}%
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-right font-bold text-gray-800">
                                                                ₹{totalWithGst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-gradient-to-r from-indigo-50 to-purple-50 border-t-2 border-indigo-200">
                                                <tr>
                                                    <td colSpan="5" className="py-3 px-4 text-right font-bold text-gray-700">Subtotal:</td>
                                                    <td className="py-3 px-4 text-right font-bold text-gray-800">
                                                        ₹{(selectedInvoice.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td colSpan="5" className="py-3 px-4 text-right font-bold text-gray-700">Total Tax:</td>
                                                    <td className="py-3 px-4 text-right font-bold text-blue-600">
                                                        ₹{(selectedInvoice.taxAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                                <tr className="border-t-2 border-indigo-300">
                                                    <td colSpan="5" className="py-3 px-4 text-right font-bold text-gray-800 text-base">Grand Total:</td>
                                                    <td className="py-3 px-4 text-right font-bold text-indigo-700 text-lg">
                                                        ₹{(selectedInvoice.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}



                            {/* Payment History */}
                            {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-bold text-gray-700 mb-3 border-b border-gray-100 pb-2 flex items-center gap-2">
                                        <i className="fas fa-history text-green-600"></i>
                                        Payment History
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedInvoice.payments.map((payment, i) => (
                                            <div key={i} className="bg-green-50 p-3 rounded-xl border border-green-100">
                                                <div className="flex justify-between items-center mb-1">
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-800">₹{(payment.amount || 0).toLocaleString()}</p>
                                                        <p className="text-xs text-gray-500">{payment.payment_mode || 'Payment'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-600">{new Date(payment.payment_date).toLocaleDateString('en-GB')}</p>
                                                        {payment.transaction_id && (
                                                            <p className="text-xs text-gray-400">Ref: {payment.transaction_id}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {payment.notes && (
                                                    <div className="mt-2 pt-2 border-t border-green-100 text-xs text-green-800 italic">
                                                        "{payment.notes}"
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}


                            {/* Invoice Notes */}
                            {selectedInvoice.description && (
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <i className="fas fa-sticky-note"></i>
                                        Invoice Notes
                                    </p>
                                    <p className="text-sm text-blue-900 leading-relaxed font-medium whitespace-pre-wrap">
                                        {selectedInvoice.description}
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

export default ClientInvoices;
