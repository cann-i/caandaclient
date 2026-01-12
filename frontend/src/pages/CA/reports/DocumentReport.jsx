import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import Select from 'react-select';
import { exportToExcel } from '../../../utils/exportUtils';
import {
  FileText,
  Printer,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Lock,
  Calendar,
  FolderOpen
} from 'lucide-react';
import Button from '../../../components/ui/Button';

// Set base URL for Axios
const API_BASE_URL = API_BASE_URL;

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
          <h1 className="text-2xl font-bold text-primary tracking-tight">Document Reports</h1>
          <p className="text-sm text-secondary">Analyze document uploads, visibility, and categories.</p>
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
            <label className="block text-xs font-mono text-secondary uppercase mb-2">Client</label>
            <Select
              className="text-sm"
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
            <label className="block text-xs font-mono text-secondary uppercase mb-2">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.category_name}</option>
              ))}
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
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Client & Document</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-center">Category</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-center">Year</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-center">Upload Date</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-center">Size</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-center">Visibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <AnimatePresence>
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((doc) => (
                    <motion.tr
                      key={doc.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-surface-highlight/50 transition-colors group"
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-primary text-sm">{doc.file_name}</span>
                          <span className="text-xs text-secondary">{doc.clientName}</span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-accent/10 text-accent border border-accent/20 uppercase tracking-tight">
                          {doc.type}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-mono text-primary">
                          {doc.financial_year || '-'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-xs text-secondary font-mono">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-xs font-mono text-secondary">
                          {(doc.file_size / 1024).toFixed(1)} KB
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {doc.is_visible_to_client ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-success/10 text-success border border-success/20">
                            <Eye size={10} /> Shared
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-warning/10 text-warning border border-warning/20">
                            <Lock size={10} /> Internal
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-secondary">
                      <div className="flex flex-col items-center gap-2">
                        <FolderOpen size={32} className="opacity-20" />
                        <p>No documents found matching your criteria</p>
                      </div>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredDocuments.length > 0 && (
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
                  {((currentPage-1)*itemsPerPage)+1}-{Math.min(currentPage*itemsPerPage, filteredDocuments.length)} of {filteredDocuments.length}
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

export default DocumentReport;
