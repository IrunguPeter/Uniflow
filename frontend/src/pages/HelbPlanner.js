import React, { useState } from 'react';
import { helbCalculate } from '../services/financeApi';
import { motion, AnimatePresence } from 'framer-motion';

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function HelbPlanner() {
  const [totalLoan, setTotalLoan] = useState('');
  const [weeks, setWeeks] = useState('15');
  const [rent, setRent] = useState('');
  const [tuition, setTuition] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCalc = async (e) => {
    e.preventDefault();
    setError('');
    if (!totalLoan || Number(totalLoan) <= 0) return setError('Enter your total HELB loan');
    if (!weeks || Number(weeks) <= 0) return setError('Enter weeks per semester');
    setLoading(true);
    try {
      const fixedCosts = {};
      if (rent) fixedCosts.rent = Number(rent);
      if (tuition) fixedCosts.tuition = Number(tuition);
      const data = await helbCalculate(Number(totalLoan), Number(weeks), fixedCosts);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex items-center gap-3 pt-1">
        <div className="w-10 h-10 rounded-2xl gradient-cool flex items-center justify-center">
          <span className="text-lg">🎓</span>
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-secondary">HELB Planner</h1>
          <p className="text-xs text-muted">Plan your semester survival</p>
        </div>
      </div>

      <form onSubmit={handleCalc} className="card space-y-4">
        <div>
          <p className="section-title">Total Loan Amount</p>
          <div className="flex items-center gap-2 bg-surface-dim rounded-2xl px-4 py-3 border border-gray-200 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
            <span className="text-lg font-bold text-muted">KES</span>
            <input type="number" value={totalLoan} onChange={(e) => setTotalLoan(e.target.value)} placeholder="50,000"
              className="flex-1 bg-transparent text-2xl font-extrabold text-secondary focus:outline-none placeholder-gray-200
                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
          </div>
        </div>

        <div>
          <p className="section-title">Weeks in Semester</p>
          <input type="number" value={weeks} onChange={(e) => setWeeks(e.target.value)}
            className="input-field font-bold text-lg" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="section-title">Rent (optional)</p>
            <input type="number" value={rent} onChange={(e) => setRent(e.target.value)} placeholder="0"
              className="input-field text-sm" />
          </div>
          <div>
            <p className="section-title">Tuition (optional)</p>
            <input type="number" value={tuition} onChange={(e) => setTuition(e.target.value)} placeholder="0"
              className="input-field text-sm" />
          </div>
        </div>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-sm font-medium">{error}</motion.p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Calculating...' : 'Calculate Weekly Plan'}
        </button>
      </form>

      <AnimatePresence>
        {result && (
          <motion.div {...fadeUp} className="space-y-3">
            {/* Hero Result */}
            <div className="gradient-hero rounded-3xl p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -mr-8 -mt-8" />
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 -ml-6 -mb-6" />
              <div className="relative z-10 text-center">
                <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest mb-1">Weekly Allowance</p>
                <p className="text-5xl font-extrabold mb-1">KES {(result.weeklyAllowance || 0).toLocaleString()}</p>
                <p className="text-sm text-white/60">per week for {weeks} weeks</p>
              </div>
            </div>

            {/* Breakdown */}
            <div className="card">
              <p className="section-title mb-3">Allocation Breakdown</p>
              <div className="space-y-2">
                {result.breakdown && Object.entries(result.breakdown).map(([key, val], i) => {
                  const pct = totalLoan > 0 ? (val / Number(totalLoan) * 100).toFixed(0) : 0;
                  const colors = ['bg-primary', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500'];
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
                      <span className="text-sm text-secondary capitalize flex-1">{key}</span>
                      <span className="text-xs text-muted font-medium">{pct}%</span>
                      <span className="text-sm font-bold text-secondary">KES {val.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>

              {/* Progress bar visualization */}
              {result.breakdown && (
                <div className="mt-4 flex rounded-full overflow-hidden h-2.5">
                  {Object.entries(result.breakdown).map(([key, val], i) => {
                    const pct = totalLoan > 0 ? (val / Number(totalLoan) * 100) : 0;
                    const colors = ['bg-primary', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500'];
                    return <div key={key} className={`${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />;
                  })}
                </div>
              )}
            </div>

            {/* Fixed Costs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card text-center !py-5">
                <p className="text-[10px] text-muted font-bold uppercase tracking-widest mb-1">Total Fixed</p>
                <p className="text-xl font-extrabold text-secondary">KES {(result.totalFixedCosts || 0).toLocaleString()}</p>
              </div>
              {result.savingsBuffer !== undefined && (
                <div className="text-center !py-5 rounded-3xl" style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' }}>
                  <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mb-1">Savings Buffer</p>
                  <p className="text-xl font-extrabold text-amber-700">KES {result.savingsBuffer.toLocaleString()}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
