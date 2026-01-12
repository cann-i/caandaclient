import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from '../../api/axios';
import { BASE_URL } from '../../config';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  MessageSquare,
  Plus,
  Search,
  Filter,
  X,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
  File
} from 'lucide-react';
import Button from '../../components/ui/Button';

function ClientRequests({ showToast }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [requestType, setRequestType] = useState('Document Request');
  const [priority, setPriority] = useState('Normal');
  const [financialYear, setFinancialYear] = useState('');
  const [description, setDescription] = useState('');

  // Filter & Pagination States
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedType, setSelectedType] = useState('All Types');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const requestTypes = ['Document Request', 'Query', 'Appointment', 'Consultation', 'Other'];

  const financialYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const options = [];
    for (let i = 0; i < 5; i++) {
      const start = currentYear - i;
      options.push(`${start}-${start + 1}`);
    }
    return options;
  }, []);

  useEffect(() => {
    if (financialYearOptions.length > 0 && !financialYear) {
      setFinancialYear(financialYearOptions[0]);
    }
  }, [financialYearOptions, financialYear]);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const storedUser = JSON.parse(localStorage.getItem('user'));
      if (!storedUser) { setLoading(false); return; }

      const isCA = storedUser.role === 'admin' || storedUser.role === 'CA';
      let url = '/requests';
      if (!isCA) url = `/requests/user/${storedUser.id}`;

      const res = await axios.get(url);
      setRequests(res.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
      showToast('Error loading requests', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description) { showToast('Please enter a description', 'error'); return; }
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser || !storedUser.id) { showToast('User not identified', 'error'); return; }

    try {
      await axios.post('/requests', {
        client_id: storedUser.id,
        request_type: requestType,
        description: description,
        priority: priority,
        financial_year: financialYear
      });
      showToast('Request submitted successfully!', 'success');
      setDescription('');
      setIsModalOpen(false);
      fetchRequests();
    } catch (error) {
      console.error('Error submitting request:', error);
      showToast('Error submitting request', 'error');
    }
  };

  const stats = useMemo(() => {
    return {
      pending: requests.filter(r => r.status === 'Pending').length,
      inProgress: requests.filter(r => r.status === 'In Progress').length,
      resolved: requests.filter(r => r.status === 'Resolved').length
    };
  }, [requests]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(requests.map(r => r.request_type));
    return ['All Types', ...Array.from(types).sort()];
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const matchesStatus = selectedStatus === 'All Status' || req.status === selectedStatus;
      const matchesType = selectedType === 'All Types' || req.request_type === selectedType;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = (req.description && req.description.toLowerCase().includes(searchLower)) || (req.request_type && req.request_type.toLowerCase().includes(searchLower));
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [requests, selectedStatus, selectedType, searchQuery]);

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const resetFilters = () => {
    setSelectedStatus('All Status');
    setSelectedType('All Types');
    setSearchQuery('');
    setCurrentPage(1);
    showToast('Filters reset', 'info');
  };

  const handleViewRequest = (req) => {
    setSelectedRequest(req);
    setIsViewModalOpen(true);
  };

  const handleDownload = async (documentPath) => {
    try {
      if (!documentPath) return;
      const fileName = documentPath.split(/[/\\]/).pop();

      showToast('Downloading document...', 'info');
      const fileUrl = `${BASE_URL}/${documentPath}`;

      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Network response was not ok');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast('Download completed', 'success');
    } catch (error) {
      console.error('Download failed:', error);
      showToast('Failed to download document', 'error');
    }
  };

  const getStatusBadge = (status) => {
     switch(status) {
        case 'Pending': return <span className="flex items-center gap-1 text-xs font-bold text-warning bg-warning/10 px-2 py-1 rounded border border-warning/20"><Clock size={12}/> Pending</span>;
        case 'In Progress': return <span className="flex items-center gap-1 text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded border border-accent/20"><Loader2 size={12} className="animate-spin"/> In Progress</span>;
        case 'Resolved': return <span className="flex items-center gap-1 text-xs font-bold text-success bg-success/10 px-2 py-1 rounded border border-success/20"><CheckCircle size={12}/> Resolved</span>;
        case 'Rejected': return <span className="flex items-center gap-1 text-xs font-bold text-error bg-error/10 px-2 py-1 rounded border border-error/20"><X size={12}/> Rejected</span>;
        default: return <span className="text-xs text-secondary">{status}</span>;
     }
  };

  if (loading && requests.length === 0) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-accent" size={32} /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">My Requests</h1>
          <p className="text-secondary text-sm">Track and manage your service requests.</p>
        </div>
        <Button variant="accent" onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus size={16} /> New Request
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
               <p className="text-xs font-mono text-secondary uppercase">Resolved</p>
               <h3 className="text-2xl font-bold text-success">{stats.resolved}</h3>
            </div>
            <CheckCircle className="text-success/20" size={32} />
         </div>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4">
         <div className="relative md:w-1/4">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={16} />
            <select value={selectedType} onChange={e => {setSelectedType(e.target.value); setCurrentPage(1);}} className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent outline-none appearance-none">
               {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
         </div>
         <div className="relative md:w-1/4">
            <select value={selectedStatus} onChange={e => {setSelectedStatus(e.target.value); setCurrentPage(1);}} className="w-full px-4 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent outline-none appearance-none">
               <option>All Status</option>
               <option>Pending</option>
               <option>In Progress</option>
               <option>Resolved</option>
               <option>Rejected</option>
            </select>
         </div>
         <div className="relative md:w-1/2 flex gap-2">
            <div className="relative flex-1">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={16} />
               <input type="text" placeholder="Search..." value={searchQuery} onChange={e => {setSearchQuery(e.target.value); setCurrentPage(1);}} className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent outline-none" />
            </div>
            {(selectedStatus !== 'All Status' || selectedType !== 'All Types' || searchQuery !== '') && (
               <Button variant="ghost" onClick={resetFilters}><RefreshCw size={16}/></Button>
            )}
         </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-border bg-surface-highlight/30">
                     <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Type</th>
                     <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Description</th>
                     <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Priority</th>
                     <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-center">Status</th>
                     <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-right">Date</th>
                     <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-right">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border">
                  {currentItems.length > 0 ? (
                     currentItems.map((req) => (
                        <tr key={req.id} className="hover:bg-surface-highlight/50 transition-colors group">
                           <td className="p-4 text-sm font-bold text-primary">{req.request_type}</td>
                           <td className="p-4 text-sm text-secondary max-w-xs truncate" title={req.description}>{req.description}</td>
                           <td className="p-4">
                              <span className={`text-xs font-bold uppercase ${req.priority === 'Urgent' ? 'text-error' : req.priority === 'Normal' ? 'text-accent' : 'text-secondary'}`}>{req.priority}</span>
                           </td>
                           <td className="p-4 text-center">{getStatusBadge(req.status)}</td>
                           <td className="p-4 text-right text-xs text-secondary font-mono">{new Date(req.created_at).toLocaleDateString()}</td>
                           <td className="p-4 text-right">
                              <Button variant="ghost" size="sm" onClick={() => handleViewRequest(req)} className="h-8 w-8 p-0 rounded-full"><Eye size={16} /></Button>
                           </td>
                        </tr>
                     ))
                  ) : (
                     <tr><td colSpan={6} className="p-12 text-center text-secondary">No requests found.</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      </div>

      {/* View Modal */}
      <AnimatePresence>
         {isViewModalOpen && selectedRequest && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="bg-surface border border-border rounded-xl w-full max-w-lg overflow-hidden">
                  <div className="p-6 border-b border-border flex justify-between items-center bg-surface-highlight/20">
                     <h3 className="text-lg font-bold text-primary">Request Details</h3>
                     <button onClick={() => setIsViewModalOpen(false)}><X size={20} className="text-secondary hover:text-primary"/></button>
                  </div>
                  <div className="p-6 space-y-4">
                     <div className="flex justify-between">
                        <div><p className="text-xs text-secondary uppercase">Type</p><p className="font-bold text-primary">{selectedRequest.request_type}</p></div>
                        <div className="text-right"><p className="text-xs text-secondary uppercase">Date</p><p className="font-mono text-primary">{new Date(selectedRequest.created_at).toLocaleDateString()}</p></div>
                     </div>
                     <div><p className="text-xs text-secondary uppercase">Description</p><p className="text-sm text-primary mt-1 bg-surface-highlight/10 p-3 rounded-lg border border-border">{selectedRequest.description}</p></div>
                     {selectedRequest.reply && (
                        <div><p className="text-xs text-secondary uppercase">Reply</p><p className="text-sm text-primary mt-1 bg-accent/5 p-3 rounded-lg border border-accent/20">{selectedRequest.reply}</p></div>
                     )}
                     {selectedRequest.document && (
                        <div><p className="text-xs text-secondary uppercase mb-1">Attachment</p><Button variant="secondary" size="sm" onClick={() => handleDownload(selectedRequest.document)} className="w-full justify-start"><File size={14} className="mr-2"/> Download</Button></div>
                     )}
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
         {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="bg-surface border border-border rounded-xl w-full max-w-lg overflow-hidden">
                  <div className="p-6 border-b border-border flex justify-between items-center bg-surface-highlight/20">
                     <h3 className="text-lg font-bold text-primary">New Request</h3>
                     <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-secondary hover:text-primary"/></button>
                  </div>
                  <form onSubmit={handleSubmit} className="p-6 space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs text-secondary uppercase mb-1">Type</label>
                           <select value={requestType} onChange={e => setRequestType(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent outline-none">
                              {requestTypes.map(t => <option key={t} value={t}>{t}</option>)}
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs text-secondary uppercase mb-1">Priority</label>
                           <select value={priority} onChange={e => setPriority(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent outline-none">
                              <option>Low</option><option>Normal</option><option>Urgent</option>
                           </select>
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs text-secondary uppercase mb-1">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent outline-none h-24 resize-none" placeholder="Describe your request..." required></textarea>
                     </div>
                     <div className="pt-2"><Button variant="accent" type="submit" className="w-full">Submit Request</Button></div>
                  </form>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
}

export default ClientRequests;
