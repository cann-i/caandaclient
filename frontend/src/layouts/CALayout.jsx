import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  FileText,
  UploadCloud,
  FileInput,
  BarChart,
  Receipt,
  ClipboardList,
  ChevronRight,
  LogOut,
  Bell,
  User,
  Menu,
  X,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { API_BASE_URL } from '../config';

const SidebarItem = ({ item, isActive, onClick, location }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (item.children) {
      const isChildActive = item.children.some(child => child.path === location.pathname);
      if (isChildActive) setIsOpen(true);
    }
  }, [item, location.pathname]);

  if (item.children) {
    const isChildActive = item.children.some(child => child.path === location.pathname);

    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 group ${
            isChildActive ? 'bg-surface-highlight text-accent' : 'text-secondary hover:text-primary hover:bg-surface-highlight'
          }`}
        >
          <div className="flex items-center gap-3">
             <item.icon size={18} className={isChildActive ? 'text-accent' : 'text-secondary group-hover:text-primary'} />
             <span className="text-sm font-medium">{item.label}</span>
          </div>
          <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pl-9 space-y-1 overflow-hidden"
            >
              {item.children.map(child => (
                <Link
                  key={child.path}
                  to={child.path}
                  className={`block px-3 py-2 rounded-md text-xs transition-colors duration-200 ${
                    location.pathname === child.path
                      ? 'text-accent font-medium bg-accent/10 border border-accent/20'
                      : 'text-secondary hover:text-primary hover:bg-surface-highlight'
                  }`}
                >
                  {child.label}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <Link
      to={item.path}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
        isActive
          ? 'bg-accent/10 text-accent border border-accent/20'
          : 'text-secondary hover:text-primary hover:bg-surface-highlight border border-transparent'
      }`}
    >
      <item.icon size={18} className={isActive ? 'text-accent' : 'text-secondary group-hover:text-primary'} />
      <span className="text-sm font-medium">{item.label}</span>
      {isActive && <motion.div layoutId="activeIndicator" className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />}
    </Link>
  );
};

function CALayout({ children, onLogout, showToast }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    const fetchUserProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const profileData = await response.json();
          setUser(prev => ({ ...prev, ...profileData }));
          const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({ ...currentUser, ...profileData }));
        } else if (response.status === 401 || response.status === 404) {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          if (onLogout) onLogout();
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, [onLogout]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${API_BASE_URL}/notifications/${user.id}`);
      const data = await response.json();
      setNotifications(data);

      const unreadResponse = await fetch(`${API_BASE_URL}/notifications/${user.id}/unread`);
      const unreadData = await unreadResponse.json();
      setUnreadCount(unreadData.unread_count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  const handleNotificationClick = async (notification) => {
    try {
      await fetch(`${API_BASE_URL}/notifications/${notification.id}/read`, {
        method: 'PUT'
      });

      if (notification.reference_type === 'document_request') {
        navigate('/requests/client', { state: { requestId: notification.reference_id, openReply: true } });
      } else if (notification.reference_type === 'returns') {
        navigate('/returns');
      } else if (notification.reference_type === 'invoices') {
        navigate('/invoices');
      } else if (notification.reference_type === 'documents') {
        navigate('/documents');
      }

      setShowNotifications(false);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      showToast('Error updating notification', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    try {
      await fetch(`${API_BASE_URL}/notifications/mark-all-read/${user.id}`, {
        method: 'PUT'
      });

      showToast('All notifications marked as read', 'success');
      setShowNotifications(false);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking all as read:', error);
      showToast('Error updating notifications', 'error');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'CA';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/clients', icon: Users, label: 'Clients' },
    { path: '/documents', icon: FileText, label: 'Documents' },
    { path: '/upload-docs', icon: UploadCloud, label: 'Upload Docs' },
    { path: '/returns', icon: FileInput, label: 'Returns' },
    {
      id: 'reports',
      icon: BarChart,
      label: 'Reports',
      children: [
        { path: '/reports/client', label: 'Client Report' },
        { path: '/reports/document', label: 'Document Report' },
        { path: '/reports/payment', label: 'Payment Report' },
        { path: '/reports/request', label: 'Request Report' }
      ]
    },
    { path: '/invoices', icon: Receipt, label: 'Invoices' },
    { path: '/requests/client', icon: ClipboardList, label: 'Requests' },
  ];

  return (
    <div className="flex h-screen bg-background text-primary font-sans overflow-hidden">

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-surface border-r border-border h-full relative z-20">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center border border-accent/20">
            <ShieldCheck size={18} className="text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-primary tracking-tight">DocuCA</h1>
            <p className="text-[10px] text-secondary font-mono">FINANCIAL SUITE</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
          {menuItems.map((item) => (
             <SidebarItem key={item.path || item.id} item={item} isActive={item.path ? isActive(item.path) : false} location={location} />
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-error hover:bg-error/10 transition-colors duration-200 group"
          >
            <LogOut size={18} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden">

        {/* Background Grid */}
        <div className="absolute inset-0 z-0 pointer-events-none bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        {/* Header */}
        <header className="h-16 border-b border-border bg-surface/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
           <div className="flex items-center gap-4">
              <button
                className="md:hidden text-secondary hover:text-primary"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <Menu size={20} />
              </button>
              <h2 className="text-sm font-mono text-secondary uppercase tracking-widest hidden sm:block">
                {location.pathname.split('/')[1] || 'Dashboard'}
              </h2>
           </div>

           <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-secondary hover:text-primary hover:bg-surface-highlight rounded-lg transition-colors"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full ring-2 ring-surface"></span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowNotifications(false)}></div>
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-xl shadow-2xl z-30 overflow-hidden"
                      >
                         <div className="p-3 border-b border-border flex items-center justify-between bg-surface-highlight/30">
                            <h3 className="text-sm font-bold text-primary">Notifications</h3>
                            {unreadCount > 0 && (
                              <button onClick={handleMarkAllAsRead} className="text-xs text-accent hover:underline">
                                Mark read
                              </button>
                            )}
                         </div>
                         <div className="max-h-[400px] overflow-y-auto">
                           {notifications.length === 0 ? (
                             <div className="p-6 text-center text-secondary text-sm">No new notifications</div>
                           ) : (
                             notifications.map(notif => (
                               <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-3 border-b border-border/50 hover:bg-surface-highlight transition-colors cursor-pointer ${!notif.is_read ? 'bg-accent/5' : ''}`}
                               >
                                 <div className="flex gap-3">
                                   <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" style={{ opacity: notif.is_read ? 0 : 1 }}></div>
                                   <div>
                                     <p className="text-sm font-medium text-primary line-clamp-1">{notif.title}</p>
                                     <p className="text-xs text-secondary line-clamp-2 mt-0.5">{notif.message}</p>
                                     <p className="text-[10px] text-secondary/70 mt-1 font-mono">{new Date(notif.created_at).toLocaleDateString()}</p>
                                   </div>
                                 </div>
                               </div>
                             ))
                           )}
                         </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-surface-highlight border border-transparent hover:border-border transition-all"
                >
                   <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-primary leading-none">{user?.name}</p>
                      <p className="text-[10px] text-secondary leading-none mt-1">CA / Admin</p>
                   </div>
                   <div className="w-8 h-8 bg-surface-highlight rounded-full flex items-center justify-center text-xs font-bold text-accent border border-border">
                      {getInitials(user?.name)}
                   </div>
                </button>

                <AnimatePresence>
                  {showProfileMenu && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowProfileMenu(false)}></div>
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-xl shadow-2xl z-30 overflow-hidden"
                      >
                        <div className="p-3 border-b border-border bg-surface-highlight/30">
                          <p className="text-sm font-bold text-primary">{user?.name}</p>
                          <p className="text-xs text-secondary truncate">{user?.email}</p>
                        </div>
                        <div className="p-1">
                          <Link
                            to="/profile"
                            className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-surface-highlight rounded-lg transition-colors"
                            onClick={() => setShowProfileMenu(false)}
                          >
                            <User size={16} /> Profile
                          </Link>
                        </div>
                        <div className="p-1 border-t border-border mt-1">
                           <button
                             onClick={onLogout}
                             className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error/10 rounded-lg transition-colors text-left"
                           >
                             <LogOut size={16} /> Log Out
                           </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
           </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 relative z-0">
          {children}
        </main>

      </div>

       {/* Mobile Sidebar Overlay */}
       <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 w-64 bg-surface border-r border-border z-50 md:hidden flex flex-col"
            >
               <div className="p-4 border-b border-border flex items-center justify-between">
                  <span className="font-bold text-lg">Menu</span>
                  <button onClick={() => setIsMobileMenuOpen(false)}><X size={20} /></button>
               </div>
               <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                  {menuItems.map((item) => (
                    <div key={item.path || item.id} onClick={() => setIsMobileMenuOpen(false)}>
                       <SidebarItem item={item} isActive={item.path ? isActive(item.path) : false} location={location} />
                    </div>
                  ))}
               </nav>
               <div className="p-4 border-t border-border">
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-error hover:bg-error/10 transition-colors duration-200"
                  >
                    <LogOut size={18} />
                    <span className="text-sm font-medium">Log Out</span>
                  </button>
               </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CALayout;
