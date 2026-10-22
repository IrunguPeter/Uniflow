import React, { useEffect, useState } from 'react';
import { getTransactions, deleteTransaction, updateTransaction } from '../services/financeApi';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// The categories the app actually uses — they come from the keyword rules in
// mpesaParser.js, so the icons here line up with what the parser produces.
const CATEGORIES = [
  'Food & Dining', 'Groceries & Shopping', 'Transport', 'Utilities & Bills',
  'Airtime & Data', 'Rent & Housing', 'Education & Campus', 'Health & Pharmacy',
  'Entertainment & Leisure', 'Allowance & Gifts', 'Salary', 'HELB', 'Remittance',
  'Savings', 'Transfer', 'Other',
];

const categoryConfig = {
  'Food & Dining': { icon: '🍽️', color: 'bg-orange-100' },
  'Groceries & Shopping': { icon: '🛍️', color: 'bg-pink-100' },
  Transport: { icon: '🚌', color: 'bg-blue-100' },
  'Utilities & Bills': { icon: '📄', color: 'bg-yellow-100' },
  'Airtime & Data': { icon: '📶', color: 'bg-cyan-100' },
  'Rent & Housing': { icon: '🏠', color: 'bg-indigo-100' },
  'Education & Campus': { icon: '📚', color: 'bg-indigo-100' },
  'Health & Pharmacy': { icon: '💊', color: 'bg-red-100' },
  'Entertainment & Leisure': { icon: '🎬', color: 'bg-purple-100' },
  'Allowance & Gifts': { icon: '💰', color: 'bg-green-100' },
  Salary: { icon: '💼', color: 'bg-blue-100' },
  HELB: { icon: '🎓', color: 'bg-emerald-100' },
  Remittance: { icon: '🌍', color: 'bg-teal-100' },
  Savings: { icon: '🐷', color: 'bg-pink-100' },
  Transfer: { icon: '🔁', color: 'bg-emerald-100' },
  Other: { icon: '📌', color: 'bg-gray-100' },
  Uncategorized: { icon: '📌', color: 'bg-gray-100' },
};

const providerConfig = {
  MPESA: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-400' },
  NCBA: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400' },
  IM: { bg: 'bg-violet-50', text: 'text-violet-600', dot: 'bg-violet-400' },
  CASH: { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' },
};

const PROVIDERS = [
  { value: 'MPESA', label: 'M-Pesa' },
  { value: 'NCBA', label: 'NCBA' },
  { value: 'IM', label: 'I&M' },
  { value: 'CASH', label: 'Cash' },
];

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

/** Edit a logged transaction — amount, description, category and account. */
function EditTransactionModal({ transaction, onClose, onSaved }) {
  const [amount, setAmount] = useState(String(transaction.amount));
  const [description, setDescription] = useState(transaction.description || '');
  const [category, setCategory] = useState(transaction.category || 'Other');
  const [provider, setProvider] = useState(transaction.provider || 'CASH');
  const [toProvider, setToProvider] = useState(transaction.toProvider || '');
  const [type, setType] = useState(transaction.type || 'expense');
  const [error, setError] = useState('');
  const [shortfall, setShortfall] = useState(null);
  const [saving, setSaving] = useState(false);

  const isTransfer = type === 'transfer';

  const save = async (force = false) => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const changes = {
        amount: value,
        description: description.trim(),
        category: isTransfer ? 'Transfer' : category,
        type,
        provider,
        toProvider: isTransfer ? toProvider : null,
        force,
      };
      await updateTransaction(transaction.id, changes);
      onSaved();
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'INSUFFICIENT_FUNDS') {
        setShortfall(data);
      } else {
        setError(data?.error || 'Could not save the change');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-6"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="bg-white rounded-t-3xl sm:rounded-3xl p-5 w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold text-dark-400 uppercase tracking-widest">Edit transaction</p>
            <h3 className="text-lg font-bold text-secondary mt-0.5">{providerLabel(transaction.provider)} · KES {Number(transaction.amount).toLocaleString()}</h3>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition active:scale-95">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-dark-500 uppercase tracking-wider mb-1.5">Amount (KES)</label>
            <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setShortfall(null); }}
              className="input-field" />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-dark-500 uppercase tracking-wider mb-1.5">Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
              className="input-field" />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-dark-500 uppercase tracking-wider mb-1.5">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {['expense', 'income', 'transfer'].map((t) => (
                <button key={t} onClick={() => setType(t)}
                  className={`py-2 rounded-xl text-xs font-bold capitalize border-2 transition ${
                    type === t
                      ? 'border-primary bg-primary-50 text-primary-700'
                      : 'border-dark-100 text-dark-500 hover:border-dark-200'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {!isTransfer && (
            <div>
              <label className="block text-[11px] font-bold text-dark-500 uppercase tracking-wider mb-1.5">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-dark-500 uppercase tracking-wider mb-1.5">
                {isTransfer ? 'From' : 'Account'}
              </label>
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className="input-field">
                {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            {isTransfer && (
              <div>
                <label className="block text-[11px] font-bold text-dark-500 uppercase tracking-wider mb-1.5">To</label>
                <select value={toProvider} onChange={(e) => setToProvider(e.target.value)} className="input-field">
                  <option value="">Choose…</option>
                  {PROVIDERS.filter((p) => p.value !== provider).map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}

          {shortfall && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              <p className="text-xs font-semibold text-amber-800">
                {providerLabel(provider)} only has KES {Number(shortfall.available).toLocaleString()} tracked.
              </p>
              <button onClick={() => save(true)}
                className="mt-2 text-[11px] font-bold text-amber-800 underline">
                Save anyway
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-gray-100 text-secondary font-bold text-sm transition active:scale-95 hover:bg-gray-200">
            Cancel
          </button>
          <button onClick={() => save(false)} disabled={saving || (isTransfer && !toProvider)}
            className="flex-1 py-3 rounded-2xl bg-primary-500 text-white font-bold text-sm transition active:scale-95 hover:bg-primary-600 disabled:opacity-40">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Transactions() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
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

  /** Re-read the ledger after the AI (or an edit) touched it. */
  const refresh = () => getTransactions().then(setTxns).catch(console.error);

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
                        <button onClick={() => setEditTarget(tx)}
                          title="Edit transaction"
                          className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 hover:bg-primary-100 transition-all active:scale-90 flex-shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button onClick={() => setDeleteTarget(tx)}
                          title="Delete transaction"
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

      {/* Edit Modal */}
      <AnimatePresence>
        {editTarget && (
          <EditTransactionModal
            key="edit-modal"
            transaction={editTarget}
            onClose={() => setEditTarget(null)}
            onSaved={() => { setEditTarget(null); refresh(); }}
          />
        )}
      </AnimatePresence>

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
