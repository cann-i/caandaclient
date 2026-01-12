import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BentoGrid, BentoCard } from '../../components/ui/BentoGrid';
import Button from '../../components/ui/Button';
import {
  Users,
  FileText,
  Clock,
  TrendingUp,
  Plus,
  Upload,
  FilePlus,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal
} from 'lucide-react';

const API_BASE_URL = API_BASE_URL;

function Dashboard({ showToast }) {
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

    if (invoices && invoices.length > 0) {
        invoices.forEach(inv => {
          // Use invoice_date (mapped to date) or created_at. Ensure it's not null.
          const rawDate = inv.date || inv.createdAt;
          if (!rawDate) return;

          const date = new Date(rawDate);

          if (!isNaN(date.getTime())) {
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            // Only aggregate for the months we are displaying (last 6 months)
            if (months[key]) {
              const amount = parseFloat(inv.totalAmount) || 0;
              const paid = parseFloat(inv.paidAmount) || 0;
              const pending = parseFloat(inv.balanceAmount) || (amount - paid);

              months[key].revenue += amount;
              months[key].paid += paid;
              months[key].pending += pending;
            }
          }
        });
    }

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
        <div className="bg-surface border border-border p-3 rounded-lg shadow-xl backdrop-blur-md">
          <p className="font-mono text-secondary mb-2 text-xs">{label}</p>
          <div className="space-y-1">
            <p className="text-sm font-bold text-primary">
              <span className="text-secondary font-normal mr-2">Total:</span>
              {formatCurrency(data.revenue)}
            </p>
            <div className="w-full h-px bg-border my-1"></div>
            <p className="text-xs text-success flex justify-between items-center w-32">
              <span>Paid:</span>
              <span className="font-mono">{formatCurrency(data.paid)}</span>
            </p>
            <p className="text-xs text-warning flex justify-between items-center w-32">
              <span>Pending:</span>
              <span className="font-mono">{formatCurrency(data.pending)}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">Dashboard Overview</h1>
          <p className="text-secondary text-sm">Welcome back, here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-xs font-mono text-secondary bg-surface px-2 py-1 rounded border border-border">
             {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
           </span>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        {/* Stats Row */}
        <BentoCard className="md:col-span-1 border-l-4 border-l-blue-500" delay={0.1}>
           <div className="flex justify-between items-start">
             <div>
               <p className="text-secondary text-xs font-mono uppercase">Total Clients</p>
               <h3 className="text-2xl font-bold text-primary mt-1">{stats.totalClients}</h3>
             </div>
             <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Users size={18} /></div>
           </div>
           <div className="mt-4 flex items-center text-xs text-success">
             <TrendingUp size={12} className="mr-1" /> <span>+12%</span> <span className="text-secondary ml-1">vs last month</span>
           </div>
        </BentoCard>

        <BentoCard className="md:col-span-1 border-l-4 border-l-emerald-500" delay={0.15}>
           <div className="flex justify-between items-start">
             <div>
               <p className="text-secondary text-xs font-mono uppercase">Total Docs</p>
               <h3 className="text-2xl font-bold text-primary mt-1">{stats.totalDocuments}</h3>
             </div>
             <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><FileText size={18} /></div>
           </div>
           <div className="mt-4 flex items-center text-xs text-success">
             <TrendingUp size={12} className="mr-1" /> <span>+5%</span> <span className="text-secondary ml-1">vs last month</span>
           </div>
        </BentoCard>

        <BentoCard className="md:col-span-1 border-l-4 border-l-orange-500" delay={0.2}>
           <div className="flex justify-between items-start">
             <div>
               <p className="text-secondary text-xs font-mono uppercase">Pending Returns</p>
               <h3 className="text-2xl font-bold text-primary mt-1">{stats.pendingReturns}</h3>
             </div>
             <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500"><Clock size={18} /></div>
           </div>
           <div className="mt-4 flex items-center text-xs text-warning">
             <span>Action Needed</span>
           </div>
        </BentoCard>

        <BentoCard className="md:col-span-1 border-l-4 border-l-purple-500" delay={0.25}>
           <div className="flex justify-between items-start">
             <div>
               <p className="text-secondary text-xs font-mono uppercase">Total Revenue</p>
               <h3 className="text-2xl font-bold text-primary mt-1">{formatCurrency(stats.totalRevenue)}</h3>
             </div>
             <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><Receipt size={18} /></div>
           </div>
           <div className={`mt-4 flex items-center text-xs ${stats.revenueGrowth >= 0 ? 'text-success' : 'text-error'}`}>
             {stats.revenueGrowth >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingUp size={12} className="mr-1 rotate-180" />}
             <span>{Math.abs(stats.revenueGrowth)}%</span> <span className="text-secondary ml-1">vs last month</span>
           </div>
        </BentoCard>

        {/* Main Content Area */}
        <BentoCard className="md:col-span-3 md:row-span-2 flex flex-col" delay={0.3}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-primary">Revenue Analytics</h3>
              <p className="text-xs text-secondary font-mono">Monthly billing performance</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="text-right">
                  <p className="text-[10px] text-secondary uppercase">This Month</p>
                  <p className="text-sm font-bold text-primary">{formatCurrency(stats.thisMonthRevenue)}</p>
               </div>
            </div>
          </div>

          <div className="flex-1 w-full" style={{ minHeight: '300px', height: '300px' }}>
            {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2A2A2A" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#A0A0A0', fontSize: 10, fontFamily: 'monospace' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#A0A0A0', fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={(value) => `₹${value / 1000}k`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3B82F6', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  activeDot={{ r: 4, strokeWidth: 0, fill: '#60A5FA' }}
                />
              </AreaChart>
            </ResponsiveContainer>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-secondary">
                    <p>No revenue data available</p>
                </div>
            )}
          </div>
        </BentoCard>

        {/* Quick Actions */}
        <BentoCard className="md:col-span-1 md:row-span-2" delay={0.35}>
          <h3 className="text-lg font-bold text-primary mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-3">
             <Button variant="secondary" onClick={() => handleQuickAction('New Client')} className="w-full justify-start gap-3">
               <Plus size={16} className="text-accent" /> New Client
             </Button>
             <Button variant="secondary" onClick={() => handleQuickAction('Upload Doc')} className="w-full justify-start gap-3">
               <Upload size={16} className="text-accent" /> Upload Doc
             </Button>
             <Button variant="secondary" onClick={() => handleQuickAction('New Return')} className="w-full justify-start gap-3">
               <FilePlus size={16} className="text-accent" /> New Return
             </Button>
             <Button variant="secondary" onClick={() => handleQuickAction('New Invoice')} className="w-full justify-start gap-3">
               <Receipt size={16} className="text-accent" /> New Invoice
             </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
             <h4 className="text-xs font-mono text-secondary uppercase mb-3">Recent Activity</h4>
             <div className="space-y-3">
               {recentRequests.slice(0, 3).map((req, i) => (
                 <div key={i} className="flex items-center gap-3 text-sm">
                    <div className={`w-2 h-2 rounded-full ${req.status === 'Resolved' ? 'bg-success' : 'bg-warning'}`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-primary truncate text-xs">{req.request_type}</p>
                      <p className="text-secondary text-[10px] truncate">{req.client_name}</p>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        </BentoCard>

        {/* Recent Clients */}
        <BentoCard className="md:col-span-2" delay={0.4}>
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-bold text-primary">Recent Clients</h3>
             <Button variant="ghost" size="sm" onClick={() => navigate('/clients')} className="text-xs h-8">View All</Button>
          </div>
          <div className="space-y-2">
            {recentClients.length > 0 ? (
              recentClients.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-2 hover:bg-surface-highlight rounded-lg transition-colors group cursor-pointer">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold border border-accent/20">
                         {client.client_name ? client.client_name.charAt(0).toUpperCase() : 'C'}
                      </div>
                      <div>
                         <p className="text-sm font-medium text-primary group-hover:text-accent transition-colors">{client.client_name}</p>
                         <p className="text-[10px] text-secondary font-mono">{client.client_type || 'Client'}</p>
                      </div>
                   </div>
                   <div className={`text-[10px] px-2 py-0.5 rounded border ${client.status === 'active' ? 'bg-success/10 text-success border-success/20' : 'bg-secondary/10 text-secondary border-border'}`}>
                      {client.status || 'Active'}
                   </div>
                </div>
              ))
            ) : (
              <p className="text-secondary text-sm text-center py-4">No recent clients</p>
            )}
          </div>
        </BentoCard>

        {/* Recent Documents */}
        <BentoCard className="md:col-span-2" delay={0.45}>
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-lg font-bold text-primary">Recent Documents</h3>
             <Button variant="ghost" size="sm" onClick={() => navigate('/documents')} className="text-xs h-8">View All</Button>
          </div>
          <div className="space-y-2">
             {recentDocuments.length > 0 ? (
               recentDocuments.map((doc) => (
                 <div key={doc.id} className="flex items-center justify-between p-2 hover:bg-surface-highlight rounded-lg transition-colors group cursor-pointer">
                    <div className="flex items-center gap-3 min-w-0">
                       <div className="w-8 h-8 rounded bg-surface border border-border flex items-center justify-center text-secondary group-hover:text-primary group-hover:border-accent/50 transition-colors">
                          <FileText size={14} />
                       </div>
                       <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-primary truncate">{doc.document_name}</p>
                          <p className="text-[10px] text-secondary truncate">{doc.clientName || 'Unknown'}</p>
                       </div>
                    </div>
                    <span className="text-[10px] text-secondary font-mono whitespace-nowrap ml-2">
                       {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                 </div>
               ))
             ) : (
               <p className="text-secondary text-sm text-center py-4">No recent documents</p>
             )}
          </div>
        </BentoCard>

      </div>
    </div>
  );
}

export default Dashboard;
