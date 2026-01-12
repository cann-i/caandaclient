import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  User,
  Filter
} from 'lucide-react';
import Button from '../../../components/ui/Button';

// Set base URL for Axios
const API_BASE_URL = API_BASE_URL;

function ClientReport({ showToast }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [returns, setReturns] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [requests, setRequests] = useState([]);

  // Filter states
  const [clientFilter, setClientFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Load Real Data
  useEffect(() => {
    const fetchData = async (isInitial = false) => {
      if (isInitial) setLoading(true);
      try {
        const [
          clientsRes,
          returnsRes,
          invoicesRes,
          documentsRes,
          requestsRes
        ] = await Promise.all([
          axios.get(`${API_BASE_URL}/clients`),
          axios.get(`${API_BASE_URL}/returns`),
          axios.get(`${API_BASE_URL}/invoices`),
          axios.get(`${API_BASE_URL}/documents`),
          axios.get(`${API_BASE_URL}/requests`)
        ]);

        setClients(clientsRes.data || []);
        setReturns(returnsRes.data || []);
        setInvoices(invoicesRes.data || []);
        setDocuments(documentsRes.data || []);
        setRequests(requestsRes.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        if (showToast && isInitial) showToast('Failed to load report data', 'error');
      } finally {
        if (isInitial) setLoading(false);
      }
    };

    fetchData(true);

    const intervalId = setInterval(() => {
      fetchData(false);
    }, 5000);

    return () => clearInterval(intervalId);
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

  // Merge Data for Table with Date Filtering
  const clientRows = useMemo(() => {
    return clients.map(client => {
      const clientReturns = returns.filter(r => r.client_id === client.id && isWithinRange(r.created_at));
      const clientInvoices = invoices.filter(i => i.clientId === client.id && isWithinRange(i.date));
      const clientDocs = documents.filter(d => d.client_id === client.id && isWithinRange(d.created_at));
      const clientRequests = requests.filter(r => r.client_id === client.id && isWithinRange(r.created_at));

      const totalReturnsCount = clientReturns.length;
      const totalRequestsCount = clientRequests.length;
      const totalBilled = clientInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
      const totalPaid = clientInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
      const pendingDues = totalBilled - totalPaid;

      return {
        ...client,
        totalReturnsCount,
        totalRequestsCount,
        docsCount: clientDocs.length,
        totalBilled,
        totalPaid,
        pendingDues,
      };
    });
  }, [clients, returns, invoices, documents, requests, isWithinRange]);

  // Filter and Sort Rows
  const filteredRows = useMemo(() => {
    return clientRows.filter(row => {
      const matchesClient = clientFilter === 'all' || row.id === clientFilter;
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const matchesType = typeFilter === 'all' || row.client_type === typeFilter;

      return matchesClient && matchesStatus && matchesType;
    });
  }, [clientRows, clientFilter, statusFilter, typeFilter]);

  const hasActiveFilters = useMemo(() => {
    return clientFilter !== 'all' || statusFilter !== 'all' || typeFilter !== 'all' || fromDate !== '' || toDate !== '';
  }, [clientFilter, statusFilter, typeFilter, fromDate, toDate]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExport = () => {
    const exportData = filteredRows.map(row => ({
      'Client Name': row.client_name,
      'Type': row.client_type,
      'Email': row.email,
      'Phone': row.phone,
      'Status': row.status,
      'Requests': row.totalRequestsCount,
      'Returns': row.totalReturnsCount,
      'Total Documents': row.docsCount,
      'Total Billed': row.totalBilled,
      'Total Paid': row.totalPaid,
      'Pending Dues': row.pendingDues
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Client Report');
    XLSX.writeFile(wb, `Client_Report_${new Date().toLocaleDateString()}.xlsx`);
    if (showToast) showToast('Report exported successfully', 'success');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const resetFilters = () => {
    setClientFilter('all');
    setStatusFilter('all');
    setTypeFilter('all');
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
          <h1 className="text-2xl font-bold text-primary tracking-tight">Client Reports</h1>
          <p className="text-sm text-secondary">Overview of performance, requests, and financials.</p>
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

      {/* Filters */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-mono text-secondary uppercase mb-2">Select Client</label>
            <Select
              className="text-sm"
              placeholder="Search client..."
              value={clientFilter === 'all' ? { value: 'all', label: 'All Clients' } : {
                value: clientFilter,
                label: clients.find(c => c.id === clientFilter)?.client_name || clientFilter
              }}
              onChange={(opt) => {
                setClientFilter(opt ? opt.value : 'all');
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'All Clients' },
                ...clients.map(client => ({
                  value: client.id,
                  label: `${client.client_name} (${client.client_type})`
                }))
              ]}
              isSearchable={true}
              styles={selectStyles}
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-secondary uppercase mb-2">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-secondary uppercase mb-2">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
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
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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

      {/* Report Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-highlight/30">
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Client Details</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-center">Requests</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-center">Returns</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-center">Docs</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-right">Total Billed</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-right">Paid</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-right">Dues</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <AnimatePresence>
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((row) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-surface-highlight/50 transition-colors group"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-accent/10 text-accent flex items-center justify-center font-bold text-xs border border-accent/20">
                            {row.client_name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-primary text-sm">{row.client_name}</span>
                            <div className="flex gap-1 mt-0.5">
                              <span className="text-[10px] bg-surface border border-border px-1.5 py-0.5 rounded text-secondary capitalize">{row.client_type}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold border ${
                                row.status === 'active' ? 'text-success border-success/20 bg-success/10' : 'text-error border-error/20 bg-error/10'
                              }`}>
                                {row.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {row.totalRequestsCount > 0 ? (
                          <button
                            onClick={() => navigate('/requests/client', { state: { clientId: row.id } })}
                            className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
                          >
                            {row.totalRequestsCount}
                          </button>
                        ) : <span className="text-secondary text-xs">-</span>}
                      </td>
                      <td className="p-4 text-center">
                        {row.totalReturnsCount > 0 ? (
                          <button
                            onClick={() => navigate('/returns', { state: { clientId: row.id } })}
                            className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20 transition-colors"
                          >
                            {row.totalReturnsCount}
                          </button>
                        ) : <span className="text-secondary text-xs">-</span>}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => navigate('/documents', { state: { clientId: row.id } })}
                          className={`text-xs font-bold px-2 py-0.5 rounded border transition-colors ${row.docsCount > 0
                            ? 'bg-surface-highlight text-primary border-border hover:bg-surface-highlight/80'
                            : 'text-secondary border-transparent cursor-default'
                            }`}
                          disabled={row.docsCount === 0}
                        >
                          {row.docsCount > 0 ? row.docsCount : '-'}
                        </button>
                      </td>
                      <td className="p-4 text-right font-bold text-primary text-sm">
                        {formatCurrency(row.totalBilled)}
                      </td>
                      <td className="p-4 text-right text-success font-bold text-sm">
                        {formatCurrency(row.totalPaid)}
                      </td>
                      <td className="p-4 text-right text-sm">
                        {row.pendingDues > 0 ? (
                          <span className="font-bold text-error">{formatCurrency(row.pendingDues)}</span>
                        ) : <span className="text-secondary">-</span>}
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="p-12 text-center text-secondary">
                       <div className="flex flex-col items-center gap-2">
                          <Filter size={32} className="opacity-20" />
                          <p>No clients found matching your criteria</p>
                       </div>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredRows.length > 0 && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
               <span className="text-xs text-secondary">Rows:</span>
               <select
                 value={itemsPerPage}
                 onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                 className="bg-background border border-border rounded text-xs text-primary p-1 outline-none"
               >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
               </select>
               <span className="text-xs text-secondary ml-4">
                  {((currentPage-1)*itemsPerPage)+1}-{Math.min(currentPage*itemsPerPage, filteredRows.length)} of {filteredRows.length}
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
        }
      `}</style>
    </div>
  );
}

export default ClientReport;
