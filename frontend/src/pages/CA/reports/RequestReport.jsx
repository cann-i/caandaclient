import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import axios from 'axios';
import Select from 'react-select';

// Set base URL for Axios
const API_BASE_URL = 'http://localhost:5000/api';

function RequestReport({ showToast }) {
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState([]);
    const [clients, setClients] = useState([]);

    // Filter states
    const [clientFilter, setClientFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const statusOptions = ['Pending', 'In Progress', 'Resolved', 'Rejected'];


    // Load Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [reqsRes, clientsRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/requests`),
                    axios.get(`${API_BASE_URL}/clients`)
                ]);
                setRequests(reqsRes.data || []);
                setClients(clientsRes.data || []);
            } catch (error) {
                console.error("Error fetching request data:", error);
                if (showToast) showToast('Failed to load request reports', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [showToast]);

    // Helper to check date range
    const isWithinRange = useCallback((dateStr) => {
        if (!fromDate && !toDate) return true;
        if (!dateStr) return false;
        const date = new Date(dateStr);
        const start = fromDate ? new Date(fromDate) : null;
        if (start) start.setHours(0, 0, 0, 0);

        const end = toDate ? new Date(toDate) : null;
        if (end) end.setHours(23, 59, 59, 999);

        if (start && date < start) return false;
        if (end && date > end) return false;
        return true;
    }, [fromDate, toDate]);

    // Filtered Data
    const filteredRequests = useMemo(() => {
        return requests.filter(req => {
            const matchesClient = clientFilter === 'all' || req.client_id === parseInt(clientFilter);
            const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
            const matchesPriority = priorityFilter === 'all' || req.priority === priorityFilter;
            const matchesDate = isWithinRange(req.created_at);

            return matchesClient && matchesStatus && matchesPriority && matchesDate;
        });
    }, [requests, clientFilter, statusFilter, priorityFilter, isWithinRange]);

    const hasActiveFilters = useMemo(() => {
        return clientFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all' || fromDate !== '' || toDate !== '';
    }, [clientFilter, statusFilter, priorityFilter, fromDate, toDate]);

    // Stats Calculation
    const stats = useMemo(() => {
        const total = filteredRequests.length;
        const pending = filteredRequests.filter(r => r.status === 'Pending').length;
        const resolved = filteredRequests.filter(r => r.status === 'Resolved').length;
        const urgent = filteredRequests.filter(r => r.priority === 'Urgent').length;

        return { total, pending, resolved, urgent };
    }, [filteredRequests]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const paginatedItems = filteredRequests.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Styling Helpers
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

    // Handlers
    const handleExport = () => {
        const exportData = filteredRequests.map(req => ({
            'Client Name': req.client_name,
            'Request Type': req.request_type,
            'Description': req.description,
            'Priority': req.priority,
            'Status': req.status,
            'Requested Date': new Date(req.created_at).toLocaleDateString('en-GB'),
            'Completed Date': req.completed_at ? new Date(req.completed_at).toLocaleDateString('en-GB') : '-',
            'Reply': req.reply || '-'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Requests Report');
        XLSX.writeFile(wb, `Requests_Report_${new Date().toLocaleDateString()}.xlsx`);
        if (showToast) showToast('Report exported successfully', 'success');
    };

    const resetFilters = () => {
        setClientFilter('all');
        setStatusFilter('all');
        setPriorityFilter('all');
        setFromDate('');
        setToDate('');
        setCurrentPage(1);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Request Report</h1>
                        <p className="text-sm text-gray-500">Comprehensive log of client requests and status updates</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => window.print()}
                            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 font-semibold shadow-sm"
                        >
                            <i className="fas fa-print text-purple-600"></i>
                            Print
                        </button>
                        <button
                            onClick={handleExport}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2 font-semibold shadow-sm"
                        >
                            <i className="fas fa-file-excel"></i>
                            Export Excel
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
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
                    transition={{ delay: 0.1 }}
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
                    transition={{ delay: 0.2 }}
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Client</label>
                        <Select
                            className="w-full text-sm font-medium"
                            placeholder="Select Client..."
                            value={clientFilter === 'all' ? { value: 'all', label: 'All Clients' } : {
                                value: clientFilter,
                                label: clients.find(c => c.id === parseInt(clientFilter))?.client_name || 'Selected Client'
                            }}
                            onChange={(opt) => {
                                setClientFilter(opt ? opt.value : 'all');
                                setCurrentPage(1);
                            }}
                            options={[
                                { value: 'all', label: 'All Clients' },
                                ...clients.map(client => ({
                                    value: client.id,
                                    label: client.client_name
                                }))
                            ]}
                            isSearchable={true}
                            styles={{
                                control: (base) => ({
                                    ...base,
                                    borderColor: '#D1D5DB',
                                    '&:hover': { borderColor: '#6366F1' },
                                    borderRadius: '0.5rem',
                                    padding: '1px',
                                    boxShadow: 'none'
                                })
                            }}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">From Date</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>
                    <div className="relative">
                        <label className="block text-sm font-bold text-gray-700 mb-2">To Date</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium"
                        >
                            <option value="all">All Status</option>
                            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {hasActiveFilters && (
                        <div className="absolute -bottom-12 right-0 bg-white shadow-lg rounded-lg z-10 hidden md:block">
                            {/* Desktop reset button could go here or inline */}
                        </div>
                    )}
                </div>
                {hasActiveFilters && (
                    <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
                        <button
                            onClick={resetFilters}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-semibold text-sm flex items-center gap-2"
                        >
                            <i className="fas fa-times"></i> Reset Filters
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
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">Client</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">Type & Priority</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">Requested Date</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">Completed Date</th>
                                <th className="px-6 py-4 text-center text-xs font-black text-gray-600 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            <AnimatePresence>
                                {paginatedItems.map((req, idx) => (
                                    <motion.tr
                                        key={req.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="hover:bg-purple-50/10 transition group"
                                    >
                                        <td className="px-6 py-4 align-top">
                                            <p className="text-sm font-bold text-gray-900">{req.client_name}</p>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex flex-col gap-1.5">
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full w-fit ${getRequestTypeBadgeClass(req.request_type)}`}>
                                                    {req.request_type}
                                                </span>
                                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full w-fit ${getPriorityBadgeClass(req.priority)}`}>
                                                    {req.priority}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <p className="text-sm text-gray-600 line-clamp-2 max-w-xs" title={req.description}>
                                                {req.description}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <span className="text-sm font-bold text-gray-900">
                                                {new Date(req.created_at).toLocaleDateString('en-GB')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <span className="text-sm font-bold text-gray-600">
                                                {req.completed_at ? new Date(req.completed_at).toLocaleDateString('en-GB') : '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 align-top text-center">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getStatusBadgeClass(req.status)}`}>
                                                {req.status}
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                            {paginatedItems.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <i className="fas fa-search text-4xl mb-3 text-gray-300"></i>
                                            <p className="font-medium">No requests found</p>
                                            <p className="text-sm text-gray-400 mt-1">Adjust filters to view records</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredRequests.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex flex-col lg:flex-row justify-between items-center gap-6 bg-white">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-400 uppercase">Show</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-purple-500 focus:border-purple-500 block p-1"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span className="text-xs font-bold text-gray-400 uppercase">Entries</span>
                        </div>

                        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-2xl border border-gray-100">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className={`w-8 h-8 flex items-center justify-center rounded-xl transition ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-white hover:text-purple-600 shadow-sm'}`}
                            >
                                <i className="fas fa-angle-double-left text-xs"></i>
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className={`w-8 h-8 flex items-center justify-center rounded-xl transition ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-white hover:text-purple-600 shadow-sm'}`}
                            >
                                <i className="fas fa-chevron-left text-xs"></i>
                            </button>

                            <span className="px-3 text-xs font-bold text-gray-600">
                                {currentPage} / {totalPages}
                            </span>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className={`w-8 h-8 flex items-center justify-center rounded-xl transition ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-white hover:text-purple-600 shadow-sm'}`}
                            >
                                <i className="fas fa-chevron-right text-xs"></i>
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className={`w-8 h-8 flex items-center justify-center rounded-xl transition ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-white hover:text-purple-600 shadow-sm'}`}
                            >
                                <i className="fas fa-angle-double-right text-xs"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {/* Print Styles */}
            <style>{`
            @media print {
                body * {
                visibility: hidden;
                }
                #root, #root * {
                visibility: visible;
                }
                .sidebar, header, nav, button, .filters-container, .App > div > div:first-child { 
                display: none !important; 
                }
                .table-container {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                }
                /* Hide sidebar if it's external to page content */
                aside { display: none !important; }
            }
            `}</style>
        </div>
    );
}

export default RequestReport;
