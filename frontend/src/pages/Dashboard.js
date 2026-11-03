import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getBudgetInsight, getSyncStats, getPendingTransactions } from '../services/financeApi';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { useToast } from '../hooks/useToast';

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { 
  initial: { opacity: 0, y: 20 }, 
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } } 
};

function SkeletonCard() {
  return (
    <div className="space-y-5">
      <div className="skeleton h-52 rounded-[2rem]" />
      <div className="grid grid-cols-2 gap-4">
        <div className="skeleton h-32 rounded-3xl" />
        <div className="skeleton h-32 rounded-3xl" />
      </div>
      <div className="skeleton h-24 rounded-3xl" />
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [syncStats, setSyncStats] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();

  useEffect(() => {
    Promise.all([
      getBudgetInsight(),
      getSyncStats(),
      getPendingTransactions()
    ]).then(([budgetData, syncData, pendingData]) => {
      setData(budgetData);
      setSyncStats(syncData);
      setPendingCount(Array.isArray(pendingData) ? pendingData.length : 0);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    try {
      const [budgetData, syncData, pendingData] = await Promise.all([
        getBudgetInsight(),
        getSyncStats(),
        getPendingTransactions()
      ]);
      setData(budgetData);
      setSyncStats(syncData);
      setPendingCount(Array.isArray(pendingData) ? pendingData.length : 0);
      success('Dashboard refreshed');
    } catch (err) {
      toastError('Failed to refresh dashboard');
      console.error(err);
    }
  };

  if (loading) return <SkeletonCard />;
  
  if (!data) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-dark-100 flex items-center justify-center mb-4">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      </div>
      <p className="text-dark-600 font-semibold mb-1">Could not load your data</p>
      <p className="text-sm text-dark-400">Make sure the backend is running on port 5070</p>
    </div>
  );

  const pct = Math.min(data.percentageUsed || 0, 100);
  const statusConfig = {
    OK: { color: 'text-primary', bg: 'bg-primary-100', label: 'On Track', icon: '✓' },
    WARNING: { color: 'text-amber-600', bg: 'bg-amber-100', label: 'Careful', icon: '!' },
    EXCEEDED: { color: 'text-red-600', bg: 'bg-red-100', label: 'Exceeded', icon: '✕' },
  };
  const status = statusConfig[data.status] || statusConfig.OK;

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-5">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between pt-2">
        <div>
          <p className="text-[11px] text-dark-400 font-semibold uppercase tracking-widest mb-0.5">Welcome back</p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-dark-900 tracking-tight">Dashboard</h1>
        </div>
        <div className="relative">
          <div className="w-11 h-11 rounded-2xl gradient-hero flex items-center justify-center text-white font-bold text-sm shadow-lg">
            S
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-primary-400 rounded-full border-2 border-white" />
        </div>
      </motion.div>

      {/* Auto-Sync Status + Pending Badge */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {syncStats && (
          <motion.div variants={fadeUp} 
            className={`flex items-center justify-between rounded-2xl px-4 py-3 border ${
              syncStats.isActive 
                ? 'bg-primary-50 border-primary-200' 
                : 'bg-dark-50 border-dark-200'
            }`}>
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${
                syncStats.isActive ? 'bg-primary-500 animate-pulse' : 'bg-dark-300'
              }`} />
              <div>
                <p className="text-xs font-bold text-dark-700">
                  M-Pesa Auto-Sync
                </p>
                <p className="text-[10px] text-dark-400">
                  {syncStats.isActive 
                    ? `Active • ${syncStats.mpesaTransactions} synced`
                    : syncStats.lastSync 
                      ? `Last: ${new Date(syncStats.lastSync).toLocaleString()}`
                      : 'No SMS synced yet'
                  }
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/parse-sms')}
              className="text-[10px] font-bold text-primary-600 hover:text-primary-700 px-3 py-1.5 rounded-lg hover:bg-primary-100 transition">
              {syncStats.mpesaTransactions > 0 ? 'View All' : 'Setup'}
            </button>
          </motion.div>
        )}

        {pendingCount > 0 && (
          <motion.div variants={fadeUp}
            className="flex items-center justify-between rounded-2xl px-4 py-3 border border-amber-200 bg-amber-50">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-dark-700">
                  {pendingCount} Pending Transaction{pendingCount !== 1 ? 's' : ''}
                </p>
                <p className="text-[10px] text-dark-400">
                  Needs categorization
                </p>
              </div>
            </div>
            <button onClick={() => navigate('/pending')}
              className="text-[10px] font-bold text-amber-600 hover:text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition">
              Review
            </button>
          </motion.div>
        )}
      </div>

      {/* Hero Balance Card */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-[2.5rem] p-6 md:p-8 text-white card-glow">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 -ml-12 -mb-12" />
          <div className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full bg-white/5 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" />
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-[0.2em]">Total Balance</p>
          </div>
          <AnimatedNumber 
            value={data.balance || 0} 
            prefix="KES " 
            className="text-5xl md:text-6xl font-black tracking-tight mb-6 text-gradient"
            duration={1.5}
          />
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'M-Pesa', value: data.mpesaBalance, icon: '📱', tint: 'text-emerald-400' },
              { label: 'Bank', value: data.bankBalance, icon: '🏦', tint: 'text-blue-400' },
              { label: 'Cash', value: data.cashBalance, icon: '💵', tint: 'text-gray-400' },
            ].map((item) => (
              <div key={item.label} className="bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-3 border border-white/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs">{item.icon}</span>
                  <p className="text-[10px] text-white/60 font-semibold">{item.label}</p>
                </div>
                <AnimatedNumber 
                  value={item.value || 0} 
                  prefix="KES " 
                  className={`text-base md:text-lg font-bold ${item.tint}`}
                  duration={1}
                />
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Transfer CTA — move money between M-Pesa, Bank and Cash */}
      <motion.div variants={fadeUp} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
        <button onClick={() => navigate('/transfer')}
          className="w-full flex items-center gap-4 rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50 via-white to-emerald-50/60 px-5 py-4 text-left transition-all duration-200 hover:shadow-md active:scale-[0.99]">
          <div className="w-11 h-11 rounded-2xl gradient-hero flex items-center justify-center flex-shrink-0 shadow-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 014-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 01-4 4H3" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-dark-800">Transfer money</p>
            <p className="text-[11px] text-dark-400 mt-0.5">Move money between M-Pesa, your bank and cash</p>
          </div>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </motion.div>

      {/* Budget + AI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Weekly Budget */}
        <motion.div variants={fadeUp} className="card-glow" whileHover={{ y: -2 }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-dark-800">Weekly Budget</p>
                <p className="text-[10px] text-dark-400 font-medium">Spending tracker</p>
              </div>
            </div>
            <span className={`badge ${status.bg} ${status.color}`}>
              <span className="mr-1">{status.icon}</span>
              {status.label}
            </span>
          </div>

          <div className="relative w-full h-3 bg-dark-100 rounded-full overflow-hidden mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.3 }}
              className={`h-full rounded-full ${
                data.status === 'EXCEEDED' ? 'bg-gradient-to-r from-red-500 to-red-400' :
                data.status === 'WARNING' ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 
                'bg-gradient-to-r from-primary-500 to-primary-400'
              }`}
            />
          </div>

          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] text-dark-400 font-semibold uppercase tracking-wider">Spent</p>
              <AnimatedNumber 
                value={data.totalSpent || 0} 
                prefix="KES " 
                className="text-lg font-extrabold text-dark-800"
                duration={1}
              />
            </div>
            <div className="text-right">
              <p className="text-[10px] text-dark-400 font-semibold uppercase tracking-wider">Remaining</p>
              <AnimatedNumber 
                value={data.remaining || 0} 
                prefix="KES " 
                className={`text-lg font-extrabold ${pct >= 100 ? 'text-red-500' : 'text-primary'}`}
                duration={1}
              />
            </div>
          </div>

          {data.recurringWeekly > 0 && (
            <div className="mt-4 flex items-center gap-2 text-[11px] text-dark-500 bg-dark-50 rounded-xl px-3 py-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
              </svg>
              <span>Recurring: <span className="font-bold">KES {data.recurringWeekly}/wk</span> deducted</span>
            </div>
          )}
        </motion.div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Savings Badge */}
          {data.savingsPercentage > 0 && (
            <motion.div variants={fadeUp}
              className="card-glow relative overflow-hidden p-5 border border-pink-100/50"
              style={{ background: 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)' }}
              whileHover={{ y: -2 }}>
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-pink-200/30 -mr-8 -mt-8" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🐷</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-pink-600 uppercase tracking-[0.15em] mb-0.5">Auto-Save Active</p>
                  <p className="text-sm font-bold text-pink-900">{data.savingsPercentage}% of income saved automatically</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* AI Advice */}
          {data.aiAdvice && (
            <motion.div variants={fadeUp}
              className="card-glow relative overflow-hidden p-5 border border-amber-100/50"
              style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)' }}
              whileHover={{ y: -2 }}>
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-amber-200/30 -mr-10 -mt-10" />
              <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-amber-200/20 -ml-6 -mb-6" />
              <div className="relative z-10 flex gap-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xl">✨</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-[0.15em] mb-1.5">AI Insight</p>
                  <p className="text-sm text-amber-900/80 leading-relaxed font-medium">{data.aiAdvice}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Where Did My Money Go? - Money Leaks & Daily Burn Rate */}
      {data.spendingLeaks && (
        <motion.div variants={fadeUp} className="card border-2 border-indigo-100 bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/30" whileHover={{ y: -2 }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg">
                🕵️
              </div>
              <div>
                <h3 className="text-base font-extrabold text-dark-900">Where Your Money Goes</h3>
                <p className="text-xs text-dark-400">Cash leak detection & survival runway</p>
              </div>
            </div>
            <span className="badge bg-indigo-100 text-indigo-700 font-bold text-[11px]">
              Last 30 Days
            </span>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {/* Daily Burn */}
            <motion.div 
              layout
              className="bg-white rounded-2xl p-3 border border-dark-100 shadow-sm"
              whileHover={{ scale: 1.02 }}
            >
              <p className="text-[10px] text-dark-400 uppercase font-bold tracking-wider mb-1">Daily Burn Rate</p>
              <AnimatedNumber 
                value={data.spendingLeaks.dailyBurnRate || 0} 
                prefix="KES " 
                suffix=" <span className='text-xs font-normal text-dark-400'>/day</span>"
                formatter={(v) => `${v.toLocaleString()} <span className='text-xs font-normal text-dark-400'>/day</span>`}
                className="text-xl font-black text-dark-800"
                duration={1}
              />
              <p className="text-[11px] text-dark-500 mt-1">Average daily spending</p>
            </motion.div>

            {/* Survival Runway */}
            <motion.div 
              layout
              className="bg-white rounded-2xl p-3 border border-dark-100 shadow-sm"
              whileHover={{ scale: 1.02 }}
            >
              <p className="text-[10px] text-dark-400 uppercase font-bold tracking-wider mb-1">Survival Runway</p>
              <div className="flex items-center gap-2">
                <AnimatedNumber 
                  value={data.spendingLeaks.runwayDays === 999 ? 999 : data.spendingLeaks.runwayDays || 0} 
                  className={`text-xl font-black ${
                    data.spendingLeaks.runwayDays <= 7 ? 'text-red-500' :
                    data.spendingLeaks.runwayDays <= 14 ? 'text-amber-500' : 'text-primary'
                  }`}
                  duration={1}
                />
                {data.spendingLeaks.runwayDays === 999 ? (
                  <span className="text-xl font-black text-primary">∞</span>
                ) : (
                  <span className="text-xl font-black text-primary">Days</span>
                )}
              </div>
              <p className="text-[11px] text-dark-500 mt-1">
                {data.spendingLeaks.runwayDays <= 7 ? '⚠️ Funds low! Slow down spending' : 'At current daily burn rate'}
              </p>
            </motion.div>

            {/* Micro-spend Leaks */}
            <motion.div 
              layout
              className="bg-white rounded-2xl p-3 border border-dark-100 shadow-sm"
              whileHover={{ scale: 1.02 }}
            >
              <p className="text-[10px] text-dark-400 uppercase font-bold tracking-wider mb-1">Small Drains (&lt; Ksh 300)</p>
              <AnimatedNumber 
                value={data.spendingLeaks.microSpending?.total || 0} 
                prefix="KES " 
                className="text-xl font-black text-amber-600"
                duration={1}
              />
              <p className="text-[11px] text-dark-500 mt-1">
                {data.spendingLeaks.microSpending?.count || 0} purchases ({data.spendingLeaks.microSpending?.percentage || 0}% of total)
              </p>
            </motion.div>
          </div>

          {/* Micro-spend Insight Banner */}
          {data.spendingLeaks.microSpending?.insight && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl px-3.5 py-2.5 text-xs font-medium flex items-center gap-2 mb-4 ${
                data.spendingLeaks.microSpending?.percentage > 25
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}>
              <span>{data.spendingLeaks.microSpending?.percentage > 25 ? '⚠️' : '💡'}</span>
              <span>{data.spendingLeaks.microSpending?.insight}</span>
            </motion.div>
          )}

          {/* Top Drains List */}
          {data.spendingLeaks.topDrains && data.spendingLeaks.topDrains.length > 0 && (
            <motion.div layout>
              <p className="text-xs font-bold text-dark-600 uppercase tracking-wider mb-2">Top Money Drains</p>
              <div className="space-y-2">
                {data.spendingLeaks.topDrains.slice(0, 3).map((drain, idx) => (
                  <motion.div 
                    key={idx} 
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between text-xs bg-white rounded-xl px-3 py-2 border border-dark-100"
                    whileHover={{ x: 4 }}
                  >
                    <span className="font-semibold text-dark-700 truncate max-w-[200px]">{drain.payee}</span>
                    <AnimatedNumber 
                      value={drain.amount} 
                      prefix="KES " 
                      className="font-extrabold text-dark-900"
                      duration={0.8}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={fadeUp}>
        <p className="section-title">Quick Actions</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'Add Entry', icon: '✏️', to: '/add', color: 'from-primary-50 to-primary-100', text: 'text-primary-700', tint: 'bg-primary-500' },
            { label: 'Parse SMS', icon: '📱', to: '/parse-sms', color: 'from-blue-50 to-blue-100', text: 'text-blue-700', tint: 'bg-blue-500' },
            { label: 'HELB Plan', icon: '🎓', to: '/helb', color: 'from-purple-50 to-purple-100', text: 'text-purple-700', tint: 'bg-purple-500' },
            { label: 'Budget', icon: '📊', to: '/budget', color: 'from-amber-50 to-amber-100', text: 'text-amber-700', tint: 'bg-amber-500' },
            { label: 'Recurring', icon: '🔁', to: '/recurring', color: 'from-emerald-50 to-emerald-100', text: 'text-emerald-700', tint: 'bg-emerald-500' },
            { label: 'Charts', icon: '📈', to: '/charts', color: 'from-indigo-50 to-indigo-100', text: 'text-indigo-700', tint: 'bg-indigo-500' },
            { label: 'Goals', icon: '🎯', to: '/savings-goals', color: 'from-pink-50 to-pink-100', text: 'text-pink-700', tint: 'bg-pink-500' },
          ].map((a) => (
            <button key={a.to} onClick={() => navigate(a.to)}
              className={`bg-gradient-to-br ${a.color} rounded-2xl p-4 flex flex-col items-center gap-2.5 transition-all duration-300 active:scale-95 hover:shadow-lg hover:-translate-y-1 border border-white/50`}
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${a.tint}`}>
                <span className="text-lg">{a.icon}</span>
              </div>
              <span className={`text-[11px] font-bold ${a.text}`}>{a.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity Teaser */}
      {data.recentTransactions && data.recentTransactions.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-3">
            <p className="section-title mb-0">Recent Activity</p>
            <button onClick={() => navigate('/transactions')} className="text-xs font-bold text-primary-600 hover:text-primary-700">
              View All →
            </button>
          </div>
          <div className="card space-y-3">
            {data.recentTransactions.slice(0, 3).map((tx, i) => (
              <motion.div 
                key={i} 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3"
                whileHover={{ x: 4 }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  tx.type === 'transfer' ? 'bg-primary-100' : tx.type === 'income' ? 'bg-primary-100' : 'bg-dark-100'
                }`}>
                  <span className="text-lg">{tx.type === 'transfer' ? '🔁' : tx.type === 'income' ? '💰' : '💸'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark-800 truncate">{tx.description}</p>
                  <p className="text-[10px] text-dark-400">
                    {tx.type === 'transfer' ? `Transfer • ${tx.provider} → ${tx.toProvider}` : tx.category}
                  </p>
                </div>
                {tx.type === 'transfer' ? (
                  <AnimatedNumber 
                    value={tx.amount} 
                    prefix="KES " 
                    className="text-sm font-bold text-primary-600"
                    duration={0.8}
                  />
                ) : (
                  <AnimatedNumber 
                    value={tx.amount} 
                    prefix={tx.type === 'income' ? '+ KES ' : '- KES '} 
                    className={`text-sm font-bold ${tx.type === 'income' ? 'text-primary-600' : 'text-dark-700'}`}
                    duration={0.8}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}