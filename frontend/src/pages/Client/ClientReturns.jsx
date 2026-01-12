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
  List
} from 'lucide-react';
import Button from '../../components/ui/Button';

function ClientReturns({ showToast }) {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Filter states
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // View Modal State
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);

  // Initial User Fetch
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Fetch Returns
  const fetchReturns = React.useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const response = await axios.get('/returns', {
        params: { user_id: user.id }
      });
      setReturns(response.data);
    } catch (error) {
      console.error('Error fetching returns:', error);
      if(showToast) showToast('Error loading returns', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

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

  // Filtered Returns
  const filteredReturns = useMemo(() => {
    return returns.filter(ret => {
      const matchesType = selectedType === 'all' || ret.return_type === selectedType;
      const matchesStatus = selectedStatus === 'all' || ret.status === selectedStatus;

      const searchStr = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' ||
        (ret.return_type && ret.return_type.toLowerCase().includes(searchStr)) ||
        (ret.period && ret.period.toLowerCase().includes(searchStr)) ||
        (ret.notes && ret.notes.toLowerCase().includes(searchStr));

      return matchesType && matchesStatus && matchesSearch;
    });
  }, [returns, selectedType, selectedStatus, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: returns.length,
      pending: returns.filter(r => r.status === 'pending').length,
      inProgress: returns.filter(r => r.status === 'in_progress').length,
      completed: returns.filter(r => ['completed', 'filled', 'filed'].includes(r.status)).length,
    };
  }, [returns]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredReturns.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReturns.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Helpers
  const getStatusBadge = (status) => {
    if (!status) return null;
    const s = status.toLowerCase();
    switch (s) {
       case 'pending': return <span className="flex items-center gap-1 text-xs font-bold text-warning bg-warning/10 px-2 py-1 rounded border border-warning/20"><Clock size={12}/> Pending</span>;
       case 'in_progress': return <span className="flex items-center gap-1 text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded border border-accent/20"><Loader2 size={12} className="animate-spin"/> In Progress</span>;
       case 'completed': case 'filled': case 'filed': return <span className="flex items-center gap-1 text-xs font-bold text-success bg-success/10 px-2 py-1 rounded border border-success/20"><CheckCircle size={12}/> Completed</span>;
       case 'overdue': return <span className="flex items-center gap-1 text-xs font-bold text-error bg-error/10 px-2 py-1 rounded border border-error/20"><AlertCircle size={12}/> Overdue</span>;
       default: return <span className="text-xs text-secondary">{s}</span>;
    }
  };

  const formatStatus = (status) => {
    if (!status) return '-';
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const handleOpenView = (ret) => {
    setSelectedReturn(ret);
    setShowViewModal(true);
  };

  const resetFilters = () => {
    setSelectedType('all');
    setSelectedStatus('all');
    setSearchQuery('');
    showToast('Filters reset', 'info');
  };

  const uniqueTypes = useMemo(() => {
    return [...new Set(returns.map(r => r.return_type))].filter(Boolean);
  }, [returns]);

  if (loading && returns.length === 0) {
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
          <h2 className="text-2xl font-bold text-primary tracking-tight">My Returns</h2>
          <p className="text-secondary text-sm">Track your GST, Income Tax, and other filings.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
            <div>
               <p className="text-xs font-mono text-secondary uppercase">Total Returns</p>
               <h3 className="text-2xl font-bold text-primary">{stats.total}</h3>
            </div>
            <List className="text-accent/20" size={32} />
         </div>
         <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
            <div>
               <p className="text-xs font-mono text-secondary uppercase">Pending</p>
               <h3 className="text-2xl font-bold text-warning">{stats.pending}</h3>
            </div>
            <Clock className="text-warning/20" size={32} />
         </div>
         <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
            <div>
               <p className="text-xs font-mono text-secondary uppercase">In Progress</p>
               <h3 className="text-2xl font-bold text-accent">{stats.inProgress}</h3>
            </div>
            <Loader2 className="text-accent/20" size={32} />
         </div>
         <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
            <div>
               <p className="text-xs font-mono text-secondary uppercase">Completed</p>
               <h3 className="text-2xl font-bold text-success">{stats.completed}</h3>
            </div>
            <CheckCircle className="text-success/20" size={32} />
         </div>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4">
         <div className="relative md:w-1/4">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={16} />
            <select value={selectedType} onChange={e => {setSelectedType(e.target.value); setCurrentPage(1);}} className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent outline-none appearance-none">
               <option value="all">All Types</option>
               {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
         </div>
         <div className="relative md:w-1/4">
            <select value={selectedStatus} onChange={e => {setSelectedStatus(e.target.value); setCurrentPage(1);}} className="w-full px-4 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent outline-none appearance-none">
               <option value="all">All Status</option>
               <option value="pending">Pending</option>
               <option value="in_progress">In Progress</option>
               <option value="completed">Completed</option>
               <option value="filled">Filled</option>
               <option value="overdue">Overdue</option>
            </select>
         </div>
         <div className="relative md:w-1/2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={16} />
            <input type="text" placeholder="Search..." value={searchQuery} onChange={e => {setSearchQuery(e.target.value); setCurrentPage(1);}} className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent outline-none" />
         </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-highlight/30">
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Return Type</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Financial Year</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Assessment Year</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-center">Status</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <AnimatePresence>
                {currentItems.length === 0 ? (
                  <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <td colSpan="5" className="p-12 text-center text-secondary">
                        <FileText size={32} className="mx-auto mb-2 opacity-20" />
                        <p>No returns found.</p>
                    </td>
                  </motion.tr>
                ) : (
                  currentItems.map((ret, idx) => (
                    <motion.tr
                      key={ret.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-surface-highlight/50 transition-colors group"
                    >
                      <td className="p-4 font-bold text-primary">{ret.return_type}</td>
                      <td className="p-4 text-sm text-secondary font-mono">{ret.financial_year || '-'}</td>
                      <td className="p-4 text-sm text-secondary font-mono">{ret.assessment_year || '-'}</td>
                      <td className="p-4 text-center">{getStatusBadge(ret.status)}</td>
                      <td className="p-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenView(ret)} className="h-8 w-8 p-0 rounded-full"><Eye size={16} /></Button>
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
          <div className="p-4 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
               <span className="text-xs text-secondary">Rows:</span>
               <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-background border border-border rounded text-xs text-primary p-1 outline-none">
                  <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
               </select>
               <span className="text-xs text-secondary ml-4">{((currentPage-1)*itemsPerPage)+1}-{Math.min(currentPage*itemsPerPage, filteredReturns.length)} of {filteredReturns.length}</span>
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
        {showViewModal && selectedReturn && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowViewModal(false)}>
            <motion.div
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-surface border border-border rounded-xl w-full max-w-lg overflow-hidden"
               onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-surface-highlight/20">
                <h3 className="text-lg font-bold text-primary">Return Details</h3>
                <button onClick={() => setShowViewModal(false)}><X size={20} className="text-secondary hover:text-primary"/></button>
              </div>
              <div className="p-6 space-y-4">
                 <div className="flex justify-between items-start">
                    <div>
                       <p className="text-xs font-mono text-secondary uppercase">Return Type</p>
                       <p className="text-lg font-bold text-primary">{selectedReturn.return_type}</p>
                    </div>
                    <div>
                       {getStatusBadge(selectedReturn.status)}
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-highlight/10 p-3 rounded-lg border border-border">
                       <p className="text-xs font-mono text-secondary uppercase">Financial Year</p>
                       <p className="text-sm font-bold text-primary">{selectedReturn.financial_year || '-'}</p>
                    </div>
                    <div className="bg-surface-highlight/10 p-3 rounded-lg border border-border">
                       <p className="text-xs font-mono text-secondary uppercase">Assessment Year</p>
                       <p className="text-sm font-bold text-primary">{selectedReturn.assessment_year || '-'}</p>
                    </div>
                 </div>
                 {selectedReturn.notes && (
                    <div className="bg-accent/5 p-3 rounded-lg border border-accent/20">
                       <p className="text-xs font-mono text-secondary uppercase mb-1">Notes</p>
                       <p className="text-sm text-primary">{selectedReturn.notes}</p>
                    </div>
                 )}
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

export default ClientReturns;
