import React, { useState, useEffect, useMemo } from 'react';
import axios from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  Eye,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  CreditCard,
  Send,
  Edit,
  AlertTriangle
} from 'lucide-react';
import Button from '../../components/ui/Button';

function ClientInvoices({ showToast }) {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    // Filter states
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

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
            const response = await axios.get('/invoices');
            // Filter by client name or email
            const clientInvoices = response.data.filter(inv =>
                inv.client === user.name || inv.clientEmail === user.email
            );
            setInvoices(clientInvoices);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            if(showToast) showToast('Error loading invoices', 'error');
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
            totalInvoiced: totalInvoiced,
            outstandingAmount: totalOutstanding,
            paidAmount: totalPaid,
        };
    }, [invoices]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // Helpers
    const getStatusBadge = (status) => {
       const s = status ? status : '';
       switch (s) {
          case 'Paid': return <span className="flex items-center gap-1 text-xs font-bold text-success bg-success/10 px-2 py-1 rounded border border-success/20"><CheckCircle size={12}/> Paid</span>;
          case 'Pending': return <span className="flex items-center gap-1 text-xs font-bold text-warning bg-warning/10 px-2 py-1 rounded border border-warning/20"><Clock size={12}/> Pending</span>;
          case 'Overdue': return <span className="flex items-center gap-1 text-xs font-bold text-error bg-error/10 px-2 py-1 rounded border border-error/20"><AlertCircle size={12}/> Overdue</span>;
          case 'Sent': return <span className="flex items-center gap-1 text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded border border-accent/20"><Send size={12}/> Sent</span>;
          case 'Draft': return <span className="flex items-center gap-1 text-xs font-bold text-secondary bg-surface-highlight px-2 py-1 rounded border border-border"><Edit size={12}/> Draft</span>;
          case 'Partial': return <span className="flex items-center gap-1 text-xs font-bold text-warning bg-warning/10 px-2 py-1 rounded border border-warning/20"><AlertTriangle size={12}/> Partial</span>;
          default: return <span className="text-xs text-secondary">{s}</span>;
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
                <Loader2 className="animate-spin text-accent" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-primary tracking-tight">My Invoices</h2>
                    <p className="text-sm text-secondary">View and manage your invoices and payments</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
                  <div>
                     <p className="text-xs font-mono text-secondary uppercase">Total Invoiced</p>
                     <h3 className="text-2xl font-bold text-primary">₹{stats.totalInvoiced.toLocaleString()}</h3>
                  </div>
                  <DollarSign className="text-accent/20" size={32} />
               </div>
               <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
                  <div>
                     <p className="text-xs font-mono text-secondary uppercase">Paid Amount</p>
                     <h3 className="text-2xl font-bold text-success">₹{stats.paidAmount.toLocaleString()}</h3>
                  </div>
                  <CheckCircle className="text-success/20" size={32} />
               </div>
               <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
                  <div>
                     <p className="text-xs font-mono text-secondary uppercase">Pending</p>
                     <h3 className="text-2xl font-bold text-error">₹{stats.outstandingAmount.toLocaleString()}</h3>
                  </div>
                  <Clock className="text-error/20" size={32} />
               </div>
            </div>

            {/* Filters */}
            <div className="bg-surface border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4">
               <div className="relative md:w-1/3">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={16} />
                  <select value={selectedStatus} onChange={e => {setSelectedStatus(e.target.value); setCurrentPage(1);}} className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent outline-none appearance-none">
                     <option value="all">All Status</option>
                     <option value="Paid">Paid</option>
                     <option value="Pending">Pending</option>
                     <option value="Partial">Partial</option>
                     <option value="Overdue">Overdue</option>
                     <option value="Sent">Sent</option>
                  </select>
               </div>
               <div className="relative md:w-2/3 flex gap-2">
                  <div className="relative flex-1">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={16} />
                     <input type="text" placeholder="Search..." value={searchQuery} onChange={e => {setSearchQuery(e.target.value); setCurrentPage(1);}} className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent outline-none" />
                  </div>
                  {(selectedStatus !== 'all' || searchQuery !== '') && (
                     <Button variant="ghost" onClick={resetFilters}><X size={16} /></Button>
                  )}
               </div>
            </div>

            {/* Table */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-surface-highlight/30">
                                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Invoice</th>
                                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Date</th>
                                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Due Date</th>
                                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Total</th>
                                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-success">Paid</th>
                                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-error">Due</th>
                                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-center">Status</th>
                                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center text-secondary">
                                        <FileText size={32} className="mx-auto mb-2 opacity-20" />
                                        <p>No invoices found.</p>
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((inv, idx) => (
                                    <motion.tr
                                        key={inv.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="hover:bg-surface-highlight/50 transition-colors group"
                                    >
                                        <td className="p-4 font-bold text-primary">{inv.invoiceNumber}</td>
                                        <td className="p-4 text-xs text-secondary font-mono">
                                            {new Date(inv.date).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-xs text-secondary font-mono">
                                            {new Date(inv.dueDate).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 font-bold text-primary">
                                            ₹{inv.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="p-4 font-bold text-success">
                                            ₹{(inv.paidAmount || 0).toLocaleString()}
                                        </td>
                                        <td className="p-4 font-bold text-error">
                                            ₹{((inv.totalAmount || 0) - (inv.paidAmount || 0)).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            {getStatusBadge(inv.status)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <Button variant="ghost" size="sm" onClick={() => handleOpenView(inv)} className="h-8 w-8 p-0 rounded-full"><Eye size={16} /></Button>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredInvoices.length > 0 && (
                    <div className="p-4 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <span className="text-xs text-secondary">Rows:</span>
                           <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-background border border-border rounded text-xs text-primary p-1 outline-none">
                              <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
                           </select>
                           <span className="text-xs text-secondary ml-4">{((currentPage-1)*itemsPerPage)+1}-{Math.min(currentPage*itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length}</span>
                        </div>
                        <div className="flex gap-2">
                           <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft size={16} /></Button>
                           <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight size={16} /></Button>
                        </div>
                    </div>
                )}
            </div>

            {/* View Modal */}
            <AnimatePresence>
                {showViewModal && selectedInvoice && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowViewModal(false)}>
                        <motion.div
                           initial={{ scale: 0.9, opacity: 0 }}
                           animate={{ scale: 1, opacity: 1 }}
                           exit={{ scale: 0.9, opacity: 0 }}
                           className="bg-surface border border-border rounded-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
                           onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-border flex justify-between items-center bg-surface-highlight/20">
                                <h3 className="text-lg font-bold text-primary">Invoice Details</h3>
                                <button onClick={() => setShowViewModal(false)}><X size={20} className="text-secondary hover:text-primary"/></button>
                            </div>

                            <div className="p-6 space-y-6 overflow-y-auto">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-xs font-mono text-secondary uppercase">Invoice #</p>
                                        <p className="text-xl font-bold text-primary">{selectedInvoice.invoiceNumber}</p>
                                    </div>
                                    <div>{getStatusBadge(selectedInvoice.status)}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-surface-highlight/10 p-3 rounded-lg border border-border">
                                        <p className="text-xs font-mono text-secondary uppercase">Invoice Date</p>
                                        <p className="text-sm font-bold text-primary">{new Date(selectedInvoice.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="bg-surface-highlight/10 p-3 rounded-lg border border-border">
                                        <p className="text-xs font-mono text-secondary uppercase">Due Date</p>
                                        <p className="text-sm font-bold text-primary">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                {/* Items Table */}
                                {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-primary mb-3 uppercase">Items</h4>
                                        <div className="bg-background rounded-lg border border-border overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-surface-highlight/20 text-secondary">
                                                    <tr>
                                                        <th className="text-left py-2 px-3">Description</th>
                                                        <th className="text-right py-2 px-3">Qty</th>
                                                        <th className="text-right py-2 px-3">Rate</th>
                                                        <th className="text-right py-2 px-3">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border">
                                                    {selectedInvoice.items.map((item, i) => (
                                                        <tr key={i}>
                                                            <td className="py-2 px-3 text-primary">
                                                               {item.service || item.description}
                                                            </td>
                                                            <td className="py-2 px-3 text-right text-secondary">{item.quantity}</td>
                                                            <td className="py-2 px-3 text-right text-secondary">₹{(item.rate || 0).toLocaleString()}</td>
                                                            <td className="py-2 px-3 text-right font-bold text-primary">
                                                                ₹{((item.quantity || 0) * (item.rate || 0)).toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Payment Breakdown */}
                                <div className="bg-accent/5 p-4 rounded-xl border border-accent/20">
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <p className="text-xs font-mono text-secondary uppercase">Total</p>
                                            <p className="text-lg font-bold text-primary">₹{selectedInvoice.totalAmount.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-mono text-secondary uppercase">Paid</p>
                                            <p className="text-lg font-bold text-success">₹{(selectedInvoice.paidAmount || 0).toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-mono text-secondary uppercase">Due</p>
                                            <p className="text-lg font-bold text-error">₹{((selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0)).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t border-border bg-surface-highlight/10 flex justify-end">
                                <Button variant="ghost" onClick={() => setShowViewModal(false)}>Close</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default ClientInvoices;
