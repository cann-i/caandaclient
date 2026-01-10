import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:5000/api';

function LoginPage({ onLogin, showToast }) {
  const [selectedRole, setSelectedRole] = useState(() => {
    return localStorage.getItem('lastLoginType') || 'ca';
  }); // 'ca' or 'client'

  // CA State
  const [caEmail, setCaEmail] = useState('');
  const [caPassword, setCaPassword] = useState('');
  const [showCaPassword, setShowCaPassword] = useState(false);

  // Client State
  const [clientEmail, setClientEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  // --- CA HANDLERS ---
  const handleCaLogin = async (e) => {
    e?.preventDefault();
    if (!caEmail || !caPassword) {
      showToast('Please enter email and password', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/ca-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: caEmail, password: caPassword })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Login failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin('ca');
      showToast('Login successful!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- CLIENT HANDLERS ---
  const handleClientLogin = async (e) => {
    e?.preventDefault();
    if (!clientEmail || !clientPassword) {
      showToast('Please enter email and password', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/client-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clientEmail, password: clientPassword })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Login failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin('client');
      showToast('Login successful!', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center font-sans bg-gray-900">

      {/* Animated Background Layers */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-blue-900 to-slate-900"></div>

        {/* Animated Mesh Gradient Overlay */}
        <div className="absolute inset-0 opacity-30 animated-mesh-bg blur-3xl"></div>

        {/* Floating 3D Shapes */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 shape-blob animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 shape-blob-2 animate-float-slow"></div>

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-150 contrast-150 mix-blend-overlay"></div>
      </div>

      <div className="max-w-5xl w-full relative z-10 m-4 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[600px] login-glass">

        {/* Left Side - Hero/Branding */}
        <div className="w-full md:w-1/2 p-12 text-white flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-blue-600/90 to-indigo-800/90 backdrop-blur-md">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <i className="fas fa-file-invoice-dollar text-[20rem] absolute -bottom-20 -right-20 transform rotate-12"></i>
            <div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full blur-3xl opacity-20"></div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center shadow-lg boarder border-white/20">
                <i className="fas fa-file-invoice text-2xl"></i>
              </div>
              <span className="text-2xl font-bold tracking-tight">DocuCA</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight drop-shadow-lg">
              Manage Your <br />
              <span className="text-blue-200">Financials</span> <br />
              With Confidence
            </h1>
            <p className="text-blue-100 text-lg leading-relaxed max-w-sm drop-shadow-md">
              Access your documents, track returns, and manage invoices in one secure, unified portal.
            </p>
          </div>

          <div className="relative z-10 mt-12">
            <div className="flex items-center gap-4 text-sm text-blue-200">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-400 border-2 border-indigo-800 shadow-md"></div>
                <div className="w-8 h-8 rounded-full bg-blue-300 border-2 border-indigo-800 shadow-md"></div>
                <div className="w-8 h-8 rounded-full bg-blue-200 border-2 border-indigo-800 flex items-center justify-center text-indigo-800 font-bold text-xs shadow-md">+2k</div>
              </div>
              <span>Trusted by 2000+ Businesses</span>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">

          <div className="text-center md:text-left mb-8">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 tracking-tight">Welcome Back</h2>
            <p className="text-gray-500 dark:text-gray-400">Please choose your role to continue</p>
          </div>

          {/* Role Switcher */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl mb-8 border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => { setSelectedRole('ca'); }}
              className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${selectedRole === 'ca' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              <i className="fas fa-user-tie"></i> CA / Admin
            </button>
            <button
              onClick={() => setSelectedRole('client')}
              className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${selectedRole === 'client' ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              <i className="fas fa-user"></i> Client
            </button>
          </div>

          <div className="transition-all duration-300 flex-1 relative">
            {selectedRole === 'ca' ? (
              // CA FORM
              <form onSubmit={handleCaLogin} className="space-y-5 animate-fade-in-up">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                  <div className="relative group">
                    <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
                    <input
                      type="email"
                      value={caEmail}
                      onChange={(e) => setCaEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all outline-none bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-900 dark:text-white"
                      placeholder="admin@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Password</label>
                  <div className="relative group">
                    <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
                    <input
                      type={showCaPassword ? 'text' : 'password'}
                      value={caPassword}
                      onChange={(e) => setCaPassword(e.target.value)}
                      className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all outline-none bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-900 dark:text-white"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCaPassword(!showCaPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none bg-transparent border-none p-0 cursor-pointer"
                    >
                      <i className={`fas ${showCaPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center text-gray-500 dark:text-gray-400 cursor-pointer">
                    <input type="checkbox" className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    Remember me
                  </label>
                  <button type="button" className="text-blue-600 hover:underline dark:text-blue-400 bg-transparent border-none p-0 cursor-pointer">Forgot password?</button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all transform active:scale-[0.98] shadow-lg shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-sign-in-alt"></i> Login</>}
                </button>
              </form>
            ) : (
              // CLIENT FORM
              <form onSubmit={handleClientLogin} className="space-y-5 animate-fade-in-up">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
                  <div className="relative group">
                    <i className="fas fa-envelope absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all outline-none bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-900 dark:text-white"
                      placeholder="client@company.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Password</label>
                  <div className="relative group">
                    <i className="fas fa-lock absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={clientPassword}
                      onChange={(e) => setClientPassword(e.target.value)}
                      className="w-full pl-11 pr-12 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all outline-none bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-900 dark:text-white"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none bg-transparent border-none p-0 cursor-pointer"
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center text-gray-500 dark:text-gray-400 cursor-pointer">
                    <input type="checkbox" className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    Remember me
                  </label>
                  <button type="button" className="text-blue-600 hover:underline dark:text-blue-400 bg-transparent border-none p-0 cursor-pointer">Forgot password?</button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-all transform active:scale-[0.98] shadow-lg shadow-blue-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-sign-in-alt"></i> Login</>}
                </button>
              </form>
            )}
          </div>

          {/* Demo Credentials Hint */}
          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-center text-gray-400 dark:text-gray-500">
              <span className="font-semibold block mb-1 uppercase tracking-wider text-[10px] text-gray-300 dark:text-gray-600">Development Mode</span>
              Demo: CA (OTP: 123456) | Client (Pass: 123456)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
