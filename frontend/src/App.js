import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import AddTransaction from './pages/AddTransaction';
import ParseSms from './pages/ParseSms';
import RecurringExpenses from './pages/RecurringExpenses';
import HelbPlanner from './pages/HelbPlanner';
import BudgetTool from './pages/BudgetTool';
import Charts from './pages/Charts';
import Chat from './pages/Chat';

const tabs = [
  { to: '/', label: 'Home', icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#00B97A' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )},
  { to: '/transactions', label: 'Ledger', icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#00B97A' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )},
  { to: '/add', label: 'Add', icon: (active) => (
    <div className={`w-12 h-12 rounded-full flex items-center justify-center -mt-4 shadow-lg transition-all ${active ? 'scale-110' : ''}`}
      style={{ background: 'linear-gradient(135deg, #00B97A, #00D98F)' }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </div>
  ), isCenter: true },
  { to: '/charts', label: 'Charts', icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#00B97A' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )},
  { to: '/chat', label: 'AI Chat', icon: (active) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? '#00B97A' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )},
];

function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-gray-200/50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
      <div className="max-w-lg mx-auto flex items-end justify-around pt-2 pb-2 px-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.to;
          if (tab.isCenter) {
            return (
              <NavLink key={tab.to} to={tab.to} className="flex flex-col items-center">
                {tab.icon(isActive)}
                <span className={`text-[10px] font-semibold mt-0.5 ${isActive ? 'text-primary' : 'text-muted'}`}>
                  {tab.label}
                </span>
              </NavLink>
            );
          }
          return (
            <NavLink key={tab.to} to={tab.to} className="flex flex-col items-center py-1 px-3 relative">
              {tab.icon(isActive)}
              {isActive && (
                <motion.div layoutId="tab-indicator"
                  className="absolute -top-1 w-5 h-0.5 rounded-full bg-primary" />
              )}
              <span className={`text-[10px] font-semibold mt-0.5 ${isActive ? 'text-primary' : 'text-muted'}`}>
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
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

function AppShell() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-lg mx-auto px-4 pt-3 pb-28" key={location.pathname}>
        <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/add" element={<AddTransaction />} />
            <Route path="/parse-sms" element={<ParseSms />} />
            <Route path="/recurring" element={<RecurringExpenses />} />
            <Route path="/helb" element={<HelbPlanner />} />
            <Route path="/budget" element={<BudgetTool />} />
            <Route path="/charts" element={<Charts />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </motion.div>
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
