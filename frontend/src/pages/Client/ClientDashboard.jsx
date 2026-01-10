import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function ClientDashboard() {
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
            // Allow loose equality for ID matching to handle string/number differences
            const myClient = clientsRes.data.find(c => String(c.user_id) === String(currentUser.id));

            const clientInvoices = myClient
                ? invoicesRes.data.filter(inv => inv.client === myClient.business_name || inv.client === myClient.client_name)
                : [];

            const pendingInvoices = clientInvoices.filter(inv => inv.status === 'Pending' || inv.status === 'Overdue').length;

            setStats({
                documents: docsRes.data.length,
                returns: returnsRes.data.length,
                invoices: clientInvoices.length,
                alerts: pendingInvoices // Using pending invoices as alerts
            });
        } catch (error) {
            console.error("Error fetching dashboard stats:", error);
        }
    };

    const StatsCard = ({ icon, color, title, value, gradient }) => (
        <div className={`p-6 rounded-xl shadow-md border-0 bg-gradient-to-br ${gradient} text-white hover:shadow-lg hover:scale-[1.02] transition-all duration-300`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-white/90 text-sm font-medium uppercase tracking-wide">{title}</p>
                    <h3 className="text-3xl font-bold mt-2">{value}</h3>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <i className={`${icon} text-xl text-white`}></i>
                </div>
            </div>
        </div>
    );

    const QuickAction = ({ icon, title, desc, to, color }) => (
        <Link
            to={to}
            className="group flex items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-300 relative overflow-hidden"
        >
            <div className={`absolute inset-0 bg-gradient-to-r ${color} opacity-0 group-hover:opacity-5 transition-opacity`}></div>

            <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${color} text-white flex items-center justify-center mr-3 group-hover:scale-110 transition-transform relative flex-shrink-0`}>
                <i className={`${icon} text-base`}></i>
            </div>

            <div className="flex-1 min-w-0 relative">
                <h3 className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">{title}</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{desc}</p>
            </div>

            <i className="fas fa-arrow-right text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all ml-2 flex-shrink-0"></i>
        </Link>
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Welcome Section - More compact */}
            <div className="relative bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl shadow-lg p-6 md:p-7 text-white overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-10 rounded-full blur-3xl -mr-12 -mt-12"></div>
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl -ml-12 -mb-12"></div>

                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold mb-1">
                            Welcome back, {user?.name || 'Client'}! 👋
                        </h1>
                        <p className="text-indigo-100 text-sm">Here's what's happening with your account today</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-xs font-medium border border-white/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-2 animate-pulse"></span>
                            Active
                        </span>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid - With Background Container */}


            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatsCard
                    title="Documents"
                    value={stats.documents}
                    icon="fas fa-folder-open"
                    color="blue"
                    gradient="from-blue-500 to-cyan-500"
                />
                <StatsCard
                    title="Tax Returns"
                    value={stats.returns}
                    icon="fas fa-file-invoice"
                    color="purple"
                    gradient="from-purple-500 to-indigo-500"
                />
                <StatsCard
                    title="Invoices"
                    value={stats.invoices}
                    icon="fas fa-receipt"
                    color="pink"
                    gradient="from-pink-500 to-rose-500"
                />
            </div>


            {/* Quick Actions - Horizontal Layout */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-800">Quick Actions</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <QuickAction
                        to="/client/documents"
                        title="View Documents"
                        desc="Access your stored files"
                        icon="fas fa-folder-open"
                        color="from-blue-500 to-cyan-500"
                    />
                    <QuickAction
                        to="/client/requests"
                        title="New Request"
                        desc="Submit a query or request"
                        icon="fas fa-plus-circle"
                        color="from-purple-500 to-indigo-500"
                    />
                    <QuickAction
                        to="/client/returns"
                        title="View Returns"
                        desc="Check your tax return status"
                        icon="fas fa-history"
                        color="from-green-500 to-emerald-500"
                    />
                    <QuickAction
                        to="/client/invoices"
                        title="View Invoices"
                        desc="Manage payments & billing"
                        icon="fas fa-file-invoice-dollar"
                        color="from-pink-500 to-rose-500"
                    />
                </div>
            </div>


        </div>
    );
}

export default ClientDashboard;