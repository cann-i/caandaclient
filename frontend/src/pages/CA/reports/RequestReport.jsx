import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import axios from 'axios';
import Select from 'react-select';
import {
  FileText,
  Printer,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import { API_BASE_URL } from '../../../config';

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

    const stats = useMemo(() => {
        const total = filteredRequests.length;
        const pending = filteredRequests.filter(r => r.status === 'Pending').length;
        const resolved = filteredRequests.filter(r => r.status === 'Resolved').length;
        const urgent = filteredRequests.filter(r => r.priority === 'Urgent').length;

        return { total, pending, resolved, urgent };
    }, [filteredRequests]);

    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const paginatedItems = filteredRequests.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Pending': return 'bg-warning/10 text-warning border-warning/20';
            case 'In Progress': return 'bg-accent/10 text-accent border-accent/20';
            case 'Resolved': return 'bg-success/10 text-success border-success/20';
            case 'Rejected': return 'bg-error/10 text-error border-error/20';
            default: return 'bg-surface-highlight text-secondary border-border';
        }
    };

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
                    <h1 className="text-2xl font-bold text-primary tracking-tight">Request Reports</h1>
                    <p className="text-sm text-secondary">Log of client requests and status updates.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={() => window.print()} className="gap-2">
                        <Printer size={16} /> Print
                    </Button>
                    <Button variant="accent" onClick={handleExport} className="gap-2">
                        <Download size={16} /> Export Excel
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-surface border border-border rounded-xl p-6 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-xs font-mono text-secondary uppercase mb-1">Total Requests</p>
                        <h3 className="text-2xl font-bold text-primary">{stats.total}</h3>
                    </div>
                    <FileText className="absolute right-4 top-4 text-accent/20" size={48} />
                </div>
                <div className="bg-surface border border-border rounded-xl p-6 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-xs font-mono text-secondary uppercase mb-1">Pending</p>
                        <h3 className="text-2xl font-bold text-warning">{stats.pending}</h3>
                    </div>
                    <Clock className="absolute right-4 top-4 text-warning/20" size={48} />
                </div>
                <div className="bg-surface border border-border rounded-xl p-6 relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-xs font-mono text-secondary uppercase mb-1">Resolved</p>
                        <h3 className="text-2xl font-bold text-success">{stats.resolved}</h3>
                    </div>
                    <CheckCircle className="absolute right-4 top-4 text-success/20" size={48} />
                </div>
            </div>

            {/* Filters */}
            <div className="bg-surface border border-border rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-mono text-secondary uppercase mb-2">Select Client</label>
                        <Select
                            className="text-sm"
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
                            styles={selectStyles}
                        />
                    </div>

                    {/* ... Date Filters using same styling ... */}
                    <div>
                        <label className="block text-xs font-mono text-secondary uppercase mb-2">From Date</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-mono text-secondary uppercase mb-2">To Date</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent outline-none"
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
                            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    {hasActiveFilters && (
                        <div className="flex items-end">
                            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-secondary hover:text-primary gap-2">
                                <RefreshCw size={14} /> Reset
                            </Button>
                        </div>
                    )}
                </div>
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
                                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Requested</th>
                                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Completed</th>
                                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            <AnimatePresence>
                                {paginatedItems.map((req, idx) => (
                                    <motion.tr
                                        key={req.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="hover:bg-surface-highlight/50 transition-colors group"
                                    >
                                        <td className="p-4">
                                            <p className="text-sm font-bold text-primary">{req.client_name}</p>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-primary">{req.request_type}</span>
                                                <span className={`text-[10px] font-bold uppercase ${req.priority === 'Urgent' ? 'text-error' : 'text-secondary'}`}>
                                                    {req.priority}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-sm text-secondary line-clamp-1 max-w-xs" title={req.description}>
                                                {req.description}
                                            </p>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs text-secondary font-mono">
                                                {new Date(req.created_at).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-xs text-secondary font-mono">
                                                {req.completed_at ? new Date(req.completed_at).toLocaleDateString() : '-'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${getStatusBadgeClass(req.status)}`}>
                                                {req.status}
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                            {paginatedItems.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-12 text-center text-secondary">
                                        <Filter size={32} className="mx-auto mb-2 opacity-20" />
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

            {/* Print Styles */}
            <style>{`
            @media print {
                body * { visibility: hidden; }
                #root, #root * { visibility: visible; }
                .no-print { display: none !important; }
                aside { display: none !important; }
            }
            `}</style>
        </div>
    );
}

export default RequestReport;
