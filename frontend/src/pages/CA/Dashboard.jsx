import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_BASE_URL = 'http://localhost:5000/api';

function EnhancedDashboard({ showToast }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // State for data
  const [stats, setStats] = useState({
    totalClients: 0,
    totalDocuments: 0,
    pendingReturns: 0,
    totalRevenue: 0,
    thisMonthRevenue: 0,
    revenueGrowth: 0
  });

  const [recentClients, setRecentClients] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [revenueData, setRevenueData] = useState([]);

  useEffect(() => {
    const fetchData = async (isInitial = false) => {
      try {
        if (isInitial) setLoading(true);

        const [clientsRes, requestsRes, documentsRes, returnsRes, invoicesRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/clients`),
          axios.get(`${API_BASE_URL}/requests`),
          axios.get(`${API_BASE_URL}/documents`),
          axios.get(`${API_BASE_URL}/returns`),
          axios.get(`${API_BASE_URL}/invoices`)
        ]);

        // Process Stats
        const clients = clientsRes.data || [];
        const documents = documentsRes.data || [];
        const returns = returnsRes.data || [];
        const invoices = invoicesRes.data || [];

        const pendingReturnsCount = returns.filter(r => r.status === 'pending' || r.status === 'Pending').length;

        // Revenue Calculations
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        let totalRev = 0;
        let thisMonthRev = 0;
        let lastMonthRev = 0;

        invoices.forEach(inv => {
          const amount = parseFloat(inv.totalAmount) || 0;
          totalRev += amount;

          const d = inv.date ? new Date(inv.date) : new Date(inv.createdAt);
          if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            thisMonthRev += amount;
          }
          if (d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear) {
            lastMonthRev += amount;
          }
        });

        // Calculate Growth
        let growth = 0;
        if (lastMonthRev > 0) {
          growth = ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100;
        } else if (thisMonthRev > 0) {
          growth = 100; // 100% growth if previous month was 0
        }

        setStats({
          totalClients: clients.length,
          totalDocuments: documents.length,
          pendingReturns: pendingReturnsCount,
          totalRevenue: totalRev,
          thisMonthRevenue: thisMonthRev,
          revenueGrowth: growth.toFixed(1)
        });

        // Process Recent 5 Items
        setRecentClients(clients.slice(0, 5));
        setRecentRequests((requestsRes.data || []).slice(0, 5));
        setRecentDocuments(documents.slice(0, 5));

        // Process Revenue Chart Data (Last 6 months)
        processRevenueData(invoices);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        if (isInitial) setLoading(false);
      }
    };

    // Initial fetch
    fetchData(true);

    // Set up polling every 5 seconds
    const intervalId = setInterval(() => {
      fetchData(false);
    }, 5000);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, []);

  const processRevenueData = (invoices) => {
    const months = {};
    const today = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = {
        name: d.toLocaleString('default', { month: 'short' }),
        revenue: 0,
        paid: 0,
        pending: 0,
        fullDate: key
      };
    }

    invoices.forEach(inv => {
      const date = inv.date ? new Date(inv.date) : new Date(inv.createdAt);
      if (!isNaN(date)) {
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (months[key]) {
          const amount = parseFloat(inv.totalAmount) || 0;
          const paid = parseFloat(inv.paidAmount) || 0;
          const pending = parseFloat(inv.balanceAmount) || (amount - paid); // Fallback calculation

          months[key].revenue += amount;
          months[key].paid += paid;
          months[key].pending += pending;
        }
      }
    });

    setRevenueData(Object.values(months));
  };

  const handleQuickAction = (action) => {
    switch (action) {
      case 'New Client': navigate('/clients'); break;
      case 'Upload Doc': navigate('/upload-docs'); break;
      case 'New Return': navigate('/returns'); break;
      case 'New Invoice': navigate('/invoices'); break;
      default: break;
    }
  };

  const formatCurrency = (amount) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return `₹${amount.toLocaleString()}`;
  };

  // Custom Tooltip Component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-indigo-50">
          <p className="font-bold text-gray-800 mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-indigo-600">
              Total: <span className="font-bold">{formatCurrency(data.revenue)}</span>
            </p>
            <div className="w-full h-px bg-gray-100 my-1"></div>
            <p className="text-xs font-medium text-emerald-600 flex justify-between items-center w-32">
              <span>Paid:</span>
              <span className="font-bold">{formatCurrency(data.paid)}</span>
            </p>
            <p className="text-xs font-medium text-amber-500 flex justify-between items-center w-32">
              <span>Pending:</span>
              <span className="font-bold">{formatCurrency(data.pending)}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 lg:p-1 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Section */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl shadow-lg p-6 md:p-8 text-white overflow-hidden">
          {/* Decorative background blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl -ml-12 -mb-12"></div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                Dashboard
              </h2>
              <p className="text-indigo-100 text-sm font-medium">
                Welcome back! Here's what's happening today.
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <div className="inline-flex items-center px-4 py-2 rounded-lg bg-white/10 backdrop-blur-md border border-white/20">
                <div className="text-right">
                  <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">Current Period</p>
                  <p className="text-sm font-bold text-white">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              label: 'Total Clients',
              value: stats.totalClients,
              change: '+12%',
              sub: 'vs last month',
              icon: 'fa-users',
              gradient: 'from-blue-500 to-cyan-500'
            },
            {
              label: 'Total Documents',
              value: stats.totalDocuments,
              change: '+5%',
              sub: 'vs last month',
              icon: 'fa-folder-open',
              gradient: 'from-emerald-500 to-teal-500'
            },
            {
              label: 'Pending Returns',
              value: stats.pendingReturns,
              change: 'Action needed',
              sub: 'High Priority',
              icon: 'fa-clock',
              gradient: 'from-orange-400 to-red-400'
            },
            {
              label: 'Total Revenue',
              value: formatCurrency(stats.totalRevenue),
              change: `${stats.revenueGrowth > 0 ? '+' : ''}${stats.revenueGrowth}%`,
              sub: 'vs last month',
              icon: 'fa-chart-line',
              gradient: 'from-purple-500 to-indigo-500'
            }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`rounded-2xl p-6 shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-300 relative overflow-hidden bg-gradient-to-br ${stat.gradient} text-white`}
            >
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl -mr-6 -mt-6"></div>

              <div className="relative flex justify-between items-start z-10">
                <div>
                  <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                  <h3 className="text-3xl font-extrabold mt-1">{stat.value}</h3>
                  <div className="mt-4 flex items-center text-xs font-medium text-white/90">
                    <span className="bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">
                      {stat.change}
                    </span>
                    <span className="ml-2 opacity-80">{stat.sub}</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner border border-white/10">
                  <i className={`fas ${stat.icon} text-xl text-white`}></i>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Column (Left - 2/3 width) */}
          <div className="lg:col-span-2 space-y-8">

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 text-white flex items-center justify-center">
                  <i className="fas fa-bolt text-sm"></i>
                </div>
                <h3 className="font-bold text-gray-800">Quick Actions</h3>
              </div>
              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: 'New Client', icon: 'fa-user-plus', gradient: 'from-indigo-500 to-blue-500', bg: 'bg-indigo-50', text: 'text-indigo-700' },
                  { name: 'Upload Doc', icon: 'fa-cloud-upload-alt', gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', text: 'text-blue-700' },
                  { name: 'New Return', icon: 'fa-file-invoice-dollar', gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
                  { name: 'New Invoice', icon: 'fa-receipt', gradient: 'from-purple-500 to-pink-500', bg: 'bg-purple-50', text: 'text-purple-700' }
                ].map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickAction(action.name)}
                    className={`flex flex-col items-center justify-center p-4 rounded-2xl border border-transparent transition-all duration-300 group ${action.bg} hover:shadow-md hover:scale-[1.02]`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-md bg-gradient-to-br ${action.gradient} text-white group-hover:scale-110 transition-transform`}>
                      <i className={`fas ${action.icon} text-lg`}></i>
                    </div>
                    <span className={`text-sm font-bold ${action.text}`}>{action.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Recent Clients */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <i className="fas fa-users text-sm"></i>
                  </div>
                  <h3 className="font-bold text-gray-800">Recent Clients</h3>
                </div>
                <button onClick={() => navigate('/clients')} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors">
                  View All
                </button>
              </div>
              <div className="p-4 space-y-3">
                {recentClients.length > 0 ? (
                  recentClients.map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all duration-200 group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-sm shadow-md">
                          {client.client_name ? client.client_name.charAt(0).toUpperCase() : 'C'}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">{client.client_name}</h4>
                          <p className="text-xs text-gray-500 font-medium">{client.client_type || 'Client'}</p>
                        </div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {client.status || 'Active'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-400">
                      <i className="fas fa-user-slash"></i>
                    </div>
                    <p className="text-gray-500 text-sm">No recent clients found</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Revenue Overview Chart */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                    <i className="fas fa-chart-pie text-lg"></i>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">Revenue Overview</h3>
                    <p className="text-xs text-slate-500 font-medium">Monthly billing performance</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-gray-400">Total Growth</p>
                    <p className={`text-sm font-bold ${stats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      <i className={`fas fa-arrow-${stats.revenueGrowth >= 0 ? 'up' : 'down'} mr-1`}></i>
                      {Math.abs(stats.revenueGrowth)}%
                    </p>
                  </div>
                  <div className="text-right pl-4 border-l border-gray-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400">This Month</p>
                    <p className="text-lg font-bold text-gray-800">{formatCurrency(stats.thisMonthRevenue)}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 h-[320px] w-full bg-gradient-to-b from-white to-gray-50/50">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                      tickFormatter={(value) => `₹${value / 1000}k`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#7c3aed"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#7c3aed' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

          </div>

          {/* Sidebar Column (Right - 1/3 width) */}
          <div className="space-y-8">

            {/* Recent Requests */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <i className="fas fa-clipboard-list text-sm"></i>
                  </div>
                  <h3 className="font-bold text-gray-800">Recent Requests</h3>
                </div>
                <button onClick={() => navigate('/requests')} className="text-xs font-bold text-blue-600 hover:text-blue-800">View All</button>
              </div>
              <div className="divide-y divide-gray-50">
                {recentRequests.length > 0 ? (
                  recentRequests.map((req) => (
                    <div key={req.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${req.priority === 'High' ? 'bg-red-50 text-red-600 border border-red-100' :
                          req.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                          }`}>
                          {req.priority}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {new Date(req.created_at || req.requested_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-800 line-clamp-1 mb-1">{req.request_type}</h4>
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{req.description}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-600">
                            {(req.client_name || 'U').charAt(0)}
                          </div>
                          <span className="text-xs text-gray-500 font-medium truncate max-w-[80px]">{req.client_name}</span>
                        </div>
                        <span className={`text-[10px] font-bold ${req.status === 'Pending' ? 'text-amber-600' :
                          req.status === 'Resolved' ? 'text-green-600' : 'text-gray-500'
                          }`}>
                          {req.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 text-xs">No recent requests</div>
                )}
              </div>
            </motion.div>

            {/* Recent Documents */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/30">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <i className="fas fa-file-alt text-sm"></i>
                  </div>
                  <h3 className="font-bold text-gray-800">Recent Documents</h3>
                </div>
                <button onClick={() => navigate('/documents')} className="text-xs font-bold text-emerald-600 hover:text-emerald-800">View All</button>
              </div>
              <div className="p-4 space-y-3">
                {recentDocuments.length > 0 ? (
                  recentDocuments.map((doc) => (
                    <div key={doc.id} className="flex gap-3 group items-center p-2 rounded-xl hover:bg-emerald-50/50 transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm border border-emerald-100">
                        <i className="fas fa-file-pdf"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{doc.document_name}</p>
                        <p className="text-xs text-gray-500 truncate">{doc.clientName || 'Unknown Client'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded">{new Date(doc.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 text-xs">No recent documents</div>
                )}
              </div>
            </motion.div>



          </div>

        </div>
      </div>
    </div>
  );
}

export default EnhancedDashboard;