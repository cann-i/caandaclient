import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Select from 'react-select';
import { exportToExcel } from '../../../utils/exportUtils';

const API_BASE_URL = 'http://localhost:5000/api';

function DocumentReport({ showToast }) {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [clients, setClients] = useState([]);
  const [categories, setCategories] = useState([]);

  // Filter states
  const [clientFilter, setClientFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [docsRes, clientsRes, catsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/documents`),
          axios.get(`${API_BASE_URL}/clients`),
          axios.get(`${API_BASE_URL}/documents/categories`)
        ]);
        setDocuments(docsRes.data || []);
        setClients(clientsRes.data || []);
        setCategories(catsRes.data || []);
      } catch (error) {
        console.error("Error fetching document data:", error);
        if (showToast) showToast('Failed to load document report data', 'error');
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



  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesClient = clientFilter === 'all' || doc.client_id === Number(clientFilter);
      const matchesCategory = categoryFilter === 'all' || doc.category_id === Number(categoryFilter);
      const matchesYear = yearFilter === 'all' || doc.financial_year === yearFilter;
      const matchesDate = isWithinRange(doc.created_at);

      const searchStr = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' ||
        (doc.file_name && doc.file_name.toLowerCase().includes(searchStr)) ||
        (doc.document_name && doc.document_name.toLowerCase().includes(searchStr)) ||
        (doc.clientName && doc.clientName.toLowerCase().includes(searchStr)) ||
        (doc.type && doc.type.toLowerCase().includes(searchStr));

      return matchesClient && matchesCategory && matchesYear && matchesDate && matchesSearch;
    });
  }, [documents, clientFilter, categoryFilter, yearFilter, isWithinRange, searchQuery]);

  const hasActiveFilters = useMemo(() => {
    return clientFilter !== 'all' || categoryFilter !== 'all' || yearFilter !== 'all' || fromDate !== '' || toDate !== '' || searchQuery !== '';
  }, [clientFilter, categoryFilter, yearFilter, fromDate, toDate, searchQuery]);



  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDocuments.slice(start, start + itemsPerPage);
  }, [filteredDocuments, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);

  const handleExport = () => {
    const exportData = filteredDocuments.map(doc => ({
      'Document Name': doc.file_name,
      'Client': doc.clientName,
      'Category': doc.type,
      'Financial Year': doc.financial_year,
      'Upload Date': new Date(doc.created_at).toLocaleDateString(),
      'Size (KB)': (doc.file_size / 1024).toFixed(1),
      'Visibility': doc.is_visible_to_client ? 'Visible to Client' : 'Internal Only',
      'Notes': doc.notes || ''
    }));

    exportToExcel(exportData, `Document_Report_${new Date().toLocaleDateString()}`);
    if (showToast) showToast('Document report exported successfully', 'success');
  };

  const resetFilters = () => {
    setClientFilter('all');
    setCategoryFilter('all');
    setYearFilter('all');
    setFromDate('');
    setToDate('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Document Reports</h1>
            <p className="text-sm text-gray-500">Analyze document uploads, visibility, and category distribution</p>
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
              <label className="block text-sm font-bold text-gray-700 mb-2">Client</label>
              <Select
                className="w-full text-sm font-medium"
                placeholder="Search clients..."
                value={clientFilter === 'all' ? { value: 'all', label: 'All Clients' } : {
                  value: clientFilter,
                  label: clients.find(c => c.id === Number(clientFilter))?.client_name || clientFilter
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
                    '&:hover': { borderColor: '#10B981' },
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                ))}
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

        {/* Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100/50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-wider">Client & Document</th>
                  <th className="px-4 py-4 text-center text-xs font-black text-gray-600 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-4 text-center text-xs font-black text-gray-600 uppercase tracking-wider">Year</th>
                  <th className="px-4 py-4 text-center text-xs font-black text-gray-600 uppercase tracking-wider">Upload Date</th>
                  <th className="px-4 py-4 text-center text-xs font-black text-gray-600 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-4 text-center text-xs font-black text-gray-600 uppercase tracking-wider">Visibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence>
                  {paginatedRows.map((doc, index) => (
                    <motion.tr
                      key={doc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-emerald-50/30 transition-all duration-300 group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{doc.file_name}</span>
                          <span className="text-xs text-gray-500">{doc.clientName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase tracking-tight">
                          {doc.type}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm font-bold text-gray-700">
                          {doc.financial_year || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm text-gray-600">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {(doc.file_size / 1024).toFixed(1)} KB
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {doc.is_visible_to_client ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-green-100 text-green-700 border border-green-200">
                            <i className="fas fa-eye text-[8px]"></i>
                            Client Shared
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-amber-100 text-amber-700 border border-amber-200">
                            <i className="fas fa-lock text-[8px]"></i>
                            Internal Only
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>

                {paginatedRows.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <i className="fas fa-folder-open text-4xl mb-3 text-gray-300"></i>
                        <p className="font-medium">No documents found matching your criteria</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredDocuments.length > 0 && (
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
                    className="bg-transparent text-sm font-bold text-emerald-600 outline-none cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Entries</span>
                </div>
                <p className="text-sm text-gray-500 font-medium whitespace-nowrap">
                  Showing <span className="text-gray-900 font-bold">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(currentPage * itemsPerPage, filteredDocuments.length)}</span> of <span className="text-gray-900 font-bold">{filteredDocuments.length}</span> results
                </p>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-gray-50 p-1 rounded-2xl border border-gray-100 shadow-sm">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed opacity-50' : 'text-gray-600 hover:bg-white hover:text-emerald-600 hover:shadow-sm'}`}
                    >
                      <i className="fas fa-angle-double-left text-xs"></i>
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed opacity-50' : 'text-gray-600 hover:bg-white hover:text-emerald-600 hover:shadow-sm'}`}
                    >
                      <i className="fas fa-chevron-left text-xs"></i>
                    </button>

                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed opacity-50' : 'text-gray-600 hover:bg-white hover:text-emerald-600 hover:shadow-sm'}`}
                    >
                      <i className="fas fa-chevron-right text-xs"></i>
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed opacity-50' : 'text-gray-600 hover:bg-white hover:text-emerald-600 hover:shadow-sm'}`}
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
            .sidebar, header, nav, .no-print, button { 
              display: none !important; 
            }
          }
        `}</style>
      </div>
    </div>
  );
}

export default DocumentReport;