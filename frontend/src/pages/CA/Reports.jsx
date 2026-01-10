import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

function Reports({ showToast }) {
  const navigate = useNavigate();

  const reports = [
    {
      title: 'Client Report',
      description: 'Comprehensive client information and statistics',
      icon: 'fas fa-users',
      color: 'from-blue-500 to-blue-600',
      path: '/reports/client'
    },
    {
      title: 'Document Report',
      description: 'Document management and filing reports',
      icon: 'fas fa-folder',
      color: 'from-green-500 to-green-600',
      path: '/reports/document'
    },
    {
      title: 'Payment Report',
      description: 'Payment tracking and financial reports',
      icon: 'fas fa-rupee-sign',
      color: 'from-purple-500 to-purple-600',
      path: '/reports/payment'
    },
    {
      title: 'Request Report',
      description: 'Client requests and service reports',
      icon: 'fas fa-tasks',
      color: 'from-amber-500 to-amber-600',
      path: '/reports/request'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Reports</h2>
        <p className="text-sm text-gray-500 mt-1">Generate and view various reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {reports.map((report, index) => (
          <motion.div
            key={report.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition cursor-pointer"
            onClick={() => navigate(report.path)}
          >
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 bg-gradient-to-r ${report.color} rounded-xl flex items-center justify-center`}>
                <i className={`${report.icon} text-2xl text-white`}></i>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">{report.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{report.description}</p>
              </div>
              <div>
                <i className="fas fa-chevron-right text-gray-400"></i>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default Reports;