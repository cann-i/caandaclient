import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

// --- Animated Logout Component ---
// Reusable component for both Sidebar and Profile Dropdown
const AnimatedLogoutButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="group w-full flex items-center justify-between px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-all duration-300 font-medium overflow-hidden border border-transparent hover:border-red-100"
    >
      {/* Text moves slightly left on hover */}
      <span className="transform transition-transform duration-300 group-hover:-translate-x-1">
        Log Out
      </span>

      {/* Animation Container */}
      <div className="relative flex items-center justify-center w-8 h-8">
        {/* Walking Figure: Starts transparent and left, walks in on hover */}
        <i className="fas fa-walking absolute text-lg opacity-0 transform -translate-x-4 transition-all duration-500 ease-in-out group-hover:opacity-100 group-hover:translate-x-0 z-10"></i>

        {/* Door: Moves slightly right on hover to 'catch' the figure */}
        <i className="fas fa-door-open absolute text-xl transform transition-all duration-300 group-hover:translate-x-2 z-0"></i>
      </div>
    </button>
  );
};

function ClientLayout({ children, onLogout, showToast }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Fetch fresh profile data
    const fetchUserProfile = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const response = await fetch('http://localhost:5000/api/auth/profile', {
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
          console.warn("Session invalid, logging out...");
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

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`http://localhost:5000/api/notifications/${user.id}`);
      const data = await response.json();
      setNotifications(data);

      const unreadResponse = await fetch(`http://localhost:5000/api/notifications/${user.id}/unread`);
      const unreadData = await unreadResponse.json();
      setUnreadCount(unreadData.unread_count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user?.id]);

  // Fetch notifications on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();

      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id, fetchNotifications]);

  // Mark notification as read and navigate
  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read
      await fetch(`http://localhost:5000/api/notifications/${notification.id}/read`, {
        method: 'PUT'
      });

      // Navigate based on reference_type
      if (notification.reference_type === 'document_request') {
        navigate('/client/requests');
      } else if (notification.reference_type === 'returns') {
        navigate('/client/returns');
      } else if (notification.reference_type === 'invoices') {
        navigate('/client/invoices');
      } else if (notification.reference_type === 'documents') {
        navigate('/client/documents');
      }

      setShowNotifications(false);
      fetchNotifications(); // Refresh notifications
    } catch (error) {
      console.error('Error marking notification as read:', error);
      showToast('Error updating notification', 'error');
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    try {
      await fetch(`http://localhost:5000/api/notifications/mark-all-read/${user.id}`, {
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

  const isActive = (path) => location.pathname === path;

  const menuItems = [
    { path: '/client/dashboard', icon: 'fas fa-th-large', label: 'Dashboard' },
    { path: '/client/documents', icon: 'fas fa-folder', label: 'My Documents' },
    { path: '/client/requests', icon: 'fas fa-clipboard-list', label: 'My Requests' },
    { path: '/client/returns', icon: 'fas fa-file-invoice', label: 'My Returns' },
    { path: '/client/invoices', icon: 'fas fa-receipt', label: 'My Invoices' }
  ];

  // Helper to get icon and color based on notification type
  const getNotificationStyle = (type) => {
    const styles = {
      request: { icon: 'fas fa-clipboard-list', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
      return: { icon: 'fas fa-file-invoice', iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
      invoice: { icon: 'fas fa-receipt', iconBg: 'bg-green-100', iconColor: 'text-green-600' },
      document: { icon: 'fas fa-file-alt', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
      reply: { icon: 'fas fa-reply', iconBg: 'bg-teal-100', iconColor: 'text-teal-600' },
      default: { icon: 'fas fa-bell', iconBg: 'bg-gray-100', iconColor: 'text-gray-600' }
    };
    return styles[type] || styles.default;
  };

  // Helper to format time ago
  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <Link to="/client/dashboard" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <i className="fas fa-user text-xl text-white"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Client Portal</h1>
              <p className="text-xs text-gray-500">DocuCA System</p>
            </div>
          </Link>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${isActive(item.path)
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
                }`}
            >
              <i className={item.icon}></i>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* --- Sidebar Logout: UPDATED --- */}
        <div className="p-4 border-t border-gray-200">
          <AnimatedLogoutButton onClick={onLogout} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-800">Welcome to Client Portal</h2>
          </div>
          <div className="flex items-center space-x-4 ml-6">
            <div className="relative">
              <button
                className="relative p-2 text-gray-600 hover:bg-purple-50 rounded-lg transition"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <i className="fas fa-bell text-xl"></i>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowNotifications(false)}
                  ></div>

                  {/* Dropdown Panel */}
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-20 max-h-[600px] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">Notifications</h3>
                        <p className="text-xs text-gray-600">{unreadCount} unread notifications</p>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    {/* Notifications List */}
                    <div className="overflow-y-auto flex-1">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <i className="fas fa-bell-slash text-4xl text-gray-300 mb-3"></i>
                          <p className="text-gray-500">No notifications</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {notifications.map((notification) => {
                            const style = getNotificationStyle(notification.type);
                            return (
                              <div
                                key={notification.id}
                                className={`p-4 hover:bg-gray-50 transition cursor-pointer ${!notification.is_read ? 'bg-purple-50' : ''}`}
                                onClick={() => handleNotificationClick(notification)}
                              >
                                <div className="flex space-x-3">
                                  <div className={`w-10 h-10 ${style.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                    <i className={`${style.icon} ${style.iconColor}`}></i>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-1">
                                      <p className="font-semibold text-gray-800 text-sm">
                                        {notification.title}
                                      </p>
                                      {!notification.is_read && (
                                        <span className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0 mt-1"></span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-600 mb-1 line-clamp-2">
                                      {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      <i className="far fa-clock mr-1"></i>
                                      {formatTimeAgo(notification.created_at)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>


                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <button
                className="w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold shadow-md hover:shadow-lg transition transform hover:scale-105 active:scale-95 border-2 border-white ring-2 ring-purple-100"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : <i className="fas fa-user"></i>}
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowProfileMenu(false)}
                  ></div>

                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-20 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                      <p className="text-sm text-gray-500 font-medium">Signed in as</p>
                      <p className="text-gray-800 font-bold truncate">{user?.email || 'client@example.com'}</p>
                    </div>

                    <div className="p-2">
                      <Link
                        to="/client/profile"
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 rounded-lg transition flex items-center gap-3"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <i className="fas fa-user w-5"></i>
                        My Profile
                      </Link>
                    </div>

                    {/* --- Profile Dropdown Logout: UPDATED --- */}
                    <div className="border-t border-gray-100 p-2">
                      <AnimatedLogoutButton onClick={() => {
                        setShowProfileMenu(false);
                        onLogout();
                      }} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

export default ClientLayout;