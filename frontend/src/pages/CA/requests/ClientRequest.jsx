import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';
import {
  FileText,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle,
  X,
  Search,
  Filter,
  Trash2,
  Reply,
  Eye,
  Download,
  Loader2,
  Paperclip,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Button from '../../../components/ui/Button';

// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

function ClientRequest({ showToast }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [selectedClient, setSelectedClient] = useState('all');
    const [selectedType, setSelectedType] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Modal states
    const [showReplyModal, setShowReplyModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [replyStatus, setReplyStatus] = useState('Pending');
    const [replyFiles, setReplyFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const requestTypes = ['Document Request', 'Query', 'Appointment', 'Consultation', 'Other'];
    const statusOptions = ['Pending', 'In Progress', 'Resolved', 'Rejected'];

    const fetchRequests = React.useCallback(async () => {
        try {
            setLoading(true);
            const [reqsRes, clientsRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/requests`),
                axios.get(`${API_BASE_URL}/clients`)
            ]);
            setRequests(reqsRes.data);
            setClients(clientsRes.data);
        } catch (error) {
            console.error('Error fetching requests:', error);
            if(showToast) showToast('Error loading requests', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    useEffect(() => {
        if (location.state?.clientId) {
            setSelectedClient(location.state.clientId);
        }
        if (location.state?.requestId && location.state?.openReply && requests.length > 0) {
            const request = requests.find(r => r.id === location.state.requestId);
            if (request) {
                handleOpenReply(request);
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [location.state, requests, navigate, location.pathname]);

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                setShowViewModal(false);
                setShowReplyModal(false);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const matchesClient = selectedClient === 'all' || req.client_id === parseInt(selectedClient);
            const matchesType = selectedType === 'all' || req.request_type === selectedType;
            const matchesStatus = selectedStatus === 'all' || req.status === selectedStatus;
            const searchStr = searchQuery.toLowerCase();
            const matchesSearch = searchQuery === '' ||
                (req.description && req.description.toLowerCase().includes(searchStr)) ||
                (req.client_name && req.client_name.toLowerCase().includes(searchStr));
            return matchesClient && matchesType && matchesStatus && matchesSearch;
        });
    }, [requests, selectedClient, selectedType, selectedStatus, searchQuery]);

    const stats = useMemo(() => {
        return {
            total: requests.length,
            pending: requests.filter(r => r.status === 'Pending').length,
            inProgress: requests.filter(r => r.status === 'In Progress').length,
            resolved: requests.filter(r => r.status === 'Resolved').length
        };
    }, [requests]);

    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const handleOpenReply = (req) => {
        setSelectedRequest(req);
        setReplyText(req.reply || '');
        setReplyStatus(req.status);
        setReplyFiles([]);
        setShowReplyModal(true);
    };

    const handleOpenView = (req) => {
        setSelectedRequest(req);
        setShowViewModal(true);
    };

    const handleUpdateReply = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('status', replyStatus);
        formData.append('reply', replyText);
        formData.append('client_id', selectedRequest.client_id);
        if (replyFiles.length > 0) formData.append('file', replyFiles[0]);

        try {
            await axios.put(`${API_BASE_URL}/requests/${selectedRequest.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showToast('Reply submitted successfully', 'success');
            setShowReplyModal(false);
            setReplyFiles([]);
            fetchRequests();
        } catch (error) {
            console.error('Error updating reply:', error);
            showToast('Error submitting reply', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRequest = async (id) => {
        if (window.confirm('Are you sure you want to delete this request?')) {
            try {
                await axios.delete(`${API_BASE_URL}/requests/${id}`);
                showToast('Request deleted successfully', 'success');
                fetchRequests();
            } catch (error) {
                console.error('Error deleting request:', error);
                showToast('Error deleting request', 'error');
            }
        }
    };

    const resetFilters = () => {
        setSelectedClient('all');
        setSelectedType('all');
        setSelectedStatus('all');
        setSearchQuery('');
        showToast('Filters reset', 'info');
    };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Pending': return 'text-warning bg-warning/10 border-warning/20';
            case 'In Progress': return 'text-accent bg-accent/10 border-accent/20';
            case 'Resolved': return 'text-success bg-success/10 border-success/20';
            case 'Rejected': return 'text-error bg-error/10 border-error/20';
            default: return 'text-secondary bg-surface-highlight border-border';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Pending': return <Clock size={12} className="mr-1" />;
            case 'In Progress': return <Loader2 size={12} className="mr-1 animate-spin" />;
            case 'Resolved': return <CheckCircle size={12} className="mr-1" />;
            case 'Rejected': return <X size={12} className="mr-1" />;
            default: return null;
        }
    };

    const getRequestTypeBadgeClass = (type) => {
       // Just visual consistency
       return 'bg-surface-highlight text-primary border-border';
    };

    const getPriorityBadgeClass = (priority) => {
        switch (priority) {
            case 'Urgent': return 'text-error font-bold';
            case 'Normal': return 'text-accent';
            case 'Low': return 'text-secondary';
            default: return 'text-secondary';
        }
    };

    const handleDownload = async (fileUrl, fileName) => {
        try {
            const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/${fileUrl}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const extension = fileUrl.split('.').pop();
            const originalName = fileUrl.split(/[/\\]/).pop();
            const fullFileName = fileName ? `${fileName}.${extension}` : originalName;
            link.setAttribute('download', fullFileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading file:', error);
            showToast('Error downloading file', 'error');
        }
    };

    const selectStyles = {
        control: (base) => ({
          ...base,
          backgroundColor: '#121212',
          borderColor: '#2A2A2A',
          color: '#E0E0E0',
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

    if (loading && requests.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-primary tracking-tight">Request Management</h1>
                    <p className="text-sm text-secondary">Manage client requests and tasks.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-mono text-secondary uppercase">Total</p>
                        <h3 className="text-2xl font-bold text-primary">{stats.total}</h3>
                    </div>
                    <FileText className="text-accent/20" size={32} />
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
                        <p className="text-xs font-mono text-secondary uppercase">Resolved</p>
                        <h3 className="text-2xl font-bold text-success">{stats.resolved}</h3>
                    </div>
                    <CheckCircle className="text-success/20" size={32} />
                </div>
            </div>

            {/* Filters */}
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
                            options={[
                                { value: 'all', label: 'All Clients' },
                                ...clients.map(c => ({ value: c.id, label: c.client_name }))
                            ]}
                            isSearchable={true}
                            styles={selectStyles}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-mono text-secondary uppercase mb-2">Type</label>
                        <select
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent outline-none"
                            value={selectedType} onChange={e => setSelectedType(e.target.value)}
                        >
                            <option value="all">All Types</option>
                            {requestTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-mono text-secondary uppercase mb-2">Status</label>
                        <select
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent outline-none"
                            value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-mono text-secondary uppercase mb-2">Search</label>
                        <div className="relative">
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={14} />
                           <input
                             type="text"
                             placeholder="Search..."
                             value={searchQuery}
                             onChange={e => setSearchQuery(e.target.value)}
                             className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent outline-none"
                           />
                        </div>
                    </div>
                </div>
                {(selectedClient !== 'all' || selectedType !== 'all' || selectedStatus !== 'all' || searchQuery !== '') && (
                    <div className="mt-4 flex justify-end">
                        <Button variant="ghost" size="sm" onClick={resetFilters} className="text-secondary hover:text-primary gap-2">
                            <X size={14} /> Reset
                        </Button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-surface-highlight/30">
                                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Client</th>
                                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Type & Priority</th>
                                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Description</th>
                                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-center">Status</th>
                                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Date</th>
                                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            <AnimatePresence>
                                {currentItems.map((req, idx) => (
                                    <motion.tr
                                        key={req.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="hover:bg-surface-highlight/50 transition-colors group"
                                    >
                                        <td className="p-4">
                                            <p className="text-sm font-bold text-primary">{req.client_name}</p>
                                            <p className="text-xs text-secondary">{req.client_email}</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-primary">{req.request_type}</span>
                                                <span className={`text-[10px] uppercase font-bold ${getPriorityBadgeClass(req.priority)}`}>
                                                    {req.priority}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm text-secondary line-clamp-1 max-w-xs" title={req.description}>
                                                {req.description}
                                            </p>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusBadgeClass(req.status)}`}>
                                                {getStatusIcon(req.status)}
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs text-secondary font-mono">
                                                {new Date(req.created_at).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenReply(req)} className="p-1.5 hover:bg-surface-highlight rounded text-secondary hover:text-accent" title="Reply"><Reply size={16} /></button>
                                                <button onClick={() => handleOpenView(req)} className="p-1.5 hover:bg-surface-highlight rounded text-secondary hover:text-primary" title="View"><Eye size={16} /></button>
                                                {req.status === 'Resolved' && req.document && (
                                                    <button onClick={() => handleDownload(req.document)} className="p-1.5 hover:bg-surface-highlight rounded text-secondary hover:text-success" title="Download"><Download size={16} /></button>
                                                )}
                                                <button onClick={() => handleDeleteRequest(req.id)} className="p-1.5 hover:bg-surface-highlight rounded text-secondary hover:text-error" title="Delete"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                            {currentItems.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-secondary">
                                        <MessageSquare size={32} className="mx-auto mb-2 opacity-20" />
                                        <p>No requests found</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredRequests.length > 0 && (
                    <div className="p-4 border-t border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <span className="text-xs text-secondary">Rows:</span>
                           <select
                             value={itemsPerPage}
                             onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                             className="bg-background border border-border rounded text-xs text-primary p-1 outline-none"
                           >
                              <option value={10}>10</option>
                              <option value={20}>20</option>
                              <option value={50}>50</option>
                           </select>
                           <span className="text-xs text-secondary ml-4">
                              {((currentPage-1)*itemsPerPage)+1}-{Math.min(currentPage*itemsPerPage, filteredRequests.length)} of {filteredRequests.length}
                           </span>
                        </div>
                        <div className="flex gap-2">
                           <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft size={16} /></Button>
                           <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight size={16} /></Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Reply Modal */}
            <AnimatePresence>
                {showReplyModal && selectedRequest && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                            <div className="p-6 border-b border-border flex justify-between items-center bg-surface-highlight/20">
                                <h3 className="text-lg font-bold text-primary">Reply to Request</h3>
                                <button onClick={() => setShowReplyModal(false)}><X size={20} className="text-secondary hover:text-primary" /></button>
                            </div>
                            <form onSubmit={handleUpdateReply} className="p-6 space-y-4">
                                <div className="bg-surface-highlight/10 p-4 rounded-lg border border-border">
                                    <p className="text-xs font-mono text-secondary uppercase mb-1">Request: {selectedRequest.request_type}</p>
                                    <p className="text-sm text-primary">{selectedRequest.description}</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-mono text-secondary uppercase mb-2">Reply</label>
                                    <textarea
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent outline-none resize-none h-32"
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        placeholder="Type your response..."
                                        required
                                    ></textarea>
                                </div>

                                <div>
                                    <label className="block text-xs font-mono text-secondary uppercase mb-2">Attachment</label>
                                    <div className="border border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-surface-highlight/20 transition relative">
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setReplyFiles(Array.from(e.target.files))} />
                                        <Paperclip size={20} className="mx-auto text-accent mb-2" />
                                        <p className="text-xs text-secondary">{replyFiles.length > 0 ? replyFiles[0].name : 'Click to attach a file'}</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-mono text-secondary uppercase mb-2">Status</label>
                                    <select
                                        value={replyStatus}
                                        onChange={e => setReplyStatus(e.target.value)}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent outline-none"
                                    >
                                        {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-border">
                                    <Button variant="ghost" onClick={() => setShowReplyModal(false)} type="button">Cancel</Button>
                                    <Button variant="accent" type="submit" disabled={isSubmitting} className="w-full">
                                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Submit Reply'}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* View Modal */}
            <AnimatePresence>
                {showViewModal && selectedRequest && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowViewModal(false)}>
                        <motion.div
                           initial={{ scale: 0.9, opacity: 0 }}
                           animate={{ scale: 1, opacity: 1 }}
                           exit={{ scale: 0.9, opacity: 0 }}
                           className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden"
                           onClick={e => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-border flex justify-between items-center bg-surface-highlight/20">
                                <h3 className="text-lg font-bold text-primary">Request Details</h3>
                                <button onClick={() => setShowViewModal(false)}><X size={20} className="text-secondary hover:text-primary" /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-mono text-secondary uppercase">Client</p>
                                        <p className="text-sm font-bold text-primary">{selectedRequest.client_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-mono text-secondary uppercase">Date</p>
                                        <p className="text-sm font-bold text-primary">{new Date(selectedRequest.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-mono text-secondary uppercase">Description</p>
                                    <p className="text-sm text-primary mt-1 bg-surface-highlight/10 p-3 rounded-lg border border-border">{selectedRequest.description}</p>
                                </div>
                                {selectedRequest.reply && (
                                    <div>
                                        <p className="text-xs font-mono text-secondary uppercase">Reply</p>
                                        <p className="text-sm text-primary mt-1 bg-accent/5 p-3 rounded-lg border border-accent/20">{selectedRequest.reply}</p>
                                    </div>
                                )}
                                {selectedRequest.document && (
                                    <div>
                                        <p className="text-xs font-mono text-secondary uppercase mb-1">Attachment</p>
                                        <Button variant="secondary" size="sm" onClick={() => handleDownload(selectedRequest.document)} className="w-full justify-start">
                                            <Download size={14} className="mr-2" /> Download Attachment
                                        </Button>
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

export default ClientRequest;
