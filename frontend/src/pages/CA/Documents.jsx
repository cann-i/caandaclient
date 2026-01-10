import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';


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

  // Handle pre-filtering from Client Report
  useEffect(() => {
    if (location.state?.clientId) {
      setSelectedClient(location.state.clientId.toString());
    }
  }, [location.state]);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [docsRes, clientsRes, catsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/documents?exclude_clients=true'),
          axios.get('http://localhost:5000/api/clients'),
          axios.get('http://localhost:5000/api/documents/categories')
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
    if (!filename) return 'fas fa-file';
    const lowerFile = filename.toLowerCase();
    if (lowerFile.endsWith('.pdf')) return 'fas fa-file-pdf';
    if (lowerFile.endsWith('.xlsx') || lowerFile.endsWith('.xls')) return 'fas fa-file-excel';
    if (lowerFile.endsWith('.docx') || lowerFile.endsWith('.doc')) return 'fas fa-file-word';
    if (lowerFile.endsWith('.jpg') || lowerFile.endsWith('.png') || lowerFile.endsWith('.jpeg')) return 'fas fa-file-image';
    return 'fas fa-file';
  };

  const getFileIconBg = (filename) => {
    if (!filename) return 'bg-gray-100';
    const lowerFile = filename.toLowerCase();
    if (lowerFile.endsWith('.pdf')) return 'bg-red-100';
    if (lowerFile.endsWith('.xlsx') || lowerFile.endsWith('.xls')) return 'bg-green-100';
    if (lowerFile.endsWith('.docx') || lowerFile.endsWith('.doc')) return 'bg-blue-100';
    if (lowerFile.endsWith('.jpg') || lowerFile.endsWith('.png') || lowerFile.endsWith('.jpeg')) return 'bg-purple-100';
    return 'bg-gray-100';
  };

  const getFileIconColor = (filename) => {
    if (!filename) return 'text-gray-600';
    const lowerFile = filename.toLowerCase();
    if (lowerFile.endsWith('.pdf')) return 'text-red-600';
    if (lowerFile.endsWith('.xlsx') || lowerFile.endsWith('.xls')) return 'text-green-600';
    if (lowerFile.endsWith('.docx') || lowerFile.endsWith('.doc')) return 'text-blue-600';
    if (lowerFile.endsWith('.jpg') || lowerFile.endsWith('.png') || lowerFile.endsWith('.jpeg')) return 'text-purple-600';
    return 'text-gray-600';
  };

  // Extract years from documents
  const years = useMemo(() => {
    const docYears = documents.map(d => d.financial_year).filter(Boolean);
    return [...new Set(docYears)].sort((a, b) => b.localeCompare(a));
  }, [documents]);

  // Filtered documents
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
        (doc.notes && doc.notes.toLowerCase().includes(searchStr)) ||
        (doc.file_name && doc.file_name.toLowerCase().includes(searchStr));

      return matchesClient && matchesDocType && matchesYear && matchesSearch;
    });
  }, [documents, selectedClient, selectedDocType, selectedYear, searchQuery]);

  // Reset to first page when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClient, selectedDocType, selectedYear, searchQuery]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDocumentsItems = filteredDocuments.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Actions
  const deleteDocument = async (id, documentName) => {
    if (window.confirm(`Are you sure you want to delete "${documentName}"? This action can be undone.`)) {
      try {
        await axios.delete(`http://localhost:5000/api/documents/${id}`);
        setDocuments(docs => docs.filter(d => d.id !== id));
        showToast('Document deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting document:', error);
        showToast('Error deleting document', 'error');
      }
    }
  };

  const previewDocument = (doc) => {
    const fileUrl = `http://localhost:5000/${doc.file_path}`;
    window.open(fileUrl, '_blank');
  };

  const downloadDocument = async (doc) => {
    try {
      showToast(`Downloading ${doc.file_name}...`, 'info');
      const fileUrl = `http://localhost:5000/${doc.file_path}`;

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
          <h2 className="text-2xl font-bold text-gray-800">Document Management</h2>
          <p className="text-sm text-gray-500 mt-1">Manage all your documents</p>
        </div>
        <button
          onClick={() => navigate('/upload-docs')}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition transform hover:-translate-y-0.5"
        >
          <i className="fas fa-upload mr-2"></i>Upload Documents
        </button>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
            <Select
              className="w-full text-sm"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
            >
              <option value="all">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
            />
          </div>
        </div>
        {(selectedClient !== 'all' || selectedDocType !== 'all' || selectedYear !== 'all' || searchQuery !== '') && (
          <div className="mt-4 flex justify-end">
            <button onClick={resetFilters} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
              <i className="fas fa-times-circle mr-2"></i>Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100/50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Clients Details</th>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Documents</th>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Uploaded</th>
                <th className="text-center px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Size</th>
                <th className="text-center px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <AnimatePresence>
                {currentDocumentsItems.length === 0 ? (
                  <motion.tr
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <td colSpan="5" className="py-20 text-center">
                      <div className="flex flex-col items-center">
                        <i className="fas fa-folder-open text-6xl text-gray-200 mb-4"></i>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">No documents found</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                          {searchQuery || selectedClient !== 'all' || selectedDocType !== 'all' || selectedYear !== 'all'
                            ? 'Try adjusting your filters or search query to find what you are looking for.'
                            : 'Upload your first document to get started with document management.'}
                        </p>
                      </div>
                    </td>
                  </motion.tr>
                ) : (
                  currentDocumentsItems.map((doc, idx) => (
                    <motion.tr
                      key={doc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ delay: idx * 0.05 }}
                      className="hover:bg-purple-50/10 group transition"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-700 flex items-center justify-center font-bold text-sm border border-purple-200 shadow-sm flex-shrink-0">
                            {doc.clientName?.charAt(0).toUpperCase() || <i className="fas fa-user text-xs opacity-50"></i>}
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                            <p className="text-base font-bold text-gray-800 truncate tracking-tight">{doc.clientName}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-purple-700 bg-purple-100 px-2 py-0.5 rounded uppercase tracking-tighter">
                                {doc.type}
                              </span>
                              <span className="text-xs font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded uppercase tracking-tighter">
                                {doc.financial_year}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 ${getFileIconBg(doc.file_name)} rounded-xl flex items-center justify-center shrink-0`}>
                            <i className={`${getFileIcon(doc.file_name)} ${getFileIconColor(doc.file_name)} text-xl`}></i>
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-bold text-gray-900 truncate tracking-tight">{doc.file_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-base font-bold text-gray-800">
                            {new Date(doc.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-black text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">
                          {(doc.file_size / 1024).toFixed(1)} KB
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => previewDocument(doc)}
                            className="w-10 h-10 flex items-center justify-center text-purple-600 hover:bg-purple-100 rounded-xl transition shadow-sm border border-purple-100 bg-white"
                            title="Preview/Open"
                          >
                            <i className="fas fa-eye text-base"></i>
                          </button>
                          <button
                            onClick={() => downloadDocument(doc)}
                            className="w-10 h-10 flex items-center justify-center text-blue-600 hover:bg-blue-100 rounded-xl transition shadow-sm border border-blue-100 bg-white"
                            title="Download"
                          >
                            <i className="fas fa-download text-base"></i>
                          </button>
                          <button
                            onClick={() => deleteDocument(doc.id, doc.document_name)}
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

        {/* Professional Pagination Controls */}
        {filteredDocuments.length > 0 && (
          <div className="px-6 py-4 bg-white border-t border-gray-100 flex flex-col lg:flex-row justify-between items-center gap-6">
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
                </select>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Docs</span>
              </div>
              <p className="text-sm text-gray-500 font-medium whitespace-nowrap">
                Showing <span className="text-gray-900 font-bold">{indexOfFirstItem + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(indexOfLastItem, filteredDocuments.length)}</span> of <span className="text-gray-900 font-bold">{filteredDocuments.length}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-gray-50 p-1 rounded-2xl border border-gray-100 shadow-sm">
                <button
                  onClick={() => paginate(1)}
                  disabled={currentPage === 1}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed opacity-50' : 'text-gray-600 hover:bg-white hover:text-purple-600 hover:shadow-sm'}`}
                >
                  <i className="fas fa-angle-double-left text-xs"></i>
                </button>
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed opacity-50' : 'text-gray-600 hover:bg-white hover:text-purple-600 hover:shadow-sm'}`}
                >
                  <i className="fas fa-chevron-left text-xs"></i>
                </button>
                <div className="flex items-center gap-1 mx-1">
                  {[...Array(totalPages)].map((_, i) => {
                    if (totalPages > 7 && i + 1 !== 1 && i + 1 !== totalPages && Math.abs(currentPage - (i + 1)) > 1) {
                      if (i + 1 === 2 || i + 1 === totalPages - 1) return <span key={i} className="text-gray-300 px-1 font-black">·</span>;
                      return null;
                    }
                    return (
                      <button
                        key={i + 1}
                        onClick={() => paginate(i + 1)}
                        className={`w-9 h-9 rounded-xl text-xs font-black transition-all duration-300 transform active:scale-95 ${currentPage === i + 1 ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-white hover:text-purple-600 hover:shadow-sm'}`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed opacity-50' : 'text-gray-600 hover:bg-white hover:text-purple-600 hover:shadow-sm'}`}
                >
                  <i className="fas fa-chevron-right text-xs"></i>
                </button>
                <button
                  onClick={() => paginate(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed opacity-50' : 'text-gray-600 hover:bg-white hover:text-purple-600 hover:shadow-sm'}`}
                >
                  <i className="fas fa-angle-double-right text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Documents;