import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import axios from 'axios';
import Select from 'react-select';

// Set base URL for Axios
const API_BASE_URL = 'http://localhost:5000/api';

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
        // Only show toast on initial load failure to avoid spamming
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
    // Reset times for accurate day comparison
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

      // Invoices matching by ID (Robust)
      const clientInvoices = invoices.filter(i => i.clientId === client.id && isWithinRange(i.date));

      const clientDocs = documents.filter(d => d.client_id === client.id && isWithinRange(d.created_at));
      const clientRequests = requests.filter(r => r.client_id === client.id && isWithinRange(r.created_at));

      const totalReturnsCount = clientReturns.length;
      const totalRequestsCount = clientRequests.length;

      const totalBilled = clientInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);

      // Fixed: Use inv.paidAmount (which sums all payments) instead of filtering only 'Paid' status
      const totalPaid = clientInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);

      // Calculate pending dues properly
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Reports</h1>
            <p className="text-sm text-gray-500">Comprehensive overview of performance, requests, and financials</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2 font-semibold shadow-sm"
            >
              <i className="fas fa-print"></i>
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



        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {hasActiveFilters && (
              <div className="flex items-end">
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

        {/* Report Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100/50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">Client Details</th>
                  <th className="px-4 py-4 text-center text-xs font-black text-gray-600 uppercase tracking-wider">Requests</th>
                  <th className="px-4 py-4 text-center text-xs font-black text-gray-600 uppercase tracking-wider">Returns</th>
                  <th className="px-4 py-4 text-center text-xs font-black text-gray-600 uppercase tracking-wider">Docs</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-gray-600 uppercase tracking-wider">Total Billed</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-gray-600 uppercase tracking-wider">Paid</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-gray-600 uppercase tracking-wider">Dues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                  {paginatedRows.map((row, index) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gradient-to-r hover:from-purple-50/30 hover:to-indigo-50/30 transition-all duration-300 group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-700 flex items-center justify-center font-bold text-sm border border-purple-200 shadow-sm flex-shrink-0">
                            {row.client_name?.charAt(0).toUpperCase() || <i className="fas fa-user text-xs opacity-50"></i>}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">{row.client_name}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500 capitalise bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">{row.client_type}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${row.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                {row.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {row.totalRequestsCount > 0 ? (
                          <button
                            onClick={() => navigate('/requests/client', { state: { clientId: row.id } })}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 hover:bg-purple-200 transition-colors"
                          >
                            {row.totalRequestsCount}
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {row.totalReturnsCount > 0 ? (
                          <button
                            onClick={() => navigate('/returns', { state: { clientId: row.id } })}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200 hover:bg-orange-200 transition-colors"
                          >
                            {row.totalReturnsCount}
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => navigate('/documents', { state: { clientId: row.id } })}
                          className={`text-sm font-bold px-2 py-1 rounded border transition-colors ${row.docsCount > 0
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                            : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                            }`}
                        >
                          {row.docsCount}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">
                        {formatCurrency(row.totalBilled)}
                      </td>
                      <td className="px-6 py-4 text-right text-green-600 font-bold">
                        {formatCurrency(row.totalPaid)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {row.pendingDues > 0 ? (
                          <span className="font-bold text-red-600">{formatCurrency(row.pendingDues)}</span>
                        ) : (
                          <span className="text-gray-400 font-medium">-</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>

                {paginatedRows.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <i className="fas fa-search text-4xl mb-3 text-gray-300"></i>
                        <p className="font-medium">No clients found matching your criteria</p>
                        <p className="text-sm text-gray-400 mt-1">Try adjusting the date range or filters</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Professional Pagination */}
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
            .sidebar, header, nav, button { 
              display: none !important; 
            }
          }
        `}</style>
      </div>
    </div>
  );
}

export default ClientReport;