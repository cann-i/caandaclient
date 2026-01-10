import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';
import { UploadCloud, File, X, Check, Loader2, FolderOpen } from 'lucide-react';
import Button from '../../components/ui/Button';

const generateFinancialYears = () => {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 10;
  const endYear = currentYear + 1;
  const years = [];

  for (let y = endYear; y >= startYear; y--) {
    const nextYearShort = (y + 1).toString().slice(-2);
    years.push(`${y}-${nextYearShort}`);
  }
  return years;
};

function UploadDocs({ showToast }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [clients, setClients] = useState([]);
  const [categories, setCategories] = useState([]);

  const [selectedClient, setSelectedClient] = useState('');
  const [docType, setDocType] = useState('');
  const [period, setPeriod] = useState('');
  const [financialYear, setFinancialYear] = useState('');
  const [visibility, setVisibility] = useState('client');
  const [tags, setTags] = useState('');
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, catsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/clients'),
          axios.get('http://localhost:5000/api/documents/categories')
        ]);
        setClients(clientsRes.data);
        setCategories(catsRes.data);
      } catch (error) {
        console.error('Error fetching categories/clients:', error);
      }
    };
    fetchData();
  }, []);

  const handleUpload = async () => {
    if (!selectedClient || !docType) {
      showToast('Please select client and document type!', 'error');
      return;
    }
    if (files.length === 0) {
      showToast('Please select files first!', 'error');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('client_id', selectedClient);
      formData.append('category_id', docType);
      formData.append('financial_year', financialYear);
      formData.append('month', period);
      formData.append('description', '');
      formData.append('tags', tags);
      formData.append('visibility', visibility);
      formData.append('is_acknowledgement', 'false');

      files.forEach(file => {
        formData.append('files', file);
      });

      await axios.post('http://localhost:5000/api/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showToast(`${files.length} file(s) uploaded successfully!`, 'success');
      setFiles([]);
      setSelectedClient('');
      setDocType('');
      setPeriod('');
      setFinancialYear('');
      setTags('');
    } catch (error) {
      console.error('Upload error:', error);
      showToast('Error uploading files', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e) => setFiles([...e.target.files]);
  const handleBrowseClick = () => fileInputRef.current.click();
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
    showToast(`${droppedFiles.length} file(s) added!`, 'info');
  };

  const removeFile = (index) => {
     setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Select styles
  const selectStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: '#121212',
      borderColor: '#2A2A2A',
      color: '#E0E0E0',
      padding: '2px',
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold text-primary tracking-tight">Upload Documents</h2>
           <p className="text-secondary text-sm">Upload and categorize client files.</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface border border-border rounded-xl p-6 md:p-8"
      >
        {/* Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <label className="block text-xs font-mono text-secondary uppercase mb-2">Select Client *</label>
            <Select
              className="text-sm"
              value={clients.find(c => c.id === parseInt(selectedClient)) ? {
                value: selectedClient,
                label: clients.find(c => c.id === parseInt(selectedClient)).client_name
              } : null}
              onChange={(opt) => setSelectedClient(opt ? opt.value : '')}
              options={clients.map(c => ({ value: c.id, label: c.client_name }))}
              placeholder="Choose a client..."
              isSearchable={true}
              styles={selectStyles}
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-secondary uppercase mb-2">Document Type *</label>
            <Select
              className="text-sm"
              value={categories.find(cat => cat.id === parseInt(docType)) ? {
                value: docType,
                label: categories.find(cat => cat.id === parseInt(docType)).category_name
              } : null}
              onChange={(opt) => setDocType(opt ? opt.value : '')}
              options={categories.map(cat => ({ value: cat.id, label: cat.category_name }))}
              placeholder="Select type..."
              isSearchable={true}
              styles={selectStyles}
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-secondary uppercase mb-2">Period/Month</label>
            <input
              type="text"
              placeholder="e.g., Aug 2024"
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
              value={period} onChange={e => setPeriod(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-secondary uppercase mb-2">Financial Year</label>
            <select
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent outline-none"
              value={financialYear} onChange={e => setFinancialYear(e.target.value)}
            >
              <option value="">Select year...</option>
              {generateFinancialYears().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
             <label className="block text-xs font-mono text-secondary uppercase mb-2">Visibility</label>
             <div className="flex gap-4">
               {['client', 'internal', 'both'].map((opt) => (
                 <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                   <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${visibility === opt ? 'border-accent bg-accent' : 'border-secondary group-hover:border-primary'}`}>
                      {visibility === opt && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                   </div>
                   <input type="radio" name="visibility" value={opt} checked={visibility === opt} onChange={() => setVisibility(opt)} className="hidden" />
                   <span className="text-sm text-primary capitalize">{opt === 'both' ? 'Both' : opt === 'internal' ? 'Internal Only' : 'Visible to Client'}</span>
                 </label>
               ))}
             </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-mono text-secondary uppercase mb-2">Tags</label>
            <input
              type="text"
              placeholder="e.g., GST, Monthly, Important (comma separated)"
              className="w-full px-3 py-2.5 bg-background border border-border rounded-lg text-primary text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
              value={tags} onChange={e => setTags(e.target.value)}
            />
          </div>
        </div>

        {/* File Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center mb-6 cursor-pointer transition-all duration-300 ${dragOver ? 'border-accent bg-accent/10 scale-[1.02]' : 'border-border hover:border-accent/50 hover:bg-surface-highlight'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
        >
          <div className="w-16 h-16 bg-surface-highlight rounded-full flex items-center justify-center mx-auto mb-4">
             <UploadCloud className="text-accent" size={32} />
          </div>
          <p className="text-lg font-medium text-primary mb-1">Drag & drop files here</p>
          <p className="text-sm text-secondary mb-6">or click to browse</p>
          <Button variant="secondary" className="pointer-events-none">
            <FolderOpen size={16} className="mr-2" /> Browse Files
          </Button>
          <p className="text-xs text-secondary mt-4 font-mono">
            Supported: PDF, Excel, Word, Images (Max 10MB)
          </p>
          <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        </div>

        {/* Selected Files List */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: 'auto' }}
               exit={{ opacity: 0, height: 0 }}
               className="mb-8"
            >
              <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                 <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs">{files.length}</div>
                 Selected Files
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {files.map((file, index) => (
                  <motion.div
                    key={`${file.name}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center justify-between p-3 bg-background border border-border rounded-lg group"
                  >
                     <div className="flex items-center gap-3 overflow-hidden">
                        <File className="text-secondary flex-shrink-0" size={18} />
                        <span className="text-sm text-primary truncate">{file.name}</span>
                        <span className="text-xs text-secondary font-mono">({(file.size / 1024).toFixed(0)} KB)</span>
                     </div>
                     <button
                       onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                       className="text-secondary hover:text-error transition-colors p-1"
                     >
                        <X size={16} />
                     </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-border">
          <Button variant="ghost" onClick={() => navigate('/documents')}>Cancel</Button>
          <Button
            variant="accent"
            onClick={handleUpload}
            disabled={isUploading || files.length === 0}
            className="w-40"
          >
            {isUploading ? <Loader2 className="animate-spin mr-2" size={18} /> : <Check className="mr-2" size={18} />}
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default UploadDocs;
