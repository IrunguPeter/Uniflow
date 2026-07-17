import React, { useEffect, useState } from 'react';
import { getRecurringExpenses, addRecurringExpense, deleteRecurringExpense } from '../services/financeApi';
import { motion, AnimatePresence } from 'framer-motion';

const FREQUENCIES = [
  { key: 'weekly', label: 'Weekly', icon: '📅' },
  { key: 'monthly', label: 'Monthly', icon: '📆' },
  { key: 'semester', label: 'Semester', icon: '🎓' },
];

const EXPENSE_CATEGORIES = ['Rent', 'Food', 'Transport', 'Savings', 'Bills', 'Entertainment', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Allowance', 'Bonus', 'Freelance', 'Gift', 'Other'];

const freqMultiplier = { weekly: 4.33, monthly: 1, semester: 1 / 15 };
const freqColor = { weekly: 'bg-emerald-50 text-emerald-600', monthly: 'bg-blue-50 text-blue-600', semester: 'bg-violet-50 text-violet-600' };

const stagger = { animate: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function RecurringExpenses() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expense');
  const [form, setForm] = useState({ name: '', amount: '', frequency: 'monthly', category: 'Other' });
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const categories = activeTab === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const load = () => {
    setLoading(true);
    getRecurringExpenses().then(setItems).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Name required');
    if (!form.amount || Number(form.amount) <= 0) return setError('Enter valid amount');
    setAdding(true);
    try {
      await addRecurringExpense({ ...form, amount: Number(form.amount), type: activeTab });
      setForm({ name: '', amount: '', frequency: 'monthly', category: categories[0] });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteRecurringExpense(id);
    setItems(items.filter((i) => i.id !== id));
  };

  const filteredItems = items.filter(i => (i.type || 'expense') === activeTab);
  const totalWeekly = filteredItems.reduce((sum, item) => sum + (item.amount * (freqMultiplier[item.frequency] || 0)), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <h1 className="text-xl font-extrabold text-secondary pt-1">Recurring Entries</h1>

      {/* Type Tabs */}
      <div className="flex gap-2">
        <button onClick={() => { setActiveTab('expense'); setForm({ ...form, category: EXPENSE_CATEGORIES[0] }); }}
          className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200 ${
            activeTab === 'expense'
              ? 'bg-red-500 text-white shadow-lg scale-[1.02]'
              : 'bg-gray-100 text-muted hover:bg-gray-200'
          }`}>
          Expenses
        </button>
        <button onClick={() => { setActiveTab('income'); setForm({ ...form, category: INCOME_CATEGORIES[0] }); }}
          className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200 ${
            activeTab === 'income'
              ? 'bg-primary text-white shadow-lg scale-[1.02]'
              : 'bg-gray-100 text-muted hover:bg-gray-200'
          }`}>
          Income
        </button>
      </div>

      {/* Add Form */}
      <form onSubmit={handleAdd} className="card space-y-3">
        <div className="flex gap-2">
          <input type="text" value={form.name} onChange={set('name')} placeholder={activeTab === 'income' ? 'e.g. Salary, Bonus...' : 'e.g. Rent, Shopping...'}
            className="input-field flex-1" />
          <input type="number" value={form.amount} onChange={set('amount')} placeholder="KES"
            className="input-field w-28 text-right font-bold" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <select value={form.frequency} onChange={set('frequency')}
              className="input-field text-sm">
              {FREQUENCIES.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <select value={form.category} onChange={set('category')}
              className="input-field text-sm">
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button type="submit" disabled={adding}
            className="btn-primary !py-2.5 px-4 flex-shrink-0">
            {adding ? '...' : '+'}
          </button>
        </div>
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-xs font-medium">{error}</motion.p>
        )}
      </form>

      {/* Summary */}
      {filteredItems.length > 0 && (
        <div className={`rounded-3xl p-4 text-white relative overflow-hidden ${activeTab === 'income' ? 'gradient-hero' : 'bg-gradient-to-br from-gray-700 to-gray-900'}`}>
          <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-white/10 -mr-5 -mt-5" />
          <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest mb-1">
            Total Weekly {activeTab === 'income' ? 'Income' : 'Deduction'}
          </p>
          <p className="text-2xl font-extrabold">
            KES {Math.round(totalWeekly).toLocaleString()}<span className="text-sm font-medium text-white/60">/wk</span>
          </p>
          <p className="text-xs text-white/50 mt-1">{filteredItems.length} active {filteredItems.length === 1 ? 'entry' : 'entries'}</p>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <span className="text-2xl">{activeTab === 'income' ? '💸' : '🔁'}</span>
          </div>
          <p className="font-bold text-secondary mb-1">
            {activeTab === 'income' ? 'No recurring income' : 'No recurring expenses'}
          </p>
          <p className="text-sm text-muted">
            {activeTab === 'income' ? 'Add your regular income sources above' : 'Add your fixed costs above'}
          </p>
        </div>
      ) : (
        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2">
          <AnimatePresence>
            {filteredItems.map((item) => {
              const freqInfo = FREQUENCIES.find((f) => f.key === item.frequency) || FREQUENCIES[1];
              const isIncome = item.type === 'income';
              return (
                <motion.div key={item.id} variants={fadeUp} layout exit={{ opacity: 0, x: -80, transition: { duration: 0.2 } }}
                  className="card-hover flex items-center gap-3 !p-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${isIncome ? 'bg-primary/10' : 'bg-gray-50'}`}>
                    <span className="text-lg">{isIncome ? '💰' : freqInfo.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-secondary truncate">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted">{item.category}</span>
                      <span className={`badge ${freqColor[item.frequency]} !text-[9px] !px-1.5 !py-0`}>{item.frequency}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-center gap-2">
                    <div>
                      <p className={`text-sm font-extrabold ${isIncome ? 'text-primary' : 'text-secondary'}`}>
                        {isIncome ? '+' : '-'} KES {item.amount.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted">/{item.frequency === 'weekly' ? 'wk' : item.frequency === 'monthly' ? 'mo' : 'sem'}</p>
                    </div>
                    <button onClick={() => handleDelete(item.id)}
                      className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 hover:text-red-500 transition-all active:scale-90">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
