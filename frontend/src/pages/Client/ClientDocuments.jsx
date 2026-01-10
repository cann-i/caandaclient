import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';

function ClientDocuments({ showToast }) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('');
  const [otherCategoryName, setOtherCategoryName] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [documents, setDocuments] = useState([]);

  // Filter States
  const [selectedType, setSelectedType] = useState('All Types');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingDocs, setFetchingDocs] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Wrap in useCallback to satisfy useEffect dependency
  const fetchCategories = React.useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/documents/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const fetchDocuments = React.useCallback(async (userId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/documents?user_id=${userId}`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      showToast('Failed to load documents', 'error');
    } finally {
      setFetchingDocs(false);
    }
  }, [showToast]);

  // Initial Data Fetch
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      // Fetch data once user is available
      fetchCategories();
      fetchDocuments(parsedUser.id);
    } else {
      setFetchingDocs(false);
    }
  }, [fetchCategories, fetchDocuments]);

  const getFileIcon = (filename) => {
    if (!filename) return 'fas fa-file';
    if (filename.endsWith('.pdf')) return 'fas fa-file-pdf';
    if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) return 'fas fa-file-excel';
    if (filename.endsWith('.docx') || filename.endsWith('.doc')) return 'fas fa-file-word';
    if (filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'fas fa-file-image';
    return 'fas fa-file';
  };

  const getFileIconBg = (filename) => {
    if (!filename) return 'bg-gray-100';
    if (filename.endsWith('.pdf')) return 'bg-red-100';
    if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) return 'bg-green-100';
    if (filename.endsWith('.docx') || filename.endsWith('.doc')) return 'bg-blue-100';
    if (filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'bg-purple-100';
    return 'bg-gray-100';
  };

  const downloadDocument = async (filePath, fileName) => {
    try {
      showToast('Downloading...', 'info');
      const response = await axios.get(`http://localhost:5000/${filePath}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      // Use provided filename or extract from path
      const name = fileName || filePath.split('/').pop();
      link.setAttribute('download', name);
      document.body.appendChild(link);
      link.click();

      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast('Download completed', 'success');
    } catch (error) {
      console.error('Download error:', error);
      showToast('Failed to download document', 'error');
    }
  };

  const previewDocument = (filePath) => {
    const url = `http://localhost:5000/${filePath}`;
    window.open(url, '_blank');
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();

    if (!uploadCategory) {
      showToast('Please select a document category', 'error');
      return;
    }

    // Fix strict equality warning
    const selectedCat = categories.find(c => c.id === parseInt(uploadCategory));
    const categoryName = selectedCat ? selectedCat.category_name : 'Document';

    if (categoryName === 'Other' && !otherCategoryName.trim()) {
      showToast('Please specify the document name', 'error');
      return;
    }

    if (!uploadFile) {
      showToast('Please select a file to upload', 'error');
      return;
    }

    if (!user || !user.id) {
      showToast('User session invalid. Please login again.', 'error');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('client_id', user.id);
    formData.append('category_id', uploadCategory);
    formData.append('description', categoryName === 'Other' ? otherCategoryName : categoryName);
    formData.append('visibility', 'client');
    formData.append('financial_year', new Date().getFullYear().toString());
    formData.append('month', new Date().toLocaleString('default', { month: 'long' }));
    formData.append('uploaded_by', user.id);
    formData.append('files', uploadFile);

    try {
      await axios.post('http://localhost:5000/api/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showToast(`Uploaded ${uploadFile.name} successfully!`, 'success');
      setIsUploadModalOpen(false);
      setUploadFile(null);
      setUploadCategory('');
      setOtherCategoryName('');

      fetchDocuments(user.id);
    } catch (error) {
      console.error('Upload error:', error);
      showToast('Failed to upload document. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };
  // ...


  // Filter Logic
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const type = doc.type || 'Document';
      // Match against selectedType which will now be the category name or 'All Types'
      const matchesType = selectedType === 'All Types' || type === selectedType;

      const searchLower = searchQuery.toLowerCase();
      const name = doc.document_name || doc.file_name || '';
      const matchesSearch = name.toLowerCase().includes(searchLower);

      return matchesType && matchesSearch;
    });
  }, [documents, selectedType, searchQuery]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDocuments.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Documents</h2>
          <p className="text-sm text-gray-500 mt-1">Manage and access your important financial documents</p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2"
        >
          <i className="fas fa-cloud-upload-alt"></i>
          <span>Upload Document</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-30 group-hover:scale-110 transition-transform z-0">
            <i className="fas fa-folder-open text-4xl text-white"></i>
          </div>
          <div className="relative z-10">
            <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-1">Total Documents</p>
            <h3 className="text-3xl font-black tracking-tight mb-1">{documents.length}</h3>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-30 group-hover:scale-110 transition-transform z-0">
            <i className="fas fa-calendar-plus text-4xl text-white"></i>
          </div>
          <div className="relative z-10">
            <p className="text-green-100 text-sm font-medium uppercase tracking-wider mb-1">New (This Month)</p>
            <h3 className="text-3xl font-black tracking-tight mb-1">
              {documents.filter(d => d.month === new Date().toLocaleString('default', { month: 'long' })).length}
            </h3>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
            <div className="relative">
              <i className="fas fa-filter absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <select
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setCurrentPage(1); // Reset to first page on filter change
                }}
              >
                <option value="All Types">All Types</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.category_name}>{cat.category_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input
                type="text"
                placeholder="Search documents by name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100/50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Document Name</th>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Document Type</th>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Uploaded Date</th>
                <th className="text-left px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Size</th>
                <th className="text-center px-6 py-4 text-sm font-bold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fetchingDocs ? (
                <tr>
                  <td colSpan="4" className="py-20 text-center text-gray-500">
                    <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
                    <p>Loading documents...</p>
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-20 text-center">
                    <div className="flex flex-col items-center">
                      <i className="fas fa-folder-open text-6xl text-gray-200 mb-4"></i>
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">No documents found</h3>
                      <p className="text-gray-500">Upload a document to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((doc, idx) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-purple-50/10 group transition"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${getFileIconBg(doc.file_name)} rounded-lg flex items-center justify-center`}>
                          <i className={`${getFileIcon(doc.file_name)} text-lg`}></i>
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{doc.file_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {/* Type badge removed from here */}
                            {doc.uploader_role !== 'client' && (
                              <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200 font-bold uppercase">
                                CA Upload
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 font-medium">
                        {doc.type || 'Document'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {doc.file_size ? (doc.file_size / 1024 / 1024).toFixed(2) + ' MB' : '0 KB'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => previewDocument(doc.file_path)}
                          className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition"
                          title="Preview"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button
                          onClick={() => downloadDocument(doc.file_path, doc.file_name)}
                          className="text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 p-2 rounded-lg transition"
                          title="Download"
                        >
                          <i className="fas fa-download"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredDocuments.length > 0 && (
          <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-between items-center">
            <p className="text-sm text-gray-500 font-medium">
              Showing <span className="text-gray-900 font-bold">{indexOfFirstItem + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(indexOfLastItem, filteredDocuments.length)}</span> of <span className="text-gray-900 font-bold">{filteredDocuments.length}</span>
            </p>
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-2xl border border-gray-100">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition ${currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-white hover:text-purple-600 hover:shadow-sm'}`}
              >
                <i className="fas fa-chevron-left text-xs"></i>
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => paginate(i + 1)}
                  className={`w-9 h-9 rounded-xl text-xs font-black transition ${currentPage === i + 1 ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-white hover:text-purple-600'}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition ${currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-white hover:text-purple-600 hover:shadow-sm'}`}
              >
                <i className="fas fa-chevron-right text-xs"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-all duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 animate-fadeIn">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Upload Document</h3>
                <p className="text-sm text-gray-500 mt-1">Share files securely with your CA</p>
              </div>
              <button onClick={() => setIsUploadModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Document Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none bg-gray-50 focus:bg-white"
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.category_name}</option>
                  ))}
                </select>
              </div>

              {/* Conditional Other Input */}
              {categories.find(c => c.id === parseInt(uploadCategory))?.category_name === 'Other' && (
                <div className="animate-fadeIn">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Specify Document Name</label>
                  <input
                    type="text"
                    value={otherCategoryName}
                    onChange={(e) => setOtherCategoryName(e.target.value)}
                    placeholder="E.g. Property Papers, Agreement, etc."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none bg-gray-50 focus:bg-white"
                    autoFocus
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Attach File</label>
                <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-indigo-500 hover:bg-indigo-50/30 transition-all group cursor-pointer relative">
                  <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                  />
                  {uploadFile ? (
                    <div className="text-indigo-600 animate-pulse">
                      <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i className="fas fa-check text-2xl"></i>
                      </div>
                      <p className="font-bold text-lg text-gray-800">{uploadFile.name}</p>
                      <p className="text-sm text-gray-500 mt-1">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="text-gray-500 group-hover:text-gray-700">
                      <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-indigo-100 group-hover:text-indigo-500 transition-colors">
                        <i className="fas fa-cloud-upload-alt text-2xl"></i>
                      </div>
                      <p className="font-semibold text-gray-700">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-400 mt-2">Supported formats: PDF, Excel, Word (Max 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'Uploading...' : 'Upload Document Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default ClientDocuments;
