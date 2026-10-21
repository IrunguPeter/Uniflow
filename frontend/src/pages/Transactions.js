import React, { useEffect, useState } from 'react';
import { getTransactions, deleteTransaction } from '../services/financeApi';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const categoryConfig = {
  Food: { icon: '🍽️', color: 'bg-orange-100' },
  Transport: { icon: '🚌', color: 'bg-blue-100' },
  Entertainment: { icon: '🎬', color: 'bg-purple-100' },
  Shopping: { icon: '🛍️', color: 'bg-pink-100' },
  Bills: { icon: '📄', color: 'bg-yellow-100' },
  Health: { icon: '💊', color: 'bg-red-100' },
  Education: { icon: '📚', color: 'bg-indigo-100' },
  Allowance: { icon: '💰', color: 'bg-green-100' },
  Salary: { icon: '💼', color: 'bg-blue-100' },
  Savings: { icon: '🐷', color: 'bg-pink-100' },
  Transfer: { icon: '🔁', color: 'bg-emerald-100' },
  Other: { icon: '📌', color: 'bg-gray-100' },
};

const providerConfig = {
  MPESA: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-400' },
  NCBA: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400' },
  IM: { bg: 'bg-violet-50', text: 'text-violet-600', dot: 'bg-violet-400' },
  CASH: { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' },
};

const providerLabel = (provider) => {
  if (provider === 'IM') return 'I&M';
  if (provider === 'MPESA') return 'M-Pesa';
  return provider;
};

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'MPESA', label: 'M-Pesa' },
  { key: 'bank', label: 'Bank' },
  { key: 'CASH', label: 'Cash' },
];

function matchesFilter(tx, filter) {
  if (filter === 'all') return true;
  const accounts = tx.type === 'transfer' ? [tx.provider, tx.toProvider] : [tx.provider];
  if (filter === 'bank') return accounts.some((a) => a === 'NCBA' || a === 'IM');
  return accounts.includes(filter);
}

function groupByDate(txns) {
  const groups = {};
  txns.forEach((tx) => {
    const d = new Date(tx.timestamp);
    const key = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  });
  return Object.entries(groups);
}

const stagger = { animate: { transition: { staggerChildren: 0.04 } } };
const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function Transactions() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getTransactions().then(setTxns).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTransaction(deleteTarget.id);
      setTxns(txns.filter(t => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return (
    <div className="space-y-4">
      <div className="skeleton h-8 w-40 rounded-xl" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="skeleton h-16 rounded-2xl" />
      ))}
    </div>
  );

  const filtered = txns.filter(tx => matchesFilter(tx, filter));
  const grouped = groupByDate(filtered);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-xl font-extrabold text-secondary">Transactions</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/transfer')}
            className="flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 014-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 01-4 4H3" />
            </svg>
            Transfer
          </button>
          <button onClick={() => navigate('/add')}
            className="bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95">
            + Add New
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {FILTER_TABS.map((tab) => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-200 ${
              filter === tab.key
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-muted hover:bg-gray-200'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <span className="text-3xl">📒</span>
          </div>
          <p className="font-bold text-secondary mb-1">
            {filter === 'all' ? 'No transactions yet' : `No ${FILTER_TABS.find(t => t.key === filter)?.label} transactions`}
          </p>
          <p className="text-sm text-muted mb-4">Start tracking your spending</p>
          <button onClick={() => navigate('/add')} className="btn-primary px-6">
            Add First Transaction
          </button>
        </motion.div>
      ) : (
        <motion.div variants={stagger} initial="initial" animate="animate">
          {grouped.map(([date, items]) => (
            <div key={date} className="mb-4">
              <p className="text-[11px] font-bold text-muted uppercase tracking-widest mb-2 pl-1">{date}</p>
              <div className="space-y-2">
                {items.map((tx) => {
                  const cat = categoryConfig[tx.category] || categoryConfig.Other;
                  const prov = providerConfig[tx.provider] || providerConfig.CASH;
                  return (
                    <motion.div key={tx.id} variants={fadeUp}
                      className="card-hover flex items-center gap-3 !p-3">
                      <div className={`w-11 h-11 rounded-2xl ${cat.color} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-lg">{cat.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-secondary truncate">{tx.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {tx.type === 'transfer' ? (
                            <>
                              <span className="text-[10px] font-bold text-primary-600">Transfer</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300" />
                              <span className={`text-[10px] ${prov.text}`}>{providerLabel(tx.provider)}</span>
                              <span className="text-[10px] text-gray-400">→</span>
                              <span className={`text-[10px] ${(providerConfig[tx.toProvider] || providerConfig.CASH).text}`}>
                                {providerLabel(tx.toProvider)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-[10px] text-muted">{tx.category}</span>
                              <span className="w-1 h-1 rounded-full bg-gray-300" />
                              <span className={`text-[10px] ${prov.text}`}>{providerLabel(tx.provider)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 flex items-center gap-2">
                        <div>
                          {tx.type === 'transfer' ? (
                            <p className="text-sm font-extrabold text-primary">KES {tx.amount.toLocaleString()}</p>
                          ) : (
                            <p className={`text-sm font-extrabold ${tx.type === 'income' ? 'text-primary' : 'text-secondary'}`}>
                              {tx.type === 'income' ? '+' : '-'} KES {tx.amount.toLocaleString()}
                            </p>
                          )}
                          <p className="text-[10px] text-muted mt-0.5">
                            {new Date(tx.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button onClick={() => setDeleteTarget(tx)}
                          className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 hover:text-red-500 transition-all active:scale-90 flex-shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-secondary text-center mb-1">Delete Transaction?</h3>
              <p className="text-sm text-muted text-center mb-6">
                {deleteTarget.description} — KES {deleteTarget.amount.toLocaleString()}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-3 rounded-2xl bg-gray-100 text-secondary font-bold text-sm transition active:scale-95 hover:bg-gray-200">
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm transition active:scale-95 hover:bg-red-600 disabled:opacity-40">
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
