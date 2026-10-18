import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getBudgetInsight, getSyncStats, getPendingTransactions } from '../services/financeApi';

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

  if (loading) return <SkeletonCard />;
  
  if (!data) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-full bg-dark-100 flex items-center justify-center mb-4">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.5">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      </div>
      <p className="text-dark-600 font-semibold mb-1">Could not load your data</p>
      <p className="text-sm text-dark-400">Make sure the backend is running on port 5000</p>
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
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-[2rem] p-6 md:p-8 text-white">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 -ml-12 -mb-12" />
          <div className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full bg-white/5 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-white/60 animate-pulse" />
            <p className="text-white/70 text-[11px] font-bold uppercase tracking-[0.2em]">Total Balance</p>
          </div>
          <p className="text-5xl md:text-6xl font-black tracking-tight mb-6">
            KES {(data.balance || 0).toLocaleString()}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'M-Pesa', value: data.mpesaBalance, icon: '📱' },
              { label: 'Bank', value: data.bankBalance, icon: '🏦' },
              { label: 'Cash', value: data.cashBalance, icon: '💵' },
            ].map((item) => (
              <div key={item.label} className="bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-3 border border-white/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs">{item.icon}</span>
                  <p className="text-[10px] text-white/60 font-semibold">{item.label}</p>
                </div>
                <p className="text-base md:text-lg font-bold">KES {(item.value || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Budget + AI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Weekly Budget */}
        <motion.div variants={fadeUp} className="card">
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
              <p className="text-lg font-extrabold text-dark-800">KES {(data.totalSpent || 0).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-dark-400 font-semibold uppercase tracking-wider">Remaining</p>
              <p className={`text-lg font-extrabold ${pct >= 100 ? 'text-red-500' : 'text-primary'}`}>
                KES {(data.remaining || 0).toLocaleString()}
              </p>
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
              className="relative overflow-hidden rounded-3xl p-5 border border-pink-200/50"
              style={{ background: 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 50%, #FBCFE8 100%)' }}>
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
              className="relative overflow-hidden rounded-3xl p-5 border border-amber-200/50"
              style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 50%, #FDE68A 30%)' }}>
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
        <motion.div variants={fadeUp} className="card border-2 border-indigo-100 bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/30">
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
            <div className="bg-white rounded-2xl p-3 border border-dark-100 shadow-sm">
              <p className="text-[10px] text-dark-400 uppercase font-bold tracking-wider mb-1">Daily Burn Rate</p>
              <p className="text-xl font-black text-dark-800">
                KES {(data.spendingLeaks.dailyBurnRate || 0).toLocaleString()} <span className="text-xs font-normal text-dark-400">/day</span>
              </p>
              <p className="text-[11px] text-dark-500 mt-1">Average daily spending</p>
            </div>

            {/* Survival Runway */}
            <div className="bg-white rounded-2xl p-3 border border-dark-100 shadow-sm">
              <p className="text-[10px] text-dark-400 uppercase font-bold tracking-wider mb-1">Survival Runway</p>
              <p className={`text-xl font-black ${
                data.spendingLeaks.runwayDays <= 7 ? 'text-red-500' :
                data.spendingLeaks.runwayDays <= 14 ? 'text-amber-500' : 'text-primary'
              }`}>
                {data.spendingLeaks.runwayDays === 999 ? '∞' : `${data.spendingLeaks.runwayDays} Days`}
              </p>
              <p className="text-[11px] text-dark-500 mt-1">
                {data.spendingLeaks.runwayDays <= 7 ? '⚠️ Funds low! Slow down spending' : 'At current daily burn rate'}
              </p>
            </div>

            {/* Micro-spend Leaks */}
            <div className="bg-white rounded-2xl p-3 border border-dark-100 shadow-sm">
              <p className="text-[10px] text-dark-400 uppercase font-bold tracking-wider mb-1">Small Drains (&lt; Ksh 300)</p>
              <p className="text-xl font-black text-amber-600">
                KES {(data.spendingLeaks.microSpending?.total || 0).toLocaleString()}
              </p>
              <p className="text-[11px] text-dark-500 mt-1">
                {data.spendingLeaks.microSpending?.count || 0} purchases ({data.spendingLeaks.microSpending?.percentage || 0}% of total)
              </p>
            </div>
          </div>

          {/* Micro-spend Insight Banner */}
          {data.spendingLeaks.microSpending?.insight && (
            <div className={`rounded-xl px-3.5 py-2.5 text-xs font-medium flex items-center gap-2 mb-4 ${
              data.spendingLeaks.microSpending?.percentage > 25
                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}>
              <span>{data.spendingLeaks.microSpending?.percentage > 25 ? '⚠️' : '💡'}</span>
              <span>{data.spendingLeaks.microSpending?.insight}</span>
            </div>
          )}

          {/* Top Drains List */}
          {data.spendingLeaks.topDrains && data.spendingLeaks.topDrains.length > 0 && (
            <div>
              <p className="text-xs font-bold text-dark-600 uppercase tracking-wider mb-2">Top Money Drains</p>
              <div className="space-y-2">
                {data.spendingLeaks.topDrains.slice(0, 3).map((drain, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-white rounded-xl px-3 py-2 border border-dark-100">
                    <span className="font-semibold text-dark-700 truncate max-w-[200px]">{drain.payee}</span>
                    <span className="font-extrabold text-dark-900">KES {drain.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div variants={fadeUp}>
        <p className="section-title">Quick Actions</p>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { label: 'Add Entry', icon: '✏️', to: '/add', color: 'from-primary-50 to-primary-100', text: 'text-primary-700' },
            { label: 'Parse SMS', icon: '📱', to: '/parse-sms', color: 'from-blue-50 to-blue-100', text: 'text-blue-700' },
            { label: 'HELB Plan', icon: '🎓', to: '/helb', color: 'from-purple-50 to-purple-100', text: 'text-purple-700' },
            { label: 'Budget', icon: '📊', to: '/budget', color: 'from-amber-50 to-amber-100', text: 'text-amber-700' },
            { label: 'Recurring', icon: '🔁', to: '/recurring', color: 'from-emerald-50 to-emerald-100', text: 'text-emerald-700' },
            { label: 'Charts', icon: '📈', to: '/charts', color: 'from-indigo-50 to-indigo-100', text: 'text-indigo-700' },
          ].map((a) => (
            <button key={a.to} onClick={() => navigate(a.to)}
              className={`bg-gradient-to-br ${a.color} rounded-2xl p-4 flex flex-col items-center gap-2.5 transition-all duration-200 active:scale-95 hover:shadow-md`}>
              <span className="text-2xl">{a.icon}</span>
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
              <div key={i} className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  tx.type === 'income' ? 'bg-primary-100' : 'bg-dark-100'
                }`}>
                  <span className="text-lg">{tx.type === 'income' ? '💰' : '💸'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark-800 truncate">{tx.description}</p>
                  <p className="text-[10px] text-dark-400">{tx.category}</p>
                </div>
                <p className={`text-sm font-bold ${tx.type === 'income' ? 'text-primary-600' : 'text-dark-700'}`}>
                  {tx.type === 'income' ? '+' : '-'} KES {tx.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
