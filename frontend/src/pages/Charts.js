import React, { useEffect, useState } from 'react';
import { getChartData } from '../services/financeApi';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { motion } from 'framer-motion';

const COLORS = ['#00B97A', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#10B981', '#F97316', '#6366F1'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-secondary text-white text-xs font-medium px-3 py-2 rounded-xl shadow-lg">
      <p className="mb-1 text-white/60">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name}: KES {p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const stagger = { animate: { transition: { staggerChildren: 0.1 } } };

export default function Charts() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChartData().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      <div className="skeleton h-8 w-48 rounded-xl" />
      <div className="skeleton h-64 rounded-3xl" />
      <div className="skeleton h-64 rounded-3xl" />
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="text-5xl mb-4">📊</div>
      <p className="font-bold text-secondary">Could not load charts</p>
    </div>
  );

  const expensesByCategory = (data.byCategory || []).filter((c) => c.expense > 0).map((c) => ({ name: c.name, value: c.expense }));
  const incomeByCategory = (data.byCategory || []).filter((c) => c.income > 0).map((c) => ({ name: c.name, value: c.income }));
  const monthlyData = (data.byMonth || []).map((m) => ({ month: m.month.slice(5), Income: m.income, Expenses: m.expense }));
  const balanceTrend = (data.byMonth || []).map((m) => ({ month: m.month.slice(5), Balance: m.balance }));

  const hasData = expensesByCategory.length > 0 || incomeByCategory.length > 0;

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-5">
      <h1 className="text-xl font-extrabold text-secondary pt-1">Analytics</h1>

      {!hasData ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <span className="text-3xl">📊</span>
          </div>
          <p className="font-bold text-secondary mb-1">No data to chart yet</p>
          <p className="text-sm text-muted">Add transactions to see analytics</p>
        </div>
      ) : (
        <>
          {/* Expense Pie */}
          {expensesByCategory.length > 0 && (
            <motion.div variants={fadeUp} className="card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                  <span className="text-sm">💸</span>
                </div>
                <p className="text-sm font-bold text-secondary">Expense Breakdown</p>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    paddingAngle={3} strokeWidth={0}>
                    {expensesByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {expensesByCategory.slice(0, 6).map((c, i) => (
                  <div key={c.name} className="flex items-center gap-1.5 text-[10px] font-medium text-muted">
                    <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    {c.name}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Income Pie */}
          {incomeByCategory.length > 0 && (
            <motion.div variants={fadeUp} className="card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="text-sm">💰</span>
                </div>
                <p className="text-sm font-bold text-secondary">Income Sources</p>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={incomeByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    paddingAngle={3} strokeWidth={0}>
                    {incomeByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {incomeByCategory.slice(0, 6).map((c, i) => (
                  <div key={c.name} className="flex items-center gap-1.5 text-[10px] font-medium text-muted">
                    <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    {c.name}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Monthly Bar */}
          {monthlyData.length > 0 && (
            <motion.div variants={fadeUp} className="card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <span className="text-sm">📈</span>
                </div>
                <p className="text-sm font-bold text-secondary">Monthly Overview</p>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlyData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Income" fill="#00B97A" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#EF4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Balance Trend */}
          {balanceTrend.length > 0 && (
            <motion.div variants={fadeUp} className="card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
                  <span className="text-sm">📉</span>
                </div>
                <p className="text-sm font-bold text-secondary">Balance Trend</p>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={balanceTrend}>
                  <defs>
                    <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00B97A" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#00B97A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="Balance" stroke="#00B97A" strokeWidth={2.5}
                    dot={{ r: 4, fill: '#00B97A', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#00B97A', strokeWidth: 2, stroke: '#fff' }} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
