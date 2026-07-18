import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getPendingTransactions, categorizeTransaction, ignoreTransaction } from '../services/financeApi';

const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } }
};

const CATEGORIES = [
  { value: 'Food', icon: '🍕', color: 'bg-orange-100 text-orange-700' },
  { value: 'Transport', icon: '🚌', color: 'bg-blue-100 text-blue-700' },
  { value: 'Shopping', icon: '🛍️', color: 'bg-pink-100 text-pink-700' },
  { value: 'Bills', icon: '📱', color: 'bg-red-100 text-red-700' },
  { value: 'Entertainment', icon: '🎮', color: 'bg-purple-100 text-purple-700' },
  { value: 'Education', icon: '📚', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'Allowance', icon: '💰', color: 'bg-green-100 text-green-700' },
  { value: 'Savings', icon: '🐷', color: 'bg-teal-100 text-teal-700' },
  { value: 'Other', icon: '📦', color: 'bg-dark-100 text-dark-700' },
];

function PendingCard({ tx, onCategorize, onIgnore }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [description, setDescription] = useState(tx.suggestedDescription || '');
  const [submitting, setSubmitting] = useState(false);

  const handleCategorize = async () => {
    if (!selectedCategory) return;
    setSubmitting(true);
    try {
      await onCategorize(tx.id, selectedCategory, description);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div layout variants={fadeUp}
      className="card border border-dark-100 hover:border-dark-200 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
            tx.type === 'income' ? 'bg-primary-100' : 'bg-dark-100'
          }`}>
            <span className="text-lg">{tx.type === 'income' ? '💰' : '💸'}</span>
          </div>
          <div>
            <p className="text-sm font-bold text-dark-800">
              {tx.type === 'income' ? '+' : '-'} KES {tx.amount.toLocaleString()}
            </p>
            <p className="text-[10px] text-dark-400">
              {tx.counterparty || 'Unknown'} {tx.transactionReference ? `• ${tx.transactionReference}` : ''}
            </p>
          </div>
        </div>
        <span className="badge bg-amber-100 text-amber-700">Pending</span>
      </div>

      {/* Raw SMS preview */}
      <div className="bg-dark-50 rounded-xl px-3 py-2 mb-3">
        <p className="text-[10px] text-dark-500 font-mono leading-relaxed line-clamp-2">{tx.rawSms}</p>
      </div>

      {/* Description input */}
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What was this for?"
        className="w-full bg-dark-50 border border-dark-200 rounded-xl px-3 py-2 text-sm text-dark-800 placeholder:text-dark-400 mb-3 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent"
      />

      {/* Category grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {CATEGORIES.map((cat) => (
          <button key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
              selectedCategory === cat.value
                ? `${cat.color} ring-2 ring-offset-1 ring-current`
                : 'bg-dark-50 text-dark-500 hover:bg-dark-100'
            }`}>
            <span>{cat.icon}</span>
            <span>{cat.value}</span>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={handleCategorize}
          disabled={!selectedCategory || submitting}
          className="flex-1 btn-primary text-sm py-2.5 disabled:opacity-40 disabled:cursor-not-allowed">
          {submitting ? 'Saving...' : 'Categorize'}
        </button>
        <button onClick={() => onIgnore(tx.id)}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-dark-500 hover:bg-dark-100 transition">
          Ignore
        </button>
      </div>
    </motion.div>
  );
}

export default function PendingTransactions() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchPending = () => {
    getPendingTransactions()
      .then(setPending)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPending(); }, []);

  const handleCategorize = async (id, category, description) => {
    await categorizeTransaction(id, category, description);
    setPending((prev) => prev.filter((tx) => tx.id !== id));
  };

  const handleIgnore = async (id) => {
    await ignoreTransaction(id);
    setPending((prev) => prev.filter((tx) => tx.id !== id));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-12 rounded-2xl" />
        <div className="skeleton h-48 rounded-3xl" />
        <div className="skeleton h-48 rounded-3xl" />
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-5">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between pt-2">
        <div>
          <p className="text-[11px] text-dark-400 font-semibold uppercase tracking-widest mb-0.5">Categorize</p>
          <h1 className="text-2xl font-extrabold text-dark-900 tracking-tight">Pending Transactions</h1>
        </div>
        <button onClick={() => navigate('/')}
          className="text-xs font-bold text-dark-400 hover:text-dark-600 transition">
          ← Back
        </button>
      </motion.div>

      {pending.length === 0 ? (
        <motion.div variants={fadeUp} className="card text-center py-12">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <p className="text-dark-700 font-bold mb-1">All caught up!</p>
          <p className="text-sm text-dark-400 mb-4">No pending transactions to categorize</p>
          <button onClick={() => navigate('/parse-sms')}
            className="btn-primary text-sm px-6 py-2.5">
            Parse More SMS
          </button>
        </motion.div>
      ) : (
        <>
          <motion.div variants={fadeUp}
            className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-lg">⏳</span>
            <p className="text-xs font-semibold text-amber-800">
              {pending.length} transaction{pending.length !== 1 ? 's' : ''} need{pending.length === 1 ? 's' : ''} categorization
            </p>
          </motion.div>

          <AnimatePresence>
            {pending.map((tx) => (
              <PendingCard key={tx.id} tx={tx}
                onCategorize={handleCategorize}
                onIgnore={handleIgnore} />
            ))}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}
