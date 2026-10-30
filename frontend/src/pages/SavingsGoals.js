import React, { useEffect, useState } from 'react';
import {
  getSavingsGoals,
  createSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  contributeToSavingsGoal,
  getSavingsConfig,
  updateSavingsConfig
} from '../services/financeApi';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = ['Savings', 'Emergency Fund', 'Education', 'Travel', 'Gadget', 'Other'];

const stagger = { animate: { transition: { staggerChildren: 0.05 } } };
const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function SavingsGoals() {
  const [goals, setGoals] = useState([]);
  const [config, setConfig] = useState({ savingsPercentage: 0 });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    targetAmount: '',
    targetDate: '',
    category: 'Savings',
    isActive: true
  });
  const [contributingTo, setContributingTo] = useState(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([getSavingsGoals(false), getSavingsConfig()])
      .then(([goalsData, configData]) => {
        setGoals(goalsData);
        setConfig(configData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Goal name is required');
    if (!form.targetAmount || Number(form.targetAmount) <= 0) {
      return setError('Enter a valid target amount');
    }
    setAdding(true);
    try {
      await createSavingsGoal({
        ...form,
        targetAmount: Number(form.targetAmount)
      });
      setForm({ name: '', targetAmount: '', targetDate: '', category: 'Savings', isActive: true });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create goal');
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = async (id, changes) => {
    try {
      await updateSavingsGoal(id, changes);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update goal');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this savings goal?')) return;
    try {
      await deleteSavingsGoal(id);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete goal');
    }
  };

  const handleContribute = async (goalId) => {
    if (!contributeAmount || Number(contributeAmount) <= 0) {
      return setError('Enter a valid contribution amount');
    }
    setContributingTo(goalId);
    try {
      await contributeToSavingsGoal(goalId, Number(contributeAmount));
      setContributeAmount('');
      setContributingTo(null);
      load();
    } catch (err) {
      setContributingTo(null);
      setError(err.response?.data?.error || 'Failed to contribute');
    }
  };

  const handleSavingsPctChange = async (e) => {
    const val = Number(e.target.value);
    if (val < 0 || val > 100) return;
    try {
      await updateSavingsConfig(val);
      setConfig({ savingsPercentage: val });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update savings percentage');
    }
  };

  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;
  const activeGoals = goals.filter(g => g.isActive);
  const completedGoals = goals.filter(g => !g.isActive || g.currentAmount >= g.targetAmount);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="skeleton h-20 rounded-3xl" />
        <div className="skeleton h-16 rounded-3xl" />
      </div>
    );
  }

  const getCategoryColor = (cat) => {
    const map = {
      Savings: 'bg-pink-50 text-pink-600',
      'Emergency Fund': 'bg-emerald-50 text-emerald-600',
      Education: 'bg-blue-50 text-blue-600',
      Travel: 'bg-indigo-50 text-indigo-600',
      Gadget: 'bg-violet-50 text-violet-600',
      Other: 'bg-gray-50 text-gray-600'
    };
    return map[cat] || map.Other;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-extrabold text-secondary text-gradient">Savings Goals</h1>
          <p className="text-xs text-dark-400 font-semibold uppercase tracking-widest mt-0.5">
            Save a portion of your income toward a goal
          </p>
        </div>
        <button onClick={() => {}} className="hidden md:flex items-center gap-2 btn-outline px-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
            <path d="M12 12m-3 0a3 3 0 106 0a3 3 0 10-6 0" />
          </svg>
          Export Summary
        </button>
      </div>

      {/* Overall Progress Hero */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-[2.5rem] p-6 md:p-8 text-white gradient-hero">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 -ml-12 -mb-12" />
          <div className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full bg-white/5 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Overall Progress</p>
              <p className="text-3xl md:text-4xl font-extrabold tracking-tight">
                KES {totalSaved.toLocaleString()} <span className="text-xl font-bold text-white/80">/ KES {totalTarget.toLocaleString()}</span>
              </p>
            </div>
            <span className={`badge ${overallProgress >= 100 ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white'} font-bold text-[11px] px-3 py-1.5 rounded-full`}>
              {overallProgress}% to target
            </span>
          </div>
          <div className="relative w-full h-2.5 bg-white/20 rounded-full overflow-hidden mb-6">
            <div className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)]" style={{ width: `${Math.min(overallProgress, 100)}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-white/70 font-semibold mb-4">
            <span>Total Target: KES {totalTarget.toLocaleString()}</span>
            <span>Total Saved: KES {totalSaved.toLocaleString()}</span>
            <span>Remaining: KES {Math.max(0, totalTarget - totalSaved).toLocaleString()}</span>
          </div>
          {activeGoals.length > 0 && (
            <p className="text-xs text-white/60 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white/40 animate-pulse" />
              {activeGoals.length} active goal{activeGoals.length !== 1 ? 's' : ''} •
              {completedGoals.length} completed
            </p>
          )}
        </div>
      </motion.div>

      {/* Auto-Save Setting */}
      <motion.div variants={fadeUp} className="card-glow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-50 flex items-center justify-center">
              <span className="text-xl">🐷</span>
            </div>
            <div>
              <p className="text-sm font-bold text-dark-800">Auto-Save on Income</p>
              <p className="text-[10px] text-dark-400">Percentage of each income set aside</p>
            </div>
          </div>
          <span className={`badge ${config.savingsPercentage > 0 ? 'bg-pink-100 text-pink-700' : 'bg-dark-100 text-dark-400'}`}>
            {config.savingsPercentage || 0}%
          </span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-dark-600">Auto-save percentage</span>
            <span className="text-lg font-extrabold text-secondary">{config.savingsPercentage || 0}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            step="5"
            value={config.savingsPercentage || 0}
            onChange={handleSavingsPctChange}
            className="w-full h-2 bg-dark-200 rounded-full appearance-none cursor-pointer accent-primary"
          />
          <p className="text-[11px] text-dark-400 mt-2">
            When you log income, this portion is set aside toward your active savings goals
            (filled in order of creation). With no active goals it goes to a general savings buffer.
          </p>
        </div>
      </motion.div>

      {/* Add Goal Form */}
      <motion.div variants={fadeUp} className="card-glow space-y-3">
        <h2 className="text-sm font-bold text-dark-700 uppercase tracking-wider mb-1">Create a New Goal</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={form.name}
              onChange={set('name')}
              placeholder="e.g. Laptop, Emergency Fund, Trip to Mombasa"
              className="input-field"
            />
            <input
              type="number"
              value={form.targetAmount}
              onChange={set('targetAmount')}
              placeholder="Target amount (KES)"
              className="input-field text-right font-bold"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="date"
              value={form.targetDate}
              onChange={set('targetDate')}
              className="input-field"
            />
            <select
              value={form.category}
              onChange={set('category')}
              className="input-field text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 cursor-pointer py-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => setForm({ ...form, isActive: e.target.checked })}
                className="form-checkbox w-4 h-4 text-primary rounded border-dark-300 focus:ring-primary"
              />
              <span className="text-sm font-medium text-dark-600">Start as active</span>
            </label>
          </div>
          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-xs font-medium bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </motion.p>
          )}
          <button type="submit" disabled={adding} className="btn-glow w-full py-3">
            {adding ? 'Creating...' : '+ Create Goal'}
          </button>
        </form>
      </motion.div>

      {/* Goals List */}
      <motion.div variants={fadeUp}>
        <h2 className="text-sm font-bold text-dark-700 uppercase tracking-wider mb-3">Your Goals</h2>

        {goals.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <div className="w-24 h-24 rounded-full bg-dark-50 flex items-center justify-center mb-4 border border-dark-100">
              <span className="text-4xl">🎯</span>
            </div>
            <p className="font-bold text-secondary mb-1">No savings goals yet</p>
            <p className="text-sm text-muted mb-6">Create your first goal above and start saving toward it.</p>
            <button onClick={() => {}} className="btn-outline px-6 py-2.5 text-sm">
              Create your first goal
            </button>
          </div>
        ) : (
          <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-2">
            <AnimatePresence>
              {goals.map((goal) => {
                const progress = Math.min(goal.progress, 100);
                const isCompleted = goal.currentAmount >= goal.targetAmount;
                const isActive = goal.isActive;
                const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
                const catColor = getCategoryColor(goal.category);

                return (
                  <motion.div
                    key={goal.id}
                    variants={fadeUp}
                    layout
                    exit={{ opacity: 0, x: -80, transition: { duration: 0.2 } }}
                    className={`card-hover flex items-center gap-3 !p-3 border-l-4 ${
                      isCompleted
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : isActive
                        ? 'border-primary-500 bg-white'
                        : 'border-dark-200 bg-dark-50/50'
                    }`}>
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-100'
                        : isActive
                        ? 'bg-primary-50'
                        : 'bg-dark-100'
                    }`}>
                      <span className="text-lg">
                        {isCompleted ? '✅' : isActive ? '🎯' : '⏸️'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-sm font-bold text-secondary truncate ${
                          isCompleted ? 'line-through text-dark-300' : ''
                        }`}>{goal.name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-700'
                            : isActive
                            ? 'bg-primary-100 text-primary-700'
                            : 'bg-dark-100 text-dark-400'
                        }`}>
                          {isCompleted ? 'Completed' : isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-medium ${catColor}`}>{goal.category}</span>
                        {goal.targetDate && (
                          <span className="w-1 h-1 rounded-full bg-dark-300" />
                        )}
                        {goal.targetDate && (
                          <span className="text-[10px] text-muted">Target {new Date(goal.targetDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 w-36">
                      <div className="flex items-center gap-1 mb-1">
                        <span className={`text-xs font-extrabold ${
                          isCompleted ? 'text-emerald-700' : 'text-secondary'
                        }`}>KES {goal.currentAmount.toLocaleString()}</span>
                        <span className="text-[10px] text-muted">/ KES {goal.targetAmount.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1.5 bg-dark-100 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${progress}%`,
                            background: isCompleted
                              ? 'linear-gradient(to right, #10B981, #059669)'
                              : isActive
                              ? 'linear-gradient(to right, #10B981, #34D399)'
                              : '#CBD5E1'
                          }}
                        />
                      </div>
                      <p className={`text-[10px] font-bold ${
                        isCompleted ? 'text-emerald-700' : progress >= 75 ? 'text-amber-600' : 'text-dark-400'
                      }`}>
                        {isCompleted ? '✓ Goal reached' : remaining > 0 ? `KES {remaining.toLocaleString()} left` : ''}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1">
                      <button
                        onClick={() => setContributingTo(goal.id)}
                        disabled={contributingTo === goal.id || isCompleted}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all active:scale-90 ${
                          isCompleted || contributingTo === goal.id
                            ? 'bg-dark-200 text-dark-400'
                            : 'bg-primary-50 text-primary-600 hover:bg-primary-100 hover:shadow-md'
                        }`}
                      >
                        <span className="text-xs">+</span>
                      </button>
                      <button
                        onClick={() =>
                          handleUpdate(goal.id, { isActive: !isActive })
                        }
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all active:scale-90 bg-dark-50 text-dark-500 hover:bg-dark-100"
                        title={isActive ? 'Pause goal' : 'Resume goal'}
                      >
                        {isActive ? '⏸️' : '▶️'}
                      </button>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-bold text-red-400 bg-red-50 hover:bg-red-100 hover:text-red-500 transition-all active:scale-90"
                        title="Delete goal"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>

                    {/* Contribute input (inline when clicking +) */}
                    {contributingTo === goal.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 pt-3 border-t border-dark-100 flex gap-2"
                      >
                        <input
                          type="number"
                          value={contributeAmount}
                          onChange={e => setContributeAmount(e.target.value)}
                          placeholder="KES"
                          className="flex-1 input-field text-sm"
                        />
                        <button
                          onClick={() => handleContribute(goal.id)}
                          disabled={contributingTo !== goal.id}
                          className="btn-glow !py-2 px-4 text-xs whitespace-nowrap"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => { setContributingTo(null); setContributeAmount(''); }}
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-dark-400 hover:bg-dark-100 transition"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
