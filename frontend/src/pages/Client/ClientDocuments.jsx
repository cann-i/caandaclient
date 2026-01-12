import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '../../api/axios';
import { BASE_URL } from '../../config';
import {
  File,
  FileText,
  UploadCloud,
  Download,
  Eye,
  Search,
  Filter,
  Plus,
  X,
  Check,
  Loader2,
  FolderOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Button from '../../components/ui/Button';

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
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get('/documents/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);

  const fetchDocuments = useCallback(async (userId) => {
    try {
      const response = await axios.get(`/documents?user_id=${userId}`);
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      showToast('Failed to load documents', 'error');
    } finally {
      setFetchingDocs(false);
    }
  }, [showToast]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchCategories();
      fetchDocuments(parsedUser.id);
    } else {
      setFetchingDocs(false);
    }
  }, [fetchCategories, fetchDocuments]);

  const getFileIcon = (filename) => {
    if (!filename) return <File size={20} className="text-secondary" />;
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') return <FileText size={20} className="text-error" />;
    if (['xlsx', 'xls'].includes(ext)) return <FileText size={20} className="text-success" />;
    if (['docx', 'doc'].includes(ext)) return <FileText size={20} className="text-accent" />;
    if (['png', 'jpg', 'jpeg'].includes(ext)) return <FileText size={20} className="text-warning" />;
    return <File size={20} className="text-secondary" />;
  };

  const getFileIconBg = (filename) => {
    if (!filename) return 'bg-surface-highlight';
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'pdf') return 'bg-error/10';
    if (['xlsx', 'xls'].includes(ext)) return 'bg-success/10';
    if (['docx', 'doc'].includes(ext)) return 'bg-accent/10';
    if (['png', 'jpg', 'jpeg'].includes(ext)) return 'bg-warning/10';
    return 'bg-surface-highlight';
  };

  const downloadDocument = async (filePath, fileName) => {
    try {
      showToast('Downloading...', 'info');
      const response = await axios.get(`${BASE_URL}/${filePath}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
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
    const url = `${BASE_URL}/${filePath}`;
    window.open(url, '_blank');
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadCategory) { showToast('Please select a document category', 'error'); return; }

    const selectedCat = categories.find(c => c.id === parseInt(uploadCategory));
    const categoryName = selectedCat ? selectedCat.category_name : 'Document';

    if (categoryName === 'Other' && !otherCategoryName.trim()) { showToast('Please specify the document name', 'error'); return; }
    if (!uploadFile) { showToast('Please select a file to upload', 'error'); return; }
    if (!user || !user.id) { showToast('User session invalid. Please login again.', 'error'); return; }

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
      await axios.post('/documents/upload', formData, {
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
      showToast('Failed to upload document.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const type = doc.type || 'Document';
      const matchesType = selectedType === 'All Types' || type === selectedType;
      const searchLower = searchQuery.toLowerCase();
      const name = doc.document_name || doc.file_name || '';
      const matchesSearch = name.toLowerCase().includes(searchLower);
      return matchesType && matchesSearch;
    });
  }, [documents, selectedType, searchQuery]);

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDocuments.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">My Documents</h1>
          <p className="text-secondary text-sm">Access and manage your financial files.</p>
        </div>
        <Button variant="accent" onClick={() => setIsUploadModalOpen(true)} className="gap-2">
          <Plus size={16} /> Upload Document
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-border rounded-xl p-4 flex flex-col md:flex-row gap-4">
         <div className="relative md:w-1/3">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={16} />
            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent outline-none appearance-none"
            >
               <option value="All Types">All Types</option>
               {categories.map(cat => (
                 <option key={cat.id} value={cat.category_name}>{cat.category_name}</option>
               ))}
            </select>
         </div>
         <div className="relative md:w-2/3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={16} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent outline-none"
            />
         </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="border-b border-border bg-surface-highlight/30">
                     <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Name</th>
                     <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Type</th>
                     <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Date</th>
                     <th className="p-4 text-xs font-mono text-secondary uppercase font-medium">Size</th>
                     <th className="p-4 text-xs font-mono text-secondary uppercase font-medium text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border">
                  {fetchingDocs ? (
                     <tr><td colSpan={5} className="p-8 text-center text-secondary"><Loader2 className="animate-spin mx-auto" /> Loading...</td></tr>
                  ) : currentItems.length === 0 ? (
                     <tr>
                        <td colSpan={5} className="p-12 text-center text-secondary">
                           <FolderOpen size={32} className="mx-auto mb-2 opacity-20" />
                           <p>No documents found.</p>
                        </td>
                     </tr>
                  ) : (
                     currentItems.map((doc) => (
                        <tr key={doc.id} className="hover:bg-surface-highlight/50 transition-colors group">
                           <td className="p-4">
                              <div className="flex items-center gap-3">
                                 <div className={`p-2 rounded-lg ${getFileIconBg(doc.file_name)}`}>
                                    {getFileIcon(doc.file_name)}
                                 </div>
                                 <div>
                                    <p className="text-sm font-bold text-primary truncate max-w-[200px]">{doc.file_name}</p>
                                    {doc.uploader_role !== 'client' && (
                                       <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded border border-accent/20">CA Upload</span>
                                    )}
                                 </div>
                              </div>
                           </td>
                           <td className="p-4">
                              <span className="text-xs bg-surface-highlight border border-border px-2 py-1 rounded text-secondary">
                                 {doc.type || 'Document'}
                              </span>
                           </td>
                           <td className="p-4 text-xs text-secondary font-mono">
                              {new Date(doc.created_at).toLocaleDateString()}
                           </td>
                           <td className="p-4 text-xs text-secondary font-mono">
                              {doc.file_size ? (doc.file_size / 1024 / 1024).toFixed(2) + ' MB' : '-'}
                           </td>
                           <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => previewDocument(doc.file_path)} className="p-1.5 hover:bg-surface-highlight rounded text-secondary hover:text-accent"><Eye size={16} /></button>
                                 <button onClick={() => downloadDocument(doc.file_path, doc.file_name)} className="p-1.5 hover:bg-surface-highlight rounded text-secondary hover:text-success"><Download size={16} /></button>
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
            <div className="p-4 border-t border-border flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <span className="text-xs text-secondary">Rows:</span>
                  <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-background border border-border rounded p-1 outline-none text-primary text-xs">
                     <option value={5}>5</option>
                     <option value={10}>10</option>
                     <option value={20}>20</option>
                  </select>
                  <span className="text-xs text-secondary ml-2">{((currentPage-1)*itemsPerPage)+1}-{Math.min(currentPage*itemsPerPage, filteredDocuments.length)} of {filteredDocuments.length}</span>
               </div>
               <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft size={16} /></Button>
                  <Button variant="secondary" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight size={16} /></Button>
               </div>
            </div>
         )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
         {isUploadModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <motion.div initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.9, opacity:0}} className="bg-surface border border-border rounded-xl w-full max-w-lg overflow-hidden">
                  <div className="p-6 border-b border-border flex justify-between items-center bg-surface-highlight/20">
                     <h3 className="text-lg font-bold text-primary">Upload Document</h3>
                     <button onClick={() => setIsUploadModalOpen(false)}><X size={20} className="text-secondary hover:text-primary" /></button>
                  </div>
                  <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
                     <div>
                        <label className="block text-xs font-mono text-secondary uppercase mb-2">Category</label>
                        <select
                          value={uploadCategory}
                          onChange={(e) => setUploadCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent outline-none"
                        >
                           <option value="">Select Category</option>
                           {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.category_name}</option>)}
                        </select>
                     </div>

                     {categories.find(c => c.id === parseInt(uploadCategory))?.category_name === 'Other' && (
                        <div>
                           <label className="block text-xs font-mono text-secondary uppercase mb-2">Document Name</label>
                           <input type="text" value={otherCategoryName} onChange={(e) => setOtherCategoryName(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-primary focus:border-accent outline-none" placeholder="e.g. Agreement" />
                        </div>
                     )}

                     <div>
                        <label className="block text-xs font-mono text-secondary uppercase mb-2">File</label>
                        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:bg-surface-highlight/30 transition-colors relative cursor-pointer group">
                           <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setUploadFile(e.target.files[0])} />
                           {uploadFile ? (
                              <div className="flex flex-col items-center">
                                 <Check size={32} className="text-success mb-2" />
                                 <p className="text-sm font-bold text-primary">{uploadFile.name}</p>
                                 <p className="text-xs text-secondary">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                           ) : (
                              <div className="flex flex-col items-center">
                                 <UploadCloud size={32} className="text-secondary mb-2 group-hover:text-accent transition-colors" />
                                 <p className="text-sm text-secondary">Click to browse or drag file here</p>
                              </div>
                           )}
                        </div>
                     </div>

                     <div className="pt-4">
                        <Button variant="accent" type="submit" disabled={loading} className="w-full">
                           {loading ? <Loader2 className="animate-spin" size={16} /> : 'Upload'}
                        </Button>
                     </div>
                  </form>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
}

export default ClientDocuments;
