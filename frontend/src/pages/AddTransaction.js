import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addTransaction } from '../services/financeApi';
import { motion } from 'framer-motion';

const CATEGORIES = [
  { name: 'Food', icon: '🍽️' },
  { name: 'Transport', icon: '🚌' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Shopping', icon: '🛍️' },
  { name: 'Bills', icon: '📄' },
  { name: 'Health', icon: '💊' },
  { name: 'Education', icon: '📚' },
  { name: 'Savings', icon: '🐷' },
  { name: 'Allowance', icon: '💰' },
  { name: 'Salary', icon: '💼' },
  { name: 'Other', icon: '📌' },
];

const TYPES = [
  { key: 'expense', label: 'Expense', color: 'bg-red-500' },
  { key: 'income', label: 'Income', color: 'bg-primary' },
  { key: 'transfer', label: 'Transfer', color: 'bg-blue-500' },
];

const PROVIDERS = [
  { key: 'MPESA', label: 'M-Pesa', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { key: 'NCBA', label: 'NCBA', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { key: 'IM', label: 'I&M', color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { key: 'CASH', label: 'Cash', color: 'text-gray-600 bg-gray-50 border-gray-200' },
];

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function AddTransaction() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ amount: '', description: '', category: 'Food', type: 'expense', provider: 'MPESA' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.amount || Number(form.amount) <= 0) return setError('Enter a valid amount');
    if (!form.description.trim()) return setError('Enter a description');
    setSaving(true);
    try {
      await addTransaction({ ...form, amount: Number(form.amount) });
      navigate('/transactions');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex items-center gap-3 pt-1">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center transition active:scale-95">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-xl font-extrabold text-secondary">New Transaction</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type Picker */}
        <div>
          <p className="section-title">Type</p>
          <div className="flex gap-2">
            {TYPES.map((t) => (
              <button key={t.key} type="button" onClick={() => setForm({ ...form, type: t.key })}
                className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200 ${
                  form.type === t.key
                    ? `${t.color} text-white shadow-lg scale-[1.02]`
                    : 'bg-gray-100 text-muted hover:bg-gray-200'
                }`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount */}
        <div className="card text-center !py-8">
          <p className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Amount</p>
          <div className="flex items-center justify-center gap-1">
            <span className="text-2xl font-bold text-muted">KES</span>
            <input type="number" value={form.amount} onChange={set('amount')} placeholder="0"
              className="text-5xl font-extrabold text-secondary bg-transparent text-center w-48
                focus:outline-none placeholder-gray-200 [appearance:textfield]
                [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="section-title">Description</p>
          <input type="text" value={form.description} onChange={set('description')} placeholder="What was this for?"
            className="input-field" />
        </div>

        {/* Category Chips */}
        <div>
          <p className="section-title">Category</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c.name} type="button" onClick={() => setForm({ ...form, category: c.name })}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all duration-200 border ${
                  form.category === c.name
                    ? 'bg-primary text-white border-primary shadow-md scale-[1.03]'
                    : 'bg-white text-secondary border-gray-200 hover:border-gray-300'
                }`}>
                <span>{c.icon}</span>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Account */}
        <div>
          <p className="section-title">Account</p>
          <div className="grid grid-cols-4 gap-2">
            {PROVIDERS.map((p) => (
              <button key={p.key} type="button" onClick={() => setForm({ ...form, provider: p.key })}
                className={`py-3 rounded-2xl text-xs font-bold transition-all duration-200 border ${
                  form.provider === p.key
                    ? `${p.color} shadow-sm scale-[1.03]`
                    : 'bg-white text-muted border-gray-200 hover:border-gray-300'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-2">
            <span className="text-red-500">⚠️</span>
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </motion.div>
        )}

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Saving...
            </span>
          ) : 'Save Transaction'}
        </button>
      </form>
    </motion.div>
  );
}
