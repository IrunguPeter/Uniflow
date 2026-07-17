import React, { useEffect, useState } from 'react';
import { getBudgetPlan, saveBudgetPlan, deleteBudgetPlan, getSavingsConfig, updateSavingsConfig } from '../services/financeApi';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const ESSENTIAL_CATEGORIES = [
  { name: 'Rent', icon: '🏠' },
  { name: 'Food', icon: '🍽️' },
  { name: 'Transport', icon: '🚌' },
  { name: 'Bills', icon: '📄' },
  { name: 'Education', icon: '📚' },
  { name: 'Health', icon: '💊' },
];

const MISC_CATEGORIES = [
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Shopping', icon: '🛍️' },
  { name: 'Other', icon: '📌' },
];

const PERIODS = [
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'semester', label: 'Semester' },
];

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { animate: { transition: { staggerChildren: 0.08 } } };

export default function BudgetTool() {
  const [plan, setPlan] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [savingsPct, setSavingsPct] = useState(0);
  const [savingPct, setSavingPct] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    totalBudget: '',
    period: 'monthly',
    essentialsPct: 70,
    categories: []
  });

  const load = async () => {
    setLoading(true);
    try {
      const [planData, savingsData] = await Promise.all([
        getBudgetPlan(),
        getSavingsConfig()
      ]);
      if (planData && planData.plan) {
        setPlan(planData.plan);
        setSummary(planData.summary);
        setForm({
          totalBudget: planData.plan.totalBudget || '',
          period: planData.plan.period || 'monthly',
          essentialsPct: planData.plan.essentialsPct || 70,
          categories: planData.plan.categories || []
        });
      }
      setSavingsPct(savingsData.savingsPercentage || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSavePlan = async () => {
    if (!form.totalBudget || Number(form.totalBudget) <= 0) return;
    const miscPct = 100 - form.essentialsPct;
    try {
      const result = await saveBudgetPlan({
        totalBudget: Number(form.totalBudget),
        period: form.period,
        essentialsPct: form.essentialsPct,
        miscPct,
        categories: form.categories
      });
      setPlan(result);
      setEditing(false);
      load();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePlan = async () => {
    try {
      await deleteBudgetPlan();
      setPlan(null);
      setSummary(null);
      setForm({ totalBudget: '', period: 'monthly', essentialsPct: 70, categories: [] });
      setShowReset(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavingsUpdate = async () => {
    setSavingPct(true);
    try {
      await updateSavingsConfig(savingsPct);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPct(false);
    }
  };

  const updateCategory = (name, amount, isEssential) => {
    const existing = form.categories.find(c => c.name === name);
    if (existing) {
      setForm({
        ...form,
        categories: form.categories.map(c => c.name === name ? { ...c, amount: Number(amount) } : c)
      });
    } else {
      setForm({
        ...form,
        categories: [...form.categories, { name, amount: Number(amount), isEssential }]
      });
    }
  };

  const initCategories = () => {
    const cats = [
      ...ESSENTIAL_CATEGORIES.map(c => ({
        name: c.name,
        amount: form.totalBudget ? Math.round((Number(form.totalBudget) * (form.essentialsPct / 100)) / ESSENTIAL_CATEGORIES.length) : 0,
        isEssential: true
      })),
      ...MISC_CATEGORIES.map(c => ({
        name: c.name,
        amount: form.totalBudget ? Math.round((Number(form.totalBudget) * ((100 - form.essentialsPct) / 100)) / MISC_CATEGORIES.length) : 0,
        isEssential: false
      }))
    ];
    setForm({ ...form, categories: cats });
  };

  if (loading) return (
    <div className="space-y-4">
      <div className="skeleton h-8 w-48 rounded-xl" />
      <div className="skeleton h-40 rounded-3xl" />
      <div className="skeleton h-32 rounded-3xl" />
    </div>
  );

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-4">
      <div className="flex items-center gap-3 pt-1">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center transition active:scale-95">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-secondary">Budget Planner</h1>
          <p className="text-xs text-muted">Essentials + Headroom</p>
        </div>
      </div>

      {!plan && !editing ? (
        /* No plan — show setup */
        <motion.div variants={fadeUp} className="space-y-4">
          <div className="flex flex-col items-center py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-3xl">📊</span>
            </div>
            <p className="font-bold text-secondary mb-1">No budget plan yet</p>
            <p className="text-sm text-muted mb-6">Set up a budget to track essentials and headroom</p>
            <button onClick={() => { setEditing(true); initCategories(); }} className="btn-primary px-8">
              Create Budget Plan
            </button>
          </div>

          {/* Savings Config (standalone) */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center">
                <span className="text-sm">🐷</span>
              </div>
              <p className="text-sm font-bold text-secondary">Auto-Save from Income</p>
            </div>
            <p className="text-xs text-muted mb-3">Automatically set aside a percentage of every income transaction as savings.</p>
            <div className="flex items-center gap-3">
              <input type="range" min="0" max="50" step="5" value={savingsPct}
                onChange={(e) => setSavingsPct(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary" />
              <span className="text-lg font-extrabold text-secondary w-16 text-right">{savingsPct}%</span>
            </div>
            <button onClick={handleSavingsUpdate} disabled={savingPct}
              className="btn-primary w-full mt-3 !py-2.5">
              {savingPct ? 'Saving...' : 'Update Savings %'}
            </button>
          </div>
        </motion.div>
      ) : editing ? (
        /* Edit mode */
        <motion.div variants={fadeUp} className="space-y-4">
          {/* Total Budget */}
          <div className="card">
            <p className="section-title">Total Budget</p>
            <div className="flex items-center gap-2 bg-surface-dim rounded-2xl px-4 py-3 border border-gray-200 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
              <span className="text-lg font-bold text-muted">KES</span>
              <input type="number" value={form.totalBudget} onChange={(e) => setForm({ ...form, totalBudget: e.target.value })}
                placeholder="e.g. 25000"
                className="flex-1 bg-transparent text-2xl font-extrabold text-secondary focus:outline-none placeholder-gray-200
                  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
            </div>
          </div>

          {/* Period */}
          <div className="card">
            <p className="section-title">Period</p>
            <div className="flex gap-2">
              {PERIODS.map((p) => (
                <button key={p.key} onClick={() => setForm({ ...form, period: p.key })}
                  className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200 ${
                    form.period === p.key
                      ? 'bg-primary text-white shadow-lg scale-[1.02]'
                      : 'bg-gray-100 text-muted hover:bg-gray-200'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Essentials/Misc Split */}
          <div className="card">
            <p className="section-title">Budget Split</p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-primary">Essentials</span>
              <span className="text-sm font-extrabold text-secondary">{form.essentialsPct}%</span>
            </div>
            <input type="range" min="50" max="90" step="5" value={form.essentialsPct}
              onChange={(e) => setForm({ ...form, essentialsPct: Number(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary mb-2" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-muted">Miscellaneous</span>
              <span className="text-sm font-extrabold text-muted">{100 - form.essentialsPct}%</span>
            </div>
            <div className="flex rounded-full overflow-hidden h-2.5 mt-3">
              <div className="bg-primary" style={{ width: `${form.essentialsPct}%` }} />
              <div className="bg-amber-400" style={{ width: `${100 - form.essentialsPct}%` }} />
            </div>
          </div>

          {/* Category Budgets */}
          {form.categories.length > 0 && (
            <div className="card">
              <p className="section-title">Category Budgets</p>
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Essentials</p>
                {form.categories.filter(c => c.isEssential).map((cat) => {
                  const catInfo = ESSENTIAL_CATEGORIES.find(c => c.name === cat.name);
                  return (
                    <div key={cat.name} className="flex items-center gap-3">
                      <span className="text-lg">{catInfo?.icon || '📌'}</span>
                      <span className="text-sm font-bold text-secondary flex-1">{cat.name}</span>
                      <input type="number" value={cat.amount} onChange={(e) => updateCategory(cat.name, e.target.value, true)}
                        className="w-24 text-right input-field !py-1.5 !text-sm font-bold" />
                    </div>
                  );
                })}
                <p className="text-[10px] font-bold text-muted uppercase tracking-widest mt-2">Miscellaneous</p>
                {form.categories.filter(c => !c.isEssential).map((cat) => {
                  const catInfo = MISC_CATEGORIES.find(c => c.name === cat.name);
                  return (
                    <div key={cat.name} className="flex items-center gap-3">
                      <span className="text-lg">{catInfo?.icon || '📌'}</span>
                      <span className="text-sm font-bold text-secondary flex-1">{cat.name}</span>
                      <input type="number" value={cat.amount} onChange={(e) => updateCategory(cat.name, e.target.value, false)}
                        className="w-24 text-right input-field !py-1.5 !text-sm font-bold" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => { setEditing(false); if (!plan) load(); }}
              className="flex-1 py-3 rounded-2xl bg-gray-100 text-secondary font-bold text-sm transition active:scale-95">
              Cancel
            </button>
            <button onClick={handleSavePlan} className="flex-1 btn-primary">
              Save Plan
            </button>
          </div>
        </motion.div>
      ) : (
        /* View mode */
        <motion.div variants={fadeUp} className="space-y-4">
          {/* Summary Hero */}
          <div className="gradient-hero rounded-3xl p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -mr-10 -mt-10" />
            <div className="relative z-10">
              <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest mb-1">
                {plan.period} Budget
              </p>
              <p className="text-4xl font-extrabold tracking-tight mb-1">
                KES {(summary?.totalBudget || 0).toLocaleString()}
              </p>
              <p className="text-sm text-white/70">
                Spent: KES {(summary?.totalSpent || 0).toLocaleString()} | Remaining: KES {(summary?.totalRemaining || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Essentials vs Misc */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card text-center !py-5">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-lg">✅</span>
              </div>
              <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Essentials</p>
              <p className="text-xl font-extrabold text-primary">KES {(summary?.essentials?.spent || 0).toLocaleString()}</p>
              <p className="text-[10px] text-muted">of KES {(summary?.essentials?.budget || 0).toLocaleString()}</p>
              <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                <div className={`h-full rounded-full ${summary?.essentials?.percentageUsed >= 100 ? 'bg-red-500' : summary?.essentials?.percentageUsed >= 80 ? 'bg-amber-400' : 'bg-primary'}`}
                  style={{ width: `${Math.min(summary?.essentials?.percentageUsed || 0, 100)}%` }} />
              </div>
            </div>
            <div className="card text-center !py-5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-2">
                <span className="text-lg">🎯</span>
              </div>
              <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Headroom</p>
              <p className="text-xl font-extrabold text-amber-600">KES {(summary?.miscellaneous?.spent || 0).toLocaleString()}</p>
              <p className="text-[10px] text-muted">of KES {(summary?.miscellaneous?.budget || 0).toLocaleString()}</p>
              <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                <div className={`h-full rounded-full ${summary?.miscellaneous?.percentageUsed >= 100 ? 'bg-red-500' : summary?.miscellaneous?.percentageUsed >= 80 ? 'bg-amber-400' : 'bg-amber-400'}`}
                  style={{ width: `${Math.min(summary?.miscellaneous?.percentageUsed || 0, 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          {summary?.categoryDetails && summary.categoryDetails.length > 0 && (
            <div className="card">
              <p className="section-title">Category Breakdown</p>
              <div className="space-y-3">
                {summary.categoryDetails.map((cat) => (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-secondary">{cat.name}</span>
                      <span className="text-xs text-muted">
                        KES {cat.spent.toLocaleString()} / {cat.budgeted.toLocaleString()}
                      </span>
                    </div>
                    <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${cat.percentageUsed >= 100 ? 'bg-red-500' : cat.percentageUsed >= 80 ? 'bg-amber-400' : cat.isEssential ? 'bg-primary' : 'bg-blue-400'}`}
                        style={{ width: `${Math.min(cat.percentageUsed, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Auto-Save */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center">
                <span className="text-sm">🐷</span>
              </div>
              <p className="text-sm font-bold text-secondary">Auto-Save</p>
            </div>
            <div className="flex items-center gap-3">
              <input type="range" min="0" max="50" step="5" value={savingsPct}
                onChange={(e) => setSavingsPct(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary" />
              <span className="text-lg font-extrabold text-secondary w-16 text-right">{savingsPct}%</span>
            </div>
            <button onClick={handleSavingsUpdate} disabled={savingPct}
              className="btn-secondary w-full mt-2 !py-2">
              {savingPct ? 'Saving...' : 'Update'}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button onClick={() => setEditing(true)}
              className="flex-1 py-3 rounded-2xl bg-gray-100 text-secondary font-bold text-sm transition active:scale-95 hover:bg-gray-200">
              Edit Plan
            </button>
            <button onClick={() => setShowReset(true)}
              className="flex-1 py-3 rounded-2xl bg-red-50 text-red-500 font-bold text-sm transition active:scale-95 hover:bg-red-100">
              Reset Plan
            </button>
          </div>

          {/* Reset Confirm */}
          <AnimatePresence>
            {showReset && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center px-6"
                style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
                  <h3 className="text-lg font-bold text-secondary text-center mb-1">Reset Budget?</h3>
                  <p className="text-sm text-muted text-center mb-6">This will delete your current budget plan.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setShowReset(false)}
                      className="flex-1 py-3 rounded-2xl bg-gray-100 text-secondary font-bold text-sm transition active:scale-95">
                      Cancel
                    </button>
                    <button onClick={handleDeletePlan}
                      className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm transition active:scale-95">
                      Reset
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
