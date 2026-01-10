import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';

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
    const [itemsPerPage] = useState(10);

    // Modal states
    const [showReplyModal, setShowReplyModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [replyStatus, setReplyStatus] = useState('Pending');
    const [replyFiles, setReplyFiles] = useState([]);

    const requestTypes = ['Document Request', 'Query', 'Appointment', 'Consultation', 'Other'];
    const statusOptions = ['Pending', 'In Progress', 'Resolved', 'Rejected'];


    // Fetch data
    const fetchRequests = React.useCallback(async () => {
        try {
            setLoading(true);
            const [reqsRes, clientsRes] = await Promise.all([
                axios.get('http://localhost:5000/api/requests'),
                axios.get('http://localhost:5000/api/clients')
            ]);
            setRequests(reqsRes.data);
            setClients(clientsRes.data);
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

    useEffect(() => {
        if (location.state?.clientId) {
            setSelectedClient(location.state.clientId);
        }

        // Handle auto-opening reply modal from notification
        if (location.state?.requestId && location.state?.openReply && requests.length > 0) {
            const request = requests.find(r => r.id === location.state.requestId);
            if (request) {
                handleOpenReply(request);
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [location.state, requests, navigate, location.pathname]);

    // Handle ESC key to close modal
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

    // Filtered requests
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

    // Stats
    const stats = useMemo(() => {
        return {
            total: requests.length,
            pending: requests.filter(r => r.status === 'Pending').length,
            inProgress: requests.filter(r => r.status === 'In Progress').length,
            resolved: requests.filter(r => r.status === 'Resolved').length
        };
    }, [requests]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // Actions
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

        const formData = new FormData();
        formData.append('status', replyStatus);
        formData.append('reply', replyText);
        formData.append('client_id', selectedRequest.client_id);

        if (replyFiles.length > 0) {
            formData.append('file', replyFiles[0]);
        }

        try {
            await axios.put(`http://localhost:5000/api/requests/${selectedRequest.id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            showToast('Reply submitted successfully', 'success');
            setShowReplyModal(false);
            setReplyFiles([]);
            fetchRequests();
        } catch (error) {
            console.error('Error updating reply:', error);
            showToast('Error submitting reply', 'error');
        }
    };

    const handleDeleteRequest = async (id) => {
        if (window.confirm('Are you sure you want to delete this request?')) {
            try {
                await axios.delete(`http://localhost:5000/api/requests/${id}`);
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
            case 'Pending': return 'bg-amber-100 text-amber-700';
            case 'In Progress': return 'bg-blue-100 text-blue-700';
            case 'Resolved': return 'bg-green-100 text-green-700';
            case 'Rejected': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getRequestTypeBadgeClass = (type) => {
        switch (type) {
            case 'Document Request': return 'bg-blue-100 text-blue-700';
            case 'Query': return 'bg-purple-100 text-purple-700';
            case 'Appointment': return 'bg-orange-100 text-orange-700';
            case 'Consultation': return 'bg-teal-100 text-teal-700';
            case 'Other': return 'bg-gray-100 text-gray-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getPriorityBadgeClass = (priority) => {
        switch (priority) {
            case 'Urgent': return 'bg-rose-100 text-rose-700';
            case 'Normal': return 'bg-indigo-100 text-indigo-700';
            case 'Low': return 'bg-slate-100 text-slate-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const handleDownload = async (fileUrl, fileName) => {
        try {
            const response = await axios.get(`http://localhost:5000/${fileUrl}`, {
                responseType: 'blob',
            });
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

    if (loading && requests.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Request Management</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage client requests and tasks</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-30 group-hover:scale-110 transition-transform z-0">
                        <i className="fas fa-list-ul text-4xl text-white"></i>
                    </div>
                    <div className="relative z-10">
                        <p className="text-purple-100 text-sm font-medium uppercase tracking-wider mb-1">Total Requests</p>
                        <h3 className="text-3xl font-black tracking-tight mb-1">{stats.total}</h3>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-30 group-hover:scale-110 transition-transform z-0">
                        <i className="fas fa-clock text-4xl text-white"></i>
                    </div>
                    <div className="relative z-10">
                        <p className="text-amber-100 text-sm font-medium uppercase tracking-wider mb-1">Pending</p>
                        <h3 className="text-3xl font-black tracking-tight mb-1">{stats.pending}</h3>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-30 group-hover:scale-110 transition-transform z-0">
                        <i className="fas fa-spinner text-4xl text-white"></i>
                    </div>
                    <div className="relative z-10">
                        <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-1">In Progress</p>
                        <h3 className="text-3xl font-black tracking-tight mb-1">{stats.inProgress}</h3>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-30 group-hover:scale-110 transition-transform z-0">
                        <i className="fas fa-check-circle text-4xl text-white"></i>
                    </div>
                    <div className="relative z-10">
                        <p className="text-green-100 text-sm font-medium uppercase tracking-wider mb-1">Resolved</p>
                        <h3 className="text-3xl font-black tracking-tight mb-1">{stats.resolved}</h3>
                    </div>
                </motion.div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
                        <Select
                            className="w-full text-sm"
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
                            styles={{
                                control: (base) => ({
                                    ...base,
                                    borderColor: '#D1D5DB',
                                    '&:hover': { borderColor: '#A5B4FC' },
                                    borderRadius: '0.5rem',
                                    padding: '2px'
                                })
                            }}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Request Type</label>
                        <select
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                            value={selectedType} onChange={e => setSelectedType(e.target.value)}
                        >
                            <option value="all">All Types</option>
                            {requestTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                            value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                        <input
                            type="text"
                            placeholder="Search description..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                        />
                    </div>
                </div>
                {(selectedClient !== 'all' || selectedType !== 'all' || selectedStatus !== 'all' || searchQuery !== '') && (
                    <div className="mt-4 flex justify-end">
                        <button onClick={resetFilters} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                            <i className="fas fa-times-circle mr-2"></i>Reset Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-100/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">
                                    Client
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">
                                    Type & Priority
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">
                                    Description
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">
                                    Created Date
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">
                                    Completed Date
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-black text-gray-600 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            <AnimatePresence>
                                {currentItems.length === 0 ? (
                                    <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                        <td colSpan="7" className="py-20 text-center">
                                            <div className="flex flex-col items-center">
                                                <i className="fas fa-folder-open text-6xl text-gray-200 mb-4"></i>
                                                <h3 className="text-xl font-semibold text-gray-700 mb-2">No requests found</h3>
                                                <p className="text-gray-500">No requests from clients yet.</p>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ) : (
                                    currentItems.map((req, idx) => (
                                        <motion.tr
                                            key={req.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="hover:bg-gradient-to-r hover:from-purple-50/30 hover:to-indigo-50/30 transition-all duration-300 group"
                                        >
                                            {/* Client Column */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-base font-bold text-gray-900 tracking-tight">{req.client_name}</div>
                                                <div className="text-sm text-gray-500 font-medium">{req.client_email || 'No email'}</div>
                                            </td>

                                            {/* Type & Priority Column */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-2">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold w-fit ${getRequestTypeBadgeClass(req.request_type)}`}>
                                                        {req.request_type}
                                                    </span>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold w-fit ${getPriorityBadgeClass(req.priority)}`}>
                                                        <i className={`${req.priority === 'Urgent' ? 'fas fa-exclamation-circle' : req.priority === 'Normal' ? 'fas fa-circle' : 'fas fa-minus-circle'} mr-1`}></i>
                                                        {req.priority}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Description Column */}
                                            <td className="px-6 py-4">
                                                <div className="max-w-md">
                                                    <p
                                                        className="text-sm text-gray-700 font-medium leading-relaxed"
                                                        title={req.description}
                                                        style={{
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            wordBreak: 'break-word'
                                                        }}
                                                    >
                                                        {req.description}
                                                    </p>
                                                </div>
                                            </td>

                                            {/* Status Column */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getStatusBadgeClass(req.status)}`}>
                                                    <i className={`${req.status === 'Pending' ? 'fas fa-clock' :
                                                        req.status === 'In Progress' ? 'fas fa-spinner' :
                                                            req.status === 'Resolved' ? 'fas fa-check-circle' :
                                                                'fas fa-times-circle'
                                                        } mr-1`}></i>
                                                    {req.status}
                                                </span>
                                            </td>

                                            {/* Created Date Column */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-base font-bold text-gray-900 tracking-tight">
                                                    {new Date(req.created_at).toLocaleDateString('en-GB')}
                                                </div>
                                            </td>

                                            {/* Completed Date Column */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-base font-bold text-gray-900 tracking-tight">
                                                    {req.completed_at ? new Date(req.completed_at).toLocaleDateString('en-GB') : '-'}
                                                </div>
                                            </td>

                                            {/* Actions Column */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => handleOpenReply(req)}
                                                        className="w-10 h-10 flex items-center justify-center text-purple-600 hover:bg-purple-100 rounded-xl transition shadow-sm border border-purple-100 bg-white"
                                                        title="Reply"
                                                    >
                                                        <i className="fas fa-reply text-base"></i>
                                                    </button>

                                                    <button
                                                        onClick={() => handleOpenView(req)}
                                                        className="w-10 h-10 flex items-center justify-center text-blue-600 hover:bg-blue-100 rounded-xl transition shadow-sm border border-blue-100 bg-white"
                                                        title="View Details"
                                                    >
                                                        <i className="fas fa-eye text-base"></i>
                                                    </button>

                                                    {req.status === 'Resolved' && req.document && (
                                                        <button
                                                            onClick={() => handleDownload(req.document)}
                                                            className="w-10 h-10 flex items-center justify-center text-green-600 hover:bg-green-100 rounded-xl transition shadow-sm border border-green-100 bg-white"
                                                            title="Download Document"
                                                        >
                                                            <i className="fas fa-download text-base"></i>
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handleDeleteRequest(req.id)}
                                                        className="w-10 h-10 flex items-center justify-center text-red-600 hover:bg-red-100 rounded-xl transition shadow-sm border border-red-100 bg-white"
                                                        title="Delete"
                                                    >
                                                        <i className="fas fa-trash text-base"></i>
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
                {filteredRequests.length > 0 && (
                    <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-between items-center">
                        <p className="text-sm text-gray-500 font-medium">
                            Showing <span className="text-gray-900 font-bold">{indexOfFirstItem + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(indexOfLastItem, filteredRequests.length)}</span> of <span className="text-gray-900 font-bold">{filteredRequests.length}</span>
                        </p>
                        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-2xl border border-gray-100">
                            <button
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className={`w-9 h-9 flex items-center justify-center rounded-xl transition ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-white hover:text-purple-600 hover:shadow-sm'}`}
                            >
                                <i className="fas fa-chevron-left text-xs"></i>
                            </button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button
                                    key={i + 1}
                                    onClick={() => paginate(i + 1)}
                                    className={`w-9 h-9 rounded-xl text-xs font-black transition ${currentPage === i + 1 ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-white hover:text-purple-600'}`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className={`w-9 h-9 flex items-center justify-center rounded-xl transition ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-white hover:text-purple-600 hover:shadow-sm'}`}
                            >
                                <i className="fas fa-chevron-right text-xs"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Reply Modal */}
            {showReplyModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white flex justify-between items-center">
                            <h3 className="text-xl font-bold">Reply to {selectedRequest?.client_name}</h3>
                            <button onClick={() => setShowReplyModal(false)} className="hover:rotate-90 transition transform"><i className="fas fa-times"></i></button>
                        </div>
                        <form onSubmit={handleUpdateReply} className="p-6 space-y-4">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Original Request</p>
                                        <p className="text-sm font-bold text-gray-800 mt-0.5">{selectedRequest?.title}</p>
                                    </div>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${getRequestTypeBadgeClass(selectedRequest?.request_type)}`}>
                                        {selectedRequest?.request_type}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">{selectedRequest?.description}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Your Reply</label>
                                <textarea
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 h-32 resize-none"
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    placeholder="Type your response here..."
                                    required
                                ></textarea>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Attachments</label>
                                <label className="block border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition cursor-pointer relative text-center">
                                    <input
                                        type="file"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => setReplyFiles(Array.from(e.target.files))}
                                    />
                                    <div className="flex flex-col items-center justify-center text-gray-500">
                                        <i className="fas fa-cloud-upload-alt text-2xl mb-2 text-purple-400"></i>
                                        <p className="text-sm font-medium">Click to attach files</p>
                                        <p className="text-xs text-gray-400">PDF, JPG, PNG up to 10MB</p>
                                    </div>
                                </label>
                                {replyFiles.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {replyFiles.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200 shadow-sm text-sm">
                                                <div className="flex items-center gap-2 truncate">
                                                    <i className="fas fa-file text-purple-500"></i>
                                                    <span className="text-gray-700 truncate">{file.name}</span>
                                                    <span className="text-xs text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setReplyFiles(files => files.filter((_, i) => i !== idx))}
                                                    className="text-red-400 hover:text-red-600 transition"
                                                >
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Update Status</label>
                                <div className="relative">
                                    <select
                                        value={replyStatus}
                                        onChange={(e) => setReplyStatus(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 appearance-none bg-white font-medium text-gray-700"
                                    >
                                        {statusOptions.map(status => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                        <i className="fas fa-chevron-down"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowReplyModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5">Submit Reply</button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
            {/* View Modal */}
            {showViewModal && selectedRequest && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setShowViewModal(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white flex justify-between items-center shrink-0">
                            <h3 className="text-xl font-bold">Request Details</h3>
                            <button onClick={() => setShowViewModal(false)} className="hover:rotate-90 transition transform"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="p-6 space-y-6 overflow-y-auto">
                            {/* Header Info */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Client</p>
                                    <p className="text-lg font-bold text-gray-800">{selectedRequest.client_name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Date</p>
                                    <p className="text-sm font-semibold text-gray-700">{new Date(selectedRequest.created_at).toLocaleDateString('en-GB')}</p>
                                </div>
                            </div>

                            {/* Status Badges */}
                            <div className="flex gap-2 flex-wrap">
                                <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 flex-1 text-center">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Type</p>
                                    <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-full ${getRequestTypeBadgeClass(selectedRequest.request_type)}`}>
                                        {selectedRequest.request_type}
                                    </span>
                                </div>
                                <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 flex-1 text-center">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Priority</p>
                                    <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-full ${getPriorityBadgeClass(selectedRequest.priority)}`}>
                                        {selectedRequest.priority}
                                    </span>
                                </div>
                                <div className="bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 flex-1 text-center">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                                    <span className={`text-xs font-black uppercase px-2 py-0.5 rounded-full ${getStatusBadgeClass(selectedRequest.status)}`}>
                                        {selectedRequest.status}
                                    </span>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Description</p>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedRequest.description}</p>
                            </div>

                            {/* Reply Section */}
                            {selectedRequest.reply && (
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">CA Reply</p>
                                        {selectedRequest.completed_at && (
                                            <span className="text-[10px] text-blue-400 font-medium">
                                                {new Date(selectedRequest.completed_at).toLocaleDateString('en-GB')}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">{selectedRequest.reply}</p>
                                </div>
                            )}

                            {/* Document Section */}
                            {selectedRequest.document && (
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Attachments</p>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                                                <i className="fas fa-file-alt text-lg"></i>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-700">Attached Document</p>

                                            </div>
                                        </div>
                                        <a
                                            href={`http://localhost:5000/${selectedRequest.document}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold text-sm rounded-lg hover:bg-gray-50 hover:text-purple-600 transition shadow-sm flex items-center gap-2"
                                            download
                                        >
                                            <i className="fas fa-eye"></i>View
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
                            <button onClick={() => setShowViewModal(false)} className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition shadow-sm">
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

export default ClientRequest;