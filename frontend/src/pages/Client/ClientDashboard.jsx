import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BentoGrid, BentoCard } from '../../components/ui/BentoGrid';
import Button from '../../components/ui/Button';
import {
  FolderOpen,
  FileText,
  Receipt,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  Bell
} from 'lucide-react';

function ClientDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({
        documents: 0,
        returns: 0,
        invoices: 0,
        alerts: 0
    });

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            fetchStats(parsedUser);
        }
    }, []);

    const fetchStats = async (currentUser) => {
        try {
            // Fetch relevant data
            const [docsRes, returnsRes, invoicesRes, clientsRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/documents?user_id=${currentUser.id}`),
                axios.get(`http://localhost:5000/api/returns?user_id=${currentUser.id}`),
                axios.get('http://localhost:5000/api/invoices'),
                axios.get('http://localhost:5000/api/clients')
            ]);

            // Filter invoices for this client
            const myClient = clientsRes.data.find(c => String(c.user_id) === String(currentUser.id));

            const clientInvoices = myClient
                ? invoicesRes.data.filter(inv => inv.client === myClient.business_name || inv.client === myClient.client_name)
                : [];

            const pendingInvoices = clientInvoices.filter(inv => inv.status === 'Pending' || inv.status === 'Overdue').length;

            setStats({
                documents: docsRes.data.length,
                returns: returnsRes.data.length,
                invoices: clientInvoices.length,
                alerts: pendingInvoices
            });
        } catch (error) {
            console.error("Error fetching dashboard stats:", error);
        }
    };

    const handleNavigate = (path) => {
        navigate(path);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h1 className="text-2xl font-bold text-primary tracking-tight">Client Dashboard</h1>
                  <p className="text-secondary text-sm">Welcome back, {user?.name || 'Client'}. Here is your overview.</p>
               </div>
               <div className="flex items-center gap-2">
                  <span className="flex items-center gap-2 text-xs font-mono text-success bg-success/10 border border-success/20 px-3 py-1 rounded-full">
                     <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></span>
                     System Operational
                  </span>
               </div>
            </div>

            {/* Bento Grid Layout */}
            <BentoGrid className="grid-cols-1 md:grid-cols-4 auto-rows-[minmax(180px,auto)]">

               {/* Stats: Documents */}
               <BentoCard className="md:col-span-1 md:row-span-1 bg-surface border-l-4 border-l-blue-500" delay={0.1}>
                  <div className="flex justify-between items-start h-full flex-col">
                     <div className="flex items-center justify-between w-full">
                        <p className="text-xs font-mono text-secondary uppercase tracking-wider">My Documents</p>
                        <FolderOpen className="text-blue-500 opacity-80" size={20} />
                     </div>
                     <div>
                        <h3 className="text-3xl font-bold text-primary mb-1">{stats.documents}</h3>
                        <p className="text-xs text-secondary">Total Files Stored</p>
                     </div>
                  </div>
               </BentoCard>

               {/* Stats: Returns */}
               <BentoCard className="md:col-span-1 md:row-span-1 bg-surface border-l-4 border-l-purple-500" delay={0.2}>
                  <div className="flex justify-between items-start h-full flex-col">
                     <div className="flex items-center justify-between w-full">
                        <p className="text-xs font-mono text-secondary uppercase tracking-wider">Tax Returns</p>
                        <FileText className="text-purple-500 opacity-80" size={20} />
                     </div>
                     <div>
                        <h3 className="text-3xl font-bold text-primary mb-1">{stats.returns}</h3>
                        <p className="text-xs text-secondary">Filings Processed</p>
                     </div>
                  </div>
               </BentoCard>

               {/* Stats: Invoices */}
               <BentoCard className="md:col-span-1 md:row-span-1 bg-surface border-l-4 border-l-emerald-500" delay={0.3}>
                  <div className="flex justify-between items-start h-full flex-col">
                     <div className="flex items-center justify-between w-full">
                        <p className="text-xs font-mono text-secondary uppercase tracking-wider">Invoices</p>
                        <Receipt className="text-emerald-500 opacity-80" size={20} />
                     </div>
                     <div>
                        <h3 className="text-3xl font-bold text-primary mb-1">{stats.invoices}</h3>
                        <p className="text-xs text-secondary">Total Invoices</p>
                     </div>
                  </div>
               </BentoCard>

               {/* Alerts / Pending Actions */}
               <BentoCard className="md:col-span-1 md:row-span-1 bg-surface border-l-4 border-l-amber-500" delay={0.4}>
                  <div className="flex justify-between items-start h-full flex-col">
                     <div className="flex items-center justify-between w-full">
                        <p className="text-xs font-mono text-secondary uppercase tracking-wider">Alerts</p>
                        <Bell className="text-amber-500 opacity-80" size={20} />
                     </div>
                     <div>
                        <h3 className="text-3xl font-bold text-primary mb-1">{stats.alerts}</h3>
                        <p className="text-xs text-secondary">Pending Actions</p>
                     </div>
                  </div>
               </BentoCard>

               {/* Quick Actions Area */}
               <BentoCard className="md:col-span-2 md:row-span-1 flex flex-col justify-center" delay={0.5}>
                  <h3 className="text-lg font-bold text-primary mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                     <Button
                       variant="secondary"
                       onClick={() => handleNavigate('/client/requests')}
                       className="justify-between group hover:border-accent/50"
                     >
                        <span className="flex items-center gap-2"><PlusCircle size={16} className="text-accent" /> New Request</span>
                        <ArrowRight size={14} className="text-secondary group-hover:text-accent transition-colors" />
                     </Button>
                     <Button
                       variant="secondary"
                       onClick={() => handleNavigate('/client/documents')}
                       className="justify-between group hover:border-accent/50"
                     >
                        <span className="flex items-center gap-2"><FolderOpen size={16} className="text-accent" /> View Docs</span>
                        <ArrowRight size={14} className="text-secondary group-hover:text-accent transition-colors" />
                     </Button>
                  </div>
               </BentoCard>

               {/* Info / Promo Card */}
               <BentoCard className="md:col-span-2 md:row-span-1 relative overflow-hidden group" delay={0.6}>
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 pointer-events-none"></div>
                  <div className="relative z-10 flex flex-col justify-center h-full">
                     <div className="flex items-center gap-3 mb-2">
                        <ShieldCheck className="text-accent" size={24} />
                        <h3 className="text-lg font-bold text-primary">Secure & Compliant</h3>
                     </div>
                     <p className="text-sm text-secondary leading-relaxed max-w-md">
                        Your financial data is protected with enterprise-grade security.
                        We ensure full compliance with the latest regulations for your peace of mind.
                     </p>
                  </div>
                  {/* Decorative background element */}
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-accent/5 rounded-full blur-3xl group-hover:bg-accent/10 transition-colors duration-500"></div>
               </BentoCard>

            </BentoGrid>
        </div>
    );
}

export default ClientDashboard;
