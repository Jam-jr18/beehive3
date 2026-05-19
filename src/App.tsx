import React, { useState } from 'react';
import { AppProvider, useApp } from './store';
import { CustomerView } from './CustomerView';
import { StaffView } from './StaffView';
import { AdminView } from './AdminView';
import { User, ShieldCheck, ChefHat, Lock, LogIn } from 'lucide-react';
import { cn } from './utils/cn';

type ViewMode = 'Customer' | 'Staff' | 'Admin';

const LoginView: React.FC<{ onLogin: (role: ViewMode) => void, targetRole: ViewMode, correctPin: string }> = ({ onLogin, targetRole, correctPin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === correctPin) {
      onLogin(targetRole);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] p-10 w-full max-w-md shadow-2xl">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Lock size={40} />
        </div>
        <h2 className="text-3xl font-black text-center text-slate-800 mb-2">{targetRole} Portal</h2>
        <p className="text-center text-slate-400 mb-8">Please enter your authorization code</p>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <input 
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(
                "w-full px-6 py-4 bg-slate-50 border rounded-2xl focus:ring-2 ring-indigo-500 outline-none text-center text-2xl tracking-[1em] font-bold transition-all",
                error && "border-red-500 ring-red-500 animate-shake"
              )}
            />
            {error && <p className="text-red-500 text-xs font-bold mt-2 text-center uppercase tracking-widest">Invalid Access Code</p>}
          </div>
          <button className="w-full bg-slate-800 hover:bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-95">
            <LogIn size={20} /> Access System
          </button>
        </form>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { paymentConfig } = useApp();
  const [view, setView] = useState<ViewMode>('Customer');
  const [authenticatedRole, setAuthenticatedRole] = useState<ViewMode | null>(null);

  const handleRoleChange = (newRole: ViewMode) => {
    if (newRole === 'Customer') {
      setView('Customer');
      setAuthenticatedRole(null);
    } else {
      setView(newRole);
    }
  };

  const renderContent = () => {
    if (view === 'Customer') return <CustomerView />;
    
    // Check authentication for Staff and Admin
    if (authenticatedRole !== view) {
      const correctPin = view === 'Admin' ? paymentConfig.adminPin : paymentConfig.staffPin;
      return <LoginView onLogin={(role) => setAuthenticatedRole(role)} targetRole={view} correctPin={correctPin} />;
    }

    if (view === 'Staff') return <StaffView />;
    if (view === 'Admin') return <AdminView />;
  };

  return (
    <div className="min-h-screen">
      {renderContent()}

      {/* Secret Floating Navigation (Top Left, Mostly Invisible) */}
      <nav className="fixed top-4 left-4 z-[100] group flex flex-col gap-2">
        {/* Invisible Trigger */}
        <div className="w-10 h-10 bg-transparent rounded-full flex items-center justify-center cursor-help">
          <div className="w-1 h-1 bg-gray-300/10 rounded-full group-hover:bg-yellow-500/50 transition-colors" />
        </div>
        
        {/* Hidden Menu Content */}
        <div className="flex flex-col gap-2 opacity-0 -translate-x-10 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto transition-all duration-500">
          <button 
            onClick={() => handleRoleChange('Customer')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-md border transition-all",
              view === 'Customer' ? "bg-yellow-500 text-white border-yellow-400 shadow-lg" : "bg-white/10 text-white border-white/20 hover:bg-white/20"
            )}
          >
            <User size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">Store View</span>
          </button>
          
          <button 
            onClick={() => handleRoleChange('Staff')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-md border transition-all",
              view === 'Staff' ? "bg-slate-800 text-white border-slate-700 shadow-lg" : "bg-white/10 text-white border-white/20 hover:bg-white/20"
            )}
          >
            <ChefHat size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">Staff Portal</span>
          </button>

          <button 
            onClick={() => handleRoleChange('Admin')}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-md border transition-all",
              view === 'Admin' ? "bg-indigo-600 text-white border-indigo-500 shadow-lg" : "bg-white/10 text-white border-white/20 hover:bg-white/20"
            )}
          >
            <ShieldCheck size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">Management</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
