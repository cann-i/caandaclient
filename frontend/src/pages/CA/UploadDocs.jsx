import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import Select from 'react-select';


const generateFinancialYears = () => {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 10;
  const endYear = currentYear;
  const years = [];

  for (let y = endYear; y >= startYear; y--) {
    const nextYearShort = (y + 1).toString().slice(-2);
    years.push(`${y}-${nextYearShort}`);
  }
  return years;
};

function UploadDocs({ showToast }) {
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
      formData.append('description', ''); // placeholder
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
      // Reset form
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Upload Documents</h2>

      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Client & Document Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Client *</label>
            <Select
              className="w-full text-sm"
              value={clients.find(c => c.id === parseInt(selectedClient)) ? {
                value: selectedClient,
                label: clients.find(c => c.id === parseInt(selectedClient)).client_name
              } : null}
              onChange={(opt) => setSelectedClient(opt ? opt.value : '')}
              options={clients.map(c => ({ value: c.id, label: c.client_name }))}
              placeholder="Choose a client..."
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Document Type *</label>
            <Select
              className="w-full text-sm"
              value={categories.find(cat => cat.id === parseInt(docType)) ? {
                value: docType,
                label: categories.find(cat => cat.id === parseInt(docType)).category_name
              } : null}
              onChange={(opt) => setDocType(opt ? opt.value : '')}
              options={categories.map(cat => ({ value: cat.id, label: cat.category_name }))}
              placeholder="Select type..."
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
        </div>

        {/* Period & Year */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Period/Month</label>
            <input
              type="text"
              placeholder="e.g., August 2024, Q2 2024"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              value={period} onChange={e => setPeriod(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Financial Year</label>
            <select
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
              value={financialYear} onChange={e => setFinancialYear(e.target.value)}
            >
              <option value="">Select year...</option>
              {generateFinancialYears().map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Visibility */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Visibility *</label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input type="radio" name="visibility" value="client" checked={visibility === 'client'} onChange={() => setVisibility('client')} className="mr-2" />
              <span className="text-sm text-gray-700">Visible to Client</span>
            </label>
            <label className="flex items-center">
              <input type="radio" name="visibility" value="internal" checked={visibility === 'internal'} onChange={() => setVisibility('internal')} className="mr-2" />
              <span className="text-sm text-gray-700">Internal Only</span>
            </label>
            <label className="flex items-center">
              <input type="radio" name="visibility" value="both" checked={visibility === 'both'} onChange={() => setVisibility('both')} className="mr-2" />
              <span className="text-sm text-gray-700">Both</span>
            </label>
          </div>
        </div>

        {/* Tags */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma separated)</label>
          <input
            type="text"
            placeholder="e.g., GST, Monthly, Important"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
            value={tags} onChange={e => setTags(e.target.value)}
          />
        </div>

        {/* File Drop / Browse */}
        <div
          className={`file-drop-zone border-2 border-dashed rounded-xl p-12 text-center mb-6 cursor-pointer transition ${dragOver ? 'border-purple-500 bg-purple-50' : 'border-gray-300'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
        >
          <i className="fas fa-cloud-upload-alt text-6xl text-gray-400 mb-4"></i>
          <p className="text-lg text-gray-700 mb-2">Drag & drop files here</p>
          <p className="text-sm text-gray-500 mb-4">or click to browse</p>
          <button type="button" className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition">
            <i className="fas fa-folder-open mr-2"></i>Browse Files
          </button>
          <p className="text-xs text-gray-400 mt-4">
            Supported formats: PDF, Excel, Word, Images (Max 10MB per file)
          </p>
          <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-2 text-gray-800">Selected Files:</h3>
            <ul className="list-disc pl-5 text-gray-700">
              {files.map((file, index) => <li key={index}>{file.name}</li>)}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className={`px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition font-medium flex items-center ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isUploading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>Uploading...
              </>
            ) : (
              <>
                <i className="fas fa-check mr-2"></i>Upload Documents
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default UploadDocs;
