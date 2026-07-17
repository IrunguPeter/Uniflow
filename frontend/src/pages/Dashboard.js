import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getBudgetInsight } from '../services/financeApi';

const stagger = { animate: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

function SkeletonCard() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-44 rounded-3xl" />
      <div className="skeleton h-28 rounded-3xl" />
      <div className="skeleton h-20 rounded-3xl" />
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getBudgetInsight().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <SkeletonCard />;
  if (!data) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">💸</div>
      <p className="text-muted font-medium">Could not load your data</p>
      <p className="text-sm text-gray-400 mt-1">Make sure the backend is running on port 5000</p>
    </div>
  );

  const pct = Math.min(data.percentageUsed || 0, 100);
  const statusConfig = {
    OK: { color: 'text-primary', bg: 'bg-primary/10', label: 'On Track' },
    WARNING: { color: 'text-amber-500', bg: 'bg-amber-50', label: 'Careful' },
    EXCEEDED: { color: 'text-red-500', bg: 'bg-red-50', label: 'Exceeded' },
  };
  const status = statusConfig[data.status] || statusConfig.OK;

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs text-muted font-medium">Good day</p>
          <h1 className="text-xl md:text-2xl font-extrabold text-secondary tracking-tight">UniFlow</h1>
        </div>
        <div className="w-10 h-10 rounded-full gradient-hero flex items-center justify-center text-white font-bold text-sm shadow-lg">
          S
        </div>
      </motion.div>

      {/* Hero Balance Card */}
      <motion.div variants={fadeUp} className="gradient-hero rounded-3xl p-6 md:p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -mr-10 -mt-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 -ml-8 -mb-8" />
        <div className="relative z-10">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Total Balance</p>
          <p className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            KES {(data.balance || 0).toLocaleString()}
          </p>
          <div className="flex gap-3">
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-2 flex-1 md:px-4 md:py-3">
              <p className="text-[10px] text-white/60 font-medium">M-Pesa</p>
              <p className="text-sm md:text-base font-bold">KES {(data.mpesaBalance || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-2 flex-1 md:px-4 md:py-3">
              <p className="text-[10px] text-white/60 font-medium">Bank</p>
              <p className="text-sm md:text-base font-bold">KES {(data.bankBalance || 0).toLocaleString()}</p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-2 flex-1 md:px-4 md:py-3">
              <p className="text-[10px] text-white/60 font-medium">Cash</p>
              <p className="text-sm md:text-base font-bold">KES {(data.cashBalance || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Middle Row: Budget + AI/Savings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weekly Budget */}
        <motion.div variants={fadeUp} className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00B97A" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <p className="text-sm font-bold text-secondary">Weekly Budget</p>
            </div>
            <span className={`badge ${status.bg} ${status.color}`}>{status.label}</span>
          </div>

          <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              className={`h-full rounded-full ${
                data.status === 'EXCEEDED' ? 'bg-red-500' :
                data.status === 'WARNING' ? 'bg-amber-400' : 'bg-primary'
              }`}
            />
          </div>

          <div className="flex justify-between text-xs">
            <span className="text-muted">Spent <span className="font-bold text-secondary">KES {(data.totalSpent || 0).toLocaleString()}</span></span>
            <span className="text-muted">Left <span className={`font-bold ${pct >= 100 ? 'text-red-500' : 'text-primary'}`}>KES {(data.remaining || 0).toLocaleString()}</span></span>
          </div>
          {data.recurringWeekly > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted bg-gray-50 rounded-xl px-3 py-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
              Recurring: KES {data.recurringWeekly}/wk deducted
            </div>
          )}
        </motion.div>

        {/* Right Column: Savings + AI */}
        <div className="space-y-4">
          {/* Savings Badge */}
          {data.savingsPercentage > 0 && (
            <motion.div variants={fadeUp}
              className="flex items-center gap-3 rounded-2xl p-4 border border-pink-200"
              style={{ background: 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)' }}>
              <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🐷</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-pink-600 uppercase tracking-widest">Auto-Save Active</p>
                <p className="text-sm font-bold text-secondary">{data.savingsPercentage}% of income saved automatically</p>
              </div>
            </motion.div>
          )}

          {/* AI Advice */}
          {data.aiAdvice && (
            <motion.div variants={fadeUp}
              className="relative overflow-hidden rounded-3xl p-5"
              style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)' }}>
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-accent/10 -mr-6 -mt-6" />
              <div className="relative z-10 flex gap-3">
                <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-lg">✨</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">AI Insight</p>
                  <p className="text-sm text-amber-900/80 leading-relaxed font-medium">{data.aiAdvice}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <motion.div variants={fadeUp}>
        <p className="section-title">Quick Actions</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'Add Entry', icon: '✏️', to: '/add', gradient: 'from-primary/10 to-primary/5' },
            { label: 'Parse SMS', icon: '📱', to: '/parse-sms', gradient: 'from-blue-50 to-cyan-50' },
            { label: 'HELB Plan', icon: '🎓', to: '/helb', gradient: 'from-purple-50 to-pink-50' },
            { label: 'Budget', icon: '📊', to: '/budget', gradient: 'from-amber-50 to-orange-50' },
            { label: 'Recurring', icon: '🔁', to: '/recurring', gradient: 'from-emerald-50 to-teal-50' },
            { label: 'Charts', icon: '📈', to: '/charts', gradient: 'from-indigo-50 to-violet-50' },
          ].map((a) => (
            <button key={a.to} onClick={() => navigate(a.to)}
              className={`bg-gradient-to-br ${a.gradient} rounded-2xl p-4 flex flex-col items-center gap-2 transition-all active:scale-95`}>
              <span className="text-2xl">{a.icon}</span>
              <span className="text-[11px] font-bold text-secondary">{a.label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
