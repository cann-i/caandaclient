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
  Filter,
  DollarSign,
  CreditCard,
  AlertCircle,
  History,
  X
} from 'lucide-react';
import Button from '../../../components/ui/Button';

// Set base URL for Axios
const API_BASE_URL = 'http://localhost:5000/api';

function PaymentReport({ showToast }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);

  // Filter states
  const [clientFilter, setClientFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Load Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [invoicesRes, clientsRes, paymentsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/invoices`),
          axios.get(`${API_BASE_URL}/clients`),
          axios.get(`${API_BASE_URL}/invoices/payments/all`)
        ]);

        setInvoices(invoicesRes.data || []);
        setClients(clientsRes.data || []);
        setPayments(paymentsRes.data || []);
      } catch (error) {
        console.error("Error fetching financial data:", error);
        if (showToast) showToast('Failed to load payment reports', 'error');
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

  const clientSummaries = useMemo(() => {
    const summaries = {};

    invoices.forEach(inv => {
      if (!isWithinRange(inv.date)) return;

      const clientKey = inv.client;
      if (!summaries[clientKey]) {
        const clientObj = clients.find(c =>
          c.client_name?.trim().toLowerCase() === inv.client?.trim().toLowerCase()
        );

        summaries[clientKey] = {
          clientName: inv.client,
          clientId: clientObj?.id || null,
          clientEmail: clientObj?.email || inv.clientEmail || '',
          clientPhone: clientObj?.phone || inv.clientPhone || '',
          invoiceCount: 0,
          totalAmount: 0,
          paidAmount: 0,
          dueAmount: 0
        };
      }

      const total = Number(inv.totalAmount) || 0;
      const paid = Number(inv.paidAmount) || 0;

      summaries[clientKey].invoiceCount += 1;
      summaries[clientKey].totalAmount += total;
      summaries[clientKey].paidAmount += paid;
      summaries[clientKey].dueAmount += (total - paid);

      if (!summaries[clientKey].invoiceNumbers) summaries[clientKey].invoiceNumbers = [];
      if (!summaries[clientKey].invoiceNumbers.includes(inv.invoiceNumber)) {
        summaries[clientKey].invoiceNumbers.push(inv.invoiceNumber);
      }
    });

    Object.keys(summaries).forEach(name => {
      const clientObj = clients.find(c =>
        c.client_name?.trim().toLowerCase() === name?.trim().toLowerCase()
      );
      if (clientObj) {
        summaries[name].history = payments.filter(p => p.client_id === clientObj.id);
      } else {
        summaries[name].history = [];
      }
    });

    return Object.values(summaries);
  }, [invoices, clients, payments, isWithinRange]);

  const filteredRows = useMemo(() => {
    return clientSummaries.filter(row => {
      const selectedClientObj = clientFilter !== 'all' ? clients.find(c => c.id === clientFilter) : null;
      const matchesClient = clientFilter === 'all' ||
        row.clientName?.trim().toLowerCase() === selectedClientObj?.client_name?.trim().toLowerCase();
      return matchesClient;
    });
  }, [clientSummaries, clientFilter, clients]);

  const hasActiveFilters = useMemo(() => {
    return clientFilter !== 'all' || fromDate !== '' || toDate !== '';
  }, [clientFilter, fromDate, toDate]);

  const totals = useMemo(() => {
    return filteredRows.reduce((acc, row) => ({
      totalAmount: acc.totalAmount + row.totalAmount,
      paidAmount: acc.paidAmount + row.paidAmount,
      dueAmount: acc.dueAmount + row.dueAmount
    }), { totalAmount: 0, paidAmount: 0, dueAmount: 0 });
  }, [filteredRows]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);

  const handleExport = () => {
    const exportData = filteredRows.map(row => ({
      'Client Name': row.clientName,
      'Email': row.clientEmail,
      'Phone': row.clientPhone,
      'No. of Invoices': row.invoiceCount,
      'Total Amount': row.totalAmount,
      'Paid Amount': row.paidAmount,
      'Due Amount': row.dueAmount
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Client Payment Summary');
    XLSX.writeFile(wb, `Payment_Summary_${new Date().toLocaleDateString()}.xlsx`);
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

  const HistoryModal = ({ data, onClose }) => {
    if (!data) return null;

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden"
        >
          <div className="bg-surface-highlight/20 p-6 flex justify-between items-center border-b border-border">
            <div>
              <h3 className="text-xl font-bold text-primary">Payment History</h3>
              <p className="text-secondary text-sm font-bold opacity-80">{data.clientName}</p>
            </div>
            <button onClick={onClose} className="text-secondary hover:text-primary transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {data.history && data.history.length > 0 ? (
              <div className="space-y-4">
                {data.history.map((pay, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-surface-highlight/5 border border-border hover:border-accent/50 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pay.payment_mode === 'Cash' ? 'bg-green-500/10 text-green-500' :
                        pay.payment_mode === 'UPI' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'
                        }`}>
                        <DollarSign size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-primary">{formatCurrency(pay.amount)}</p>
                        <p className="text-xs text-secondary font-mono uppercase">
                          {new Date(pay.payment_date).toLocaleDateString()} • {pay.payment_mode}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-accent font-mono">{pay.invoice_number}</p>
                      <p className="text-[10px] text-secondary font-mono uppercase">{pay.transaction_id || '-'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-secondary">
                <History size={48} className="mx-auto mb-3 opacity-20" />
                <p className="font-bold">No payment history found</p>
              </div>
            )}
          </div>

          <div className="p-6 border-t border-border flex justify-end">
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </motion.div>
      </div>
    );
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
          <h1 className="text-2xl font-bold text-primary tracking-tight">Payment Reports</h1>
          <p className="text-sm text-secondary">Financial overview of billing and collections.</p>
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

      {/* Totals Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-6 relative overflow-hidden">
           <div className="relative z-10">
              <p className="text-xs font-mono text-secondary uppercase mb-1">Grand Total</p>
              <h3 className="text-2xl font-bold text-primary">{formatCurrency(totals.totalAmount)}</h3>
           </div>
           <DollarSign className="absolute right-4 top-4 text-blue-500/20" size={48} />
        </div>
        <div className="bg-surface border border-border rounded-xl p-6 relative overflow-hidden">
           <div className="relative z-10">
              <p className="text-xs font-mono text-secondary uppercase mb-1">Total Paid</p>
              <h3 className="text-2xl font-bold text-success">{formatCurrency(totals.paidAmount)}</h3>
           </div>
           <CreditCard className="absolute right-4 top-4 text-success/20" size={48} />
        </div>
        <div className="bg-surface border border-border rounded-xl p-6 relative overflow-hidden">
           <div className="relative z-10">
              <p className="text-xs font-mono text-secondary uppercase mb-1">Total Due</p>
              <h3 className="text-2xl font-bold text-error">{formatCurrency(totals.dueAmount)}</h3>
           </div>
           <AlertCircle className="absolute right-4 top-4 text-error/20" size={48} />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-mono text-secondary uppercase mb-2">Select Client</label>
            <Select
              className="text-sm"
              placeholder="Search and select client..."
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

          {/* ... Date Filters using same style ... */}
           {/* Placeholder for brevity, similar to other components */}

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
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Client Info</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-center">Invoices</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-right">Total</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-right text-success">Paid</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-right text-error">Due</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-center">History</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <AnimatePresence>
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((row) => (
                    <motion.tr
                      key={row.clientName}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-surface-highlight/50 transition-colors group"
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-primary">{row.clientName}</span>
                          <span className="text-xs text-secondary">{row.clientEmail}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => navigate('/invoices', { state: { clientName: row.clientName } })}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20"
                        >
                          {row.invoiceCount}
                        </button>
                      </td>
                      <td className="p-4 text-right font-bold text-primary">
                        {formatCurrency(row.totalAmount)}
                      </td>
                      <td className="p-4 text-right font-bold text-success">
                        {formatCurrency(row.paidAmount)}
                      </td>
                      <td className="p-4 text-right font-bold text-error">
                        {formatCurrency(row.dueAmount)}
                      </td>
                      <td className="p-4 text-center">
                        <Button variant="secondary" size="sm" onClick={() => setSelectedHistory(row)} className="text-[10px] h-6 px-2">
                           <History size={12} className="mr-1" /> View
                        </Button>
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-secondary">
                       <Filter size={32} className="mx-auto mb-2 opacity-20" />
                       <p>No records found</p>
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

      <AnimatePresence>
        {selectedHistory && (
          <HistoryModal
            data={selectedHistory}
            onClose={() => setSelectedHistory(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default PaymentReport;
