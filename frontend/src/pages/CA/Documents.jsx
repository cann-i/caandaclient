import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';
import {
  File,
  FileText,
  Image,
  Trash2,
  Eye,
  Download,
  Upload,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  FolderOpen
} from 'lucide-react';
import Button from '../../components/ui/Button';

function Documents({ showToast }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [documents, setDocuments] = useState([]);
  const [clients, setClients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedDocType, setSelectedDocType] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Handle pre-filtering
  useEffect(() => {
    if (location.state?.clientId) {
      setSelectedClient(location.state.clientId.toString());
    }
  }, [location.state]);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [docsRes, clientsRes, catsRes] = await Promise.all([
          axios.get('/documents?exclude_clients=true'),
          axios.get('/clients'),
          axios.get('/documents/categories')
        ]);
        setDocuments(docsRes.data);
        setClients(clientsRes.data);
        setCategories(catsRes.data);
      } catch (error) {
        console.error('Error fetching document data:', error);
        showToast('Error loading documents', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [showToast]);

  const getFileIcon = (filename) => {
    if (!filename) return <File className="text-secondary" size={24} />;
    const lowerFile = filename.toLowerCase();
    if (lowerFile.endsWith('.pdf')) return <FileText className="text-error" size={24} />;
    if (lowerFile.endsWith('.xlsx') || lowerFile.endsWith('.xls')) return <FileText className="text-success" size={24} />;
    if (lowerFile.endsWith('.docx') || lowerFile.endsWith('.doc')) return <FileText className="text-accent" size={24} />;
    if (lowerFile.endsWith('.jpg') || lowerFile.endsWith('.png') || lowerFile.endsWith('.jpeg')) return <Image className="text-warning" size={24} />;
    return <File className="text-secondary" size={24} />;
  };

  const years = useMemo(() => {
    const docYears = documents.map(d => d.financial_year).filter(Boolean);
    return [...new Set(docYears)].sort((a, b) => b.localeCompare(a));
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const matchesClient = selectedClient === 'all' || doc.client_id === parseInt(selectedClient);
      const matchesDocType = selectedDocType === 'all' || doc.category_id === parseInt(selectedDocType);
      const matchesYear = selectedYear === 'all' || doc.financial_year === selectedYear;

      const searchStr = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' ||
        (doc.document_name && doc.document_name.toLowerCase().includes(searchStr)) ||
        (doc.clientName && doc.clientName.toLowerCase().includes(searchStr)) ||
        (doc.type && doc.type.toLowerCase().includes(searchStr)) ||
        (doc.file_name && doc.file_name.toLowerCase().includes(searchStr));

      return matchesClient && matchesDocType && matchesYear && matchesSearch;
    });
  }, [documents, selectedClient, selectedDocType, selectedYear, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClient, selectedDocType, selectedYear, searchQuery]);

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDocumentsItems = filteredDocuments.slice(indexOfFirstItem, indexOfLastItem);

  const deleteDocument = async (id, documentName) => {
    if (window.confirm(`Are you sure you want to delete "${documentName}"?`)) {
      try {
        await axios.delete(`/documents/${id}`);
        setDocuments(docs => docs.filter(d => d.id !== id));
        showToast('Document deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting document:', error);
        showToast('Error deleting document', 'error');
      }
    }
  };

  const previewDocument = (doc) => {
    // Ensure the path is correct. backend serves uploads at /uploads
    // doc.file_path should already be relative like 'uploads/documents/...'
    if (!doc.file_path) {
        showToast('File path is missing', 'error');
        return;
    }
    // Remove duplicate slashes if any
    const cleanPath = doc.file_path.replace(/^\/+/, '');
    const fileUrl = `${BASE_URL}/${cleanPath}`;
    window.open(fileUrl, '_blank');
  };

  const downloadDocument = async (doc) => {
    try {
      showToast(`Downloading ${doc.file_name}...`, 'info');
      const cleanPath = doc.file_path.replace(/^\/+/, '');
      const fileUrl = `${BASE_URL}/${cleanPath}`;

      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Network response was not ok');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const extension = doc.file_path.split('.').pop();
      const hasExtension = doc.document_name.toLowerCase().endsWith(`.${extension.toLowerCase()}`);
      const filename = hasExtension ? doc.document_name : `${doc.document_name}.${extension}`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast('Download completed', 'success');
    } catch (error) {
      console.error('Download failed:', error);
      showToast('Failed to download document', 'error');
    }
  };

  const resetFilters = () => {
    setSelectedClient('all');
    setSelectedDocType('all');
    setSelectedYear('all');
    setSearchQuery('');
    showToast('Filters reset', 'info');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  // React Select Custom Styles for Dark Mode
  const selectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: '#121212', // Surface
      borderColor: '#2A2A2A', // Border
      color: '#E0E0E0', // Primary
      '&:hover': { borderColor: '#3B82F6' }, // Accent
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
    })
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Document Management</h1>
          <p className="text-secondary text-sm">Manage and organize all client documents.</p>
        </div>
        <Button variant="accent" onClick={() => navigate('/upload-docs')} className="gap-2">
          <Upload size={16} /> Upload Documents
        </Button>
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
              styles={selectStyles}
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-secondary uppercase mb-2">Document Type</label>
            <Select
              className="text-sm"
              value={selectedDocType === 'all' ? { value: 'all', label: 'All Types' } :
                categories.find(cat => cat.id === parseInt(selectedDocType)) ? {
                  value: selectedDocType,
                  label: categories.find(cat => cat.id === parseInt(selectedDocType)).category_name
                } : null}
              onChange={(opt) => setSelectedDocType(opt ? opt.value : 'all')}
              options={[
                { value: 'all', label: 'All Types' },
                ...categories.map(cat => ({ value: cat.id, label: cat.category_name }))
              ]}
              styles={selectStyles}
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-secondary uppercase mb-2">Year</label>
            <select
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent outline-none"
              value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
            >
              <option value="all">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono text-secondary uppercase mb-2">Search</label>
            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={14} />
               <input
                 type="text"
                 placeholder="Search docs..."
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
               />
            </div>
          </div>
        </div>
        {(selectedClient !== 'all' || selectedDocType !== 'all' || selectedYear !== 'all' || searchQuery !== '') && (
          <div className="mt-4 flex justify-end">
            <Button variant="ghost" size="sm" onClick={resetFilters} className="text-secondary hover:text-primary gap-2">
              <X size={14} /> Reset Filters
            </Button>
          </div>
        )}
      </div>

      {/* Documents Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-highlight/30">
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Client / Details</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Document Name</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Uploaded Date</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-center">Size</th>
                <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {currentDocumentsItems.length === 0 ? (
                 <tr>
                   <td colSpan={5} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                         <FolderOpen size={48} className="text-border" />
                         <p className="text-secondary text-sm">No documents found matching your criteria</p>
                      </div>
                   </td>
                 </tr>
              ) : (
                currentDocumentsItems.map((doc) => (
                  <motion.tr
                    key={doc.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-surface-highlight/50 transition-colors group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-accent/10 text-accent flex items-center justify-center font-bold text-xs border border-accent/20">
                           {doc.clientName?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                           <p className="text-sm font-bold text-primary">{doc.clientName}</p>
                           <div className="flex gap-1 mt-0.5">
                              <span className="text-[10px] bg-surface border border-border px-1.5 py-0.5 rounded text-secondary uppercase">{doc.type}</span>
                              <span className="text-[10px] bg-surface border border-border px-1.5 py-0.5 rounded text-secondary uppercase">{doc.financial_year}</span>
                           </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-background rounded-lg border border-border">
                             {getFileIcon(doc.file_name)}
                          </div>
                          <span className="text-sm text-primary font-medium truncate max-w-[200px]">{doc.file_name}</span>
                       </div>
                    </td>
                    <td className="p-4">
                       <span className="text-xs text-secondary font-mono">{new Date(doc.created_at).toLocaleDateString()}</span>
                    </td>
                    <td className="p-4 text-center">
                       <span className="text-xs text-secondary font-mono">{(doc.file_size / 1024).toFixed(1)} KB</span>
                    </td>
                    <td className="p-4 text-right">
                       <div className="flex items-center justify-end gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => previewDocument(doc)} className="p-1.5 hover:bg-surface-highlight rounded text-secondary hover:text-accent transition-colors"><Eye size={16} /></button>
                          <button onClick={() => downloadDocument(doc)} className="p-1.5 hover:bg-surface-highlight rounded text-secondary hover:text-success transition-colors"><Download size={16} /></button>
                          <button onClick={() => deleteDocument(doc.id, doc.document_name)} className="p-1.5 hover:bg-surface-highlight rounded text-secondary hover:text-error transition-colors"><Trash2 size={16} /></button>
                       </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredDocuments.length > 0 && (
           <div className="p-4 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <span className="text-xs text-secondary">Rows per page:</span>
                 <select
                   value={itemsPerPage}
                   onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                   className="bg-background border border-border rounded text-xs text-primary p-1 outline-none"
                 >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                 </select>
                 <span className="text-xs text-secondary ml-4">
                    {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredDocuments.length)} of {filteredDocuments.length}
                 </span>
              </div>
              <div className="flex gap-2">
                 <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft size={16} /></Button>
                 <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight size={16} /></Button>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}

export default Documents;
