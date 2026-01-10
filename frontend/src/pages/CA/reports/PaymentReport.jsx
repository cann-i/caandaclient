import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import axios from 'axios';
import Select from 'react-select';

// Set base URL for Axios
const API_BASE_URL = 'http://localhost:5000/api';

function PaymentReport({ showToast }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null); // For history modal

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

  // Process data to group by client
  const clientSummaries = useMemo(() => {
    const summaries = {};

    invoices.forEach(inv => {
      if (!isWithinRange(inv.date)) return;

      const clientKey = inv.client; // Using client name as key for summary
      if (!summaries[clientKey]) {
        // Match client by name (robustly)
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

      // Collect unique invoice numbers
      if (!summaries[clientKey].invoiceNumbers) summaries[clientKey].invoiceNumbers = [];
      if (!summaries[clientKey].invoiceNumbers.includes(inv.invoiceNumber)) {
        summaries[clientKey].invoiceNumbers.push(inv.invoiceNumber);
      }
    });

    // Add payment history for each summary
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

  // Filter Rows
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

  // Pagination Logic
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

  // History Modal Component
  const HistoryModal = ({ data, onClose }) => {
    if (!data) return null;

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100"
        >
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black text-white">Payment History</h3>
              <p className="text-purple-100 text-sm font-bold opacity-80">{data.clientName}</p>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full transition-all">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {data.history && data.history.length > 0 ? (
              <div className="space-y-4">
                {data.history.map((pay, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:border-purple-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pay.payment_mode === 'Cash' ? 'bg-green-100 text-green-600' :
                        pay.payment_mode === 'UPI' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                        }`}>
                        <i className={`fas ${pay.payment_mode === 'Cash' ? 'fa-money-bill-wave' : pay.payment_mode === 'UPI' ? 'fa-mobile-alt' : 'fa-university'}`}></i>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{formatCurrency(pay.amount)}</p>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-tight">
                          {new Date(pay.payment_date).toLocaleDateString()} • {pay.payment_mode}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-purple-600">{pay.invoice_number}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{pay.transaction_id || '-'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <i className="fas fa-history text-4xl mb-3 opacity-20"></i>
                <p className="font-bold">No payment history found</p>
              </div>
            )}
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-100 transition shadow-sm"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    );
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Report</h1>
            <p className="text-sm text-gray-500">Overview of client billing, payments, and outstanding dues</p>
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


      {/* Real-time Totals Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-30 group-hover:scale-110 transition-transform z-0">
            <i className="fas fa-file-invoice-dollar text-4xl text-white"></i>
          </div>
          <div className="relative z-10">
            <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-1">Grand Total Amount</p>
            <h3 className="text-3xl font-black tracking-tight mb-1">{formatCurrency(totals.totalAmount)}</h3>
            <p className="text-blue-200 text-xs font-semibold">Aggregated Billing</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-30 group-hover:scale-110 transition-transform z-0">
            <i className="fas fa-hand-holding-usd text-4xl text-white"></i>
          </div>
          <div className="relative z-10">
            <p className="text-green-100 text-sm font-medium uppercase tracking-wider mb-1">Grand Paid Amount</p>
            <h3 className="text-3xl font-black tracking-tight mb-1">{formatCurrency(totals.paidAmount)}</h3>
            <p className="text-green-200 text-xs font-semibold">Total Collected</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-30 group-hover:scale-110 transition-transform z-0">
            <i className="fas fa-exclamation-circle text-4xl text-white"></i>
          </div>
          <div className="relative z-10">
            <p className="text-orange-100 text-sm font-medium uppercase tracking-wider mb-1">Grand Due Amount</p>
            <h3 className="text-3xl font-black tracking-tight mb-1">{formatCurrency(totals.dueAmount)}</h3>
            <p className="text-orange-200 text-xs font-semibold">Total Pending</p>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">Select Client</label>
            <Select
              className="w-full text-sm font-medium"
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



          {hasActiveFilters && (
            <div className="flex items-end md:col-start-4">
              <button
                onClick={resetFilters}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-semibold"
              >
                <i className="fas fa-times mr-2"></i>
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Client Summary Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">Client Information</th>
                <th className="px-6 py-4 text-center text-xs font-black text-gray-600 uppercase tracking-wider">No. of Invoices</th>
                <th className="px-6 py-4 text-right text-xs font-black text-gray-600 uppercase tracking-wider">Total Amount</th>
                <th className="px-6 py-4 text-right text-xs font-black text-gray-600 uppercase tracking-wider text-green-600">Paid Amount</th>
                <th className="px-6 py-4 text-right text-xs font-black text-gray-600 uppercase tracking-wider text-red-600">Due Amount</th>
                <th className="px-6 py-4 text-center text-xs font-black text-gray-600 uppercase tracking-wider">Transactions Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <AnimatePresence>
                {paginatedRows.map((row, index) => (
                  <motion.tr
                    key={row.clientName}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gradient-to-r hover:from-purple-50/30 hover:to-indigo-50/30 transition-all duration-300 group"
                  >
                    <td className="px-6 py-4 text-left">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 transition-colors uppercase tracking-tight">{row.clientName}</span>
                        <div className="flex flex-col mt-1 gap-0.5">
                          {row.clientEmail && (
                            <span className="text-xs text-gray-500 font-medium flex items-center gap-1.5 lowercase">
                              <i className="fas fa-envelope text-purple-400 text-[10px]"></i>
                              {row.clientEmail}
                            </span>
                          )}
                          {row.clientPhone && (
                            <span className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                              <i className="fas fa-phone-alt text-purple-400 text-[10px]"></i>
                              {row.clientPhone}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => navigate('/invoices', { state: { clientName: row.clientName } })}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 hover:bg-purple-200 transition-colors"
                      >
                        {row.invoiceCount}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-gray-900">{formatCurrency(row.totalAmount)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-green-600">{formatCurrency(row.paidAmount)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-red-600">{formatCurrency(row.dueAmount)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedHistory(row)}
                        className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-[11px] font-black rounded-xl hover:shadow-lg hover:shadow-purple-200/50 transition-all flex items-center gap-2 mx-auto"
                      >
                        <i className="fas fa-history"></i>
                        VIEW History
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>

              {paginatedRows.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <i className="fas fa-search-dollar text-4xl mb-3 text-gray-300"></i>
                      <p className="font-medium">No client records found</p>
                      <p className="text-sm text-gray-400 mt-1">Try adjusting the filters or date range</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredRows.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col lg:flex-row justify-between items-center gap-6 bg-white">
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-sm font-bold text-purple-600 outline-none cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Entries</span>
              </div>
              <p className="text-sm text-gray-500 font-medium whitespace-nowrap">
                Showing <span className="text-gray-900 font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(currentPage * itemsPerPage, filteredRows.length)}</span> of <span className="text-gray-900 font-bold">{filteredRows.length}</span> results
              </p>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-gray-50 p-1 rounded-2xl border border-gray-100 shadow-sm">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed opacity-50' : 'text-gray-600 hover:bg-white hover:text-purple-600 hover:shadow-sm'}`}
                  >
                    <i className="fas fa-angle-double-left text-xs"></i>
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed opacity-50' : 'text-gray-600 hover:bg-white hover:text-purple-600 hover:shadow-sm'}`}
                  >
                    <i className="fas fa-chevron-left text-xs"></i>
                  </button>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed opacity-50' : 'text-gray-600 hover:bg-white hover:text-purple-600 hover:shadow-sm'}`}
                  >
                    <i className="fas fa-chevron-right text-xs"></i>
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed opacity-50' : 'text-gray-600 hover:bg-white hover:text-purple-600 hover:shadow-sm'}`}
                  >
                    <i className="fas fa-angle-double-right text-xs"></i>
                  </button>
                </div>
              </div>
            )}
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
            .sidebar, header, nav, button, .filters-container { 
              display: none !important; 
            }
            .table-container {
               position: absolute;
               left: 0;
               top: 0;
               width: 100%;
            }
          }
        `}</style>

      {/* Modal Rendering */}
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