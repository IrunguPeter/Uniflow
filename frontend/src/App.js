import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import AddTransaction from './pages/AddTransaction';
import ParseSms from './pages/ParseSms';
import RecurringExpenses from './pages/RecurringExpenses';
import HelbPlanner from './pages/HelbPlanner';
import BudgetTool from './pages/BudgetTool';
import Charts from './pages/Charts';
import Chat from './pages/Chat';
import PendingTransactions from './pages/PendingTransactions';
import Transfers from './pages/Transfers';

const tabs = [
  { to: '/', label: 'Home', icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )},
  { to: '/transactions', label: 'Ledger', icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )},
  { to: '/add', label: 'Add', icon: (active) => (
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 ${active ? 'scale-110 shadow-xl' : ''}`}
      style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </div>
  ), isCenter: true },
  { to: '/charts', label: 'Charts', icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )},
  { to: '/chat', label: 'AI Chat', icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )},
];

const sidebarTabs = [
  ...tabs.slice(0, 2),
  { to: '/pending', label: 'Pending', icon: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )},
  { to: '/budget', label: 'Budget', icon: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8" />
      <path d="M12 18V6" />
    </svg>
  )},
  tabs[2],
  ...tabs.slice(3),
  { to: '/recurring', label: 'Recurring', icon: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  )},
  { to: '/helb', label: 'HELB', icon: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  )},
  { to: '/transfer', label: 'Transfer', icon: (active) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? '#10B981' : '#94A3B8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  )},
];

/* ── Desktop Sidebar ─────────────────────────────────────────── */
function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col glass-strong border-r border-dark-100/50 z-50">
      <div className="px-6 pt-7 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl gradient-hero flex items-center justify-center text-white font-bold text-base shadow-lg">
            U
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-dark-900 tracking-tight">UniFlow</h1>
            <p className="text-[10px] text-dark-400 font-semibold uppercase tracking-widest">Finance Manager</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {sidebarTabs.map((tab) => {
          const isActive = location.pathname === tab.to;
          return (
            <NavLink key={tab.to} to={tab.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 relative ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-dark-500 hover:bg-dark-50 hover:text-dark-700'
              }`}>
              {isActive && (
                <motion.div layoutId="sidebar-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-primary-500" />
              )}
              <span className="flex-shrink-0">{tab.icon(isActive)}</span>
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="px-4 pb-5">
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-4 border border-primary-200/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-primary-200 flex items-center justify-center">
              <span className="text-sm">💡</span>
            </div>
            <p className="text-[10px] font-bold text-primary-700 uppercase tracking-widest">Pro Tip</p>
          </div>
          <p className="text-xs text-primary-800/70 leading-relaxed">Track income & save a percentage automatically</p>
        </div>
      </div>
    </aside>
  );
}

/* ── Mobile Bottom Nav ──────────────────────────────────────── */
function BottomNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-dark-100/50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
      <div className="max-w-lg mx-auto flex items-end justify-around pt-2 pb-2 px-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.to;
          if (tab.isCenter) {
            return (
              <NavLink key={tab.to} to={tab.to} className="flex flex-col items-center -mt-4">
                {tab.icon(isActive)}
                <span className={`text-[10px] font-semibold mt-1 ${isActive ? 'text-primary-600' : 'text-dark-400'}`}>
                  {tab.label}
                </span>
              </NavLink>
            );
          }
          return (
            <NavLink key={tab.to} to={tab.to} className="flex flex-col items-center py-1 px-3 relative">
              <div className={`transition-all duration-200 ${isActive ? 'scale-110' : ''}`}>
                {tab.icon(isActive)}
              </div>
              {isActive && (
                <motion.div layoutId="tab-indicator"
                  className="absolute -top-1 w-6 h-1 rounded-full bg-primary-500" />
              )}
              <span className={`text-[10px] font-semibold mt-1 ${isActive ? 'text-primary-600' : 'text-dark-400'}`}>
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

function AppShell() {
  const location = useLocation();

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="md:ml-64 px-4 md:px-8 lg:px-12 pt-4 pb-28 md:pb-8 md:pt-8" key={location.pathname}>
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/add" element={<AddTransaction />} />
                <Route path="/parse-sms" element={<ParseSms />} />
                <Route path="/pending" element={<PendingTransactions />} />
                <Route path="/recurring" element={<RecurringExpenses />} />
                <Route path="/helb" element={<HelbPlanner />} />
                <Route path="/budget" element={<BudgetTool />} />
                <Route path="/charts" element={<Charts />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/transfer" element={<Transfers />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
