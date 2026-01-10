import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../components/ui/Button';
import { User, Lock, Mail, Eye, EyeOff, Briefcase, ChevronRight, Loader2, ShieldCheck } from 'lucide-react';

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

  const currentEmail = selectedRole === 'ca' ? caEmail : clientEmail;
  const currentPassword = selectedRole === 'ca' ? caPassword : clientPassword;
  const currentSetEmail = selectedRole === 'ca' ? setCaEmail : setClientEmail;
  const currentSetPassword = selectedRole === 'ca' ? setCaPassword : setClientPassword;
  const currentShowPassword = selectedRole === 'ca' ? showCaPassword : showPassword;
  const currentSetShowPassword = selectedRole === 'ca' ? setShowCaPassword : setShowPassword;
  const currentSubmitHandler = selectedRole === 'ca' ? handleCaLogin : handleClientLogin;

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center font-sans bg-background text-primary">

      {/* Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-surface-highlight/20 via-background to-background"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        {/* Animated Shapes */}
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-20 -right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            rotate: -360,
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-900/10 rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-4xl relative z-10 m-4 flex flex-col md:flex-row rounded-2xl overflow-hidden border border-border shadow-2xl bg-surface/80 backdrop-blur-xl h-[600px]"
      >

        {/* Left Side - Hero */}
        <div className="w-full md:w-1/2 p-10 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-surface to-surface-highlight border-r border-border">
          <div className="relative z-10">
             <motion.div
               initial={{ x: -20, opacity: 0 }}
               animate={{ x: 0, opacity: 1 }}
               transition={{ delay: 0.2 }}
               className="flex items-center gap-3 mb-12"
             >
              <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center border border-accent/20">
                <ShieldCheck className="text-accent" size={20} />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">DocuCA</span>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="text-4xl font-bold mb-6 leading-tight text-white">
                Professional <br />
                <span className="text-accent">Financial Suite</span>
              </h1>
              <p className="text-secondary text-base leading-relaxed max-w-xs">
                Securely manage documents, returns, and client relationships with precision and ease.
              </p>
            </motion.div>
          </div>

          <div className="relative z-10 mt-12">
            <div className="flex items-center gap-4 text-sm text-secondary">
               <div className="flex -space-x-3">
                 {[1,2,3].map((i) => (
                   <div key={i} className="w-8 h-8 rounded-full bg-surface-highlight border border-border flex items-center justify-center text-xs font-mono text-secondary">
                      {String.fromCharCode(64+i)}
                   </div>
                 ))}
               </div>
               <span className="font-mono text-xs">Trusted Platform</span>
            </div>
          </div>

          {/* Decorative Grid on Left Panel */}
          <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none bg-[linear-gradient(45deg,#ffffff_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full md:w-1/2 p-10 flex flex-col justify-center bg-background/50 relative">

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-primary mb-2">Welcome Back</h2>
            <p className="text-secondary text-sm">Select your portal to continue</p>
          </div>

          {/* Role Switcher */}
          <div className="flex bg-surface p-1 rounded-lg mb-8 border border-border">
            <button
              onClick={() => setSelectedRole('ca')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${selectedRole === 'ca' ? 'bg-background text-accent shadow-sm border border-border/50' : 'text-secondary hover:text-primary hover:bg-surface-highlight'}`}
            >
              <Briefcase size={16} /> CA / Admin
            </button>
            <button
              onClick={() => setSelectedRole('client')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-2 ${selectedRole === 'client' ? 'bg-background text-accent shadow-sm border border-border/50' : 'text-secondary hover:text-primary hover:bg-surface-highlight'}`}
            >
              <User size={16} /> Client
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={selectedRole}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              onSubmit={currentSubmitHandler}
              className="space-y-5"
            >
              <div className="space-y-1">
                <label className="block text-xs font-mono text-secondary uppercase tracking-wider">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-accent transition-colors" size={18} />
                  <input
                    type="email"
                    value={currentEmail}
                    onChange={(e) => currentSetEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-surface text-primary placeholder-secondary/50 focus:border-accent focus:ring-1 focus:ring-accent transition-all outline-none"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-mono text-secondary uppercase tracking-wider">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary group-focus-within:text-accent transition-colors" size={18} />
                  <input
                    type={currentShowPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => currentSetPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 rounded-lg border border-border bg-surface text-primary placeholder-secondary/50 focus:border-accent focus:ring-1 focus:ring-accent transition-all outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => currentSetShowPassword(!currentShowPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors focus:outline-none"
                  >
                    {currentShowPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-secondary">
                <label className="flex items-center cursor-pointer hover:text-primary transition-colors">
                  <input type="checkbox" className="mr-2 rounded border-border bg-surface text-accent focus:ring-accent" />
                  Remember me
                </label>
                <button type="button" className="hover:text-accent transition-colors focus:outline-none">Forgot password?</button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-sm font-bold tracking-wide"
                variant="accent"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <span className="flex items-center gap-2">Sign In <ChevronRight size={16} /></span>}
              </Button>
            </motion.form>
          </AnimatePresence>

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-[10px] text-center text-secondary font-mono">
              <span className="block mb-1 text-accent/70">DEVELOPMENT MODE</span>
              DEMO: CA (OTP: 123456) | CLIENT (PASS: 123456)
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default LoginPage;
