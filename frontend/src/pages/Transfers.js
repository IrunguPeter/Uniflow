import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getAccounts, getTransfers, createTransfer, deleteTransaction } from '../services/financeApi';

const ACCOUNT_STYLES = {
    MPESA: {
        active: 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm',
        idle: 'border-dark-100 bg-white text-dark-700 hover:border-emerald-200',
        dot: 'bg-emerald-400',
        text: 'text-emerald-600',
    },
    NCBA: {
        active: 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm',
        idle: 'border-dark-100 bg-white text-dark-700 hover:border-blue-200',
        dot: 'bg-blue-400',
        text: 'text-blue-600',
    },
    IM: {
        active: 'border-violet-500 bg-violet-50 text-violet-700 shadow-sm',
        idle: 'border-dark-100 bg-white text-dark-700 hover:border-violet-200',
        dot: 'bg-violet-400',
        text: 'text-violet-600',
    },
    CASH: {
        active: 'border-dark-400 bg-dark-100 text-dark-800 shadow-sm',
        idle: 'border-dark-100 bg-white text-dark-700 hover:border-dark-300',
        dot: 'bg-dark-400',
        text: 'text-dark-500',
    },
};

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
const stagger = { animate: { transition: { staggerChildren: 0.05 } } };

function formatMoney(value) {
    return `KES ${Number(value || 0).toLocaleString()}`;
}

export default function Transfers() {
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [from, setFrom] = useState('MPESA');
    const [to, setTo] = useState('CASH');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [shortfall, setShortfall] = useState(null);
    const [saving, setSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const load = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [accountData, transferData] = await Promise.all([getAccounts(), getTransfers()]);
            setAccounts(accountData.accounts || []);
            setTransfers(transferData || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const balanceOf = (provider) => accounts.find((a) => a.provider === provider)?.balance ?? 0;
    const labelOf = (provider) => accounts.find((a) => a.provider === provider)?.label || provider;

    const amountValue = Number(amount) || 0;

    const preview = useMemo(() => ({
        from: balanceOf(from) - amountValue,
        to: balanceOf(to) + amountValue,
    }), [accounts, from, to, amountValue]);

    const selectFrom = (provider) => {
        setFrom(provider);
        setShortfall(null);
        if (provider === to) {
            const next = accounts.find((a) => a.provider !== provider);
            if (next) setTo(next.provider);
        }
    };

    const selectTo = (provider) => {
        setTo(provider);
        setShortfall(null);
    };

    const swap = () => {
        setFrom(to);
        setTo(from);
        setShortfall(null);
    };

    const submit = async (force = false) => {
        if (!amountValue || amountValue <= 0) {
            setError('Enter a valid amount');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await createTransfer({
                from,
                to,
                amount: amountValue,
                description: note.trim() || undefined,
                force,
            });
            setAmount('');
            setNote('');
            setShortfall(null);
            await load(true);
        } catch (err) {
            const data = err.response?.data;
            if (data?.code === 'INSUFFICIENT_FUNDS') {
                setShortfall({ available: data.available, requested: data.requested });
                setError(null);
            } else {
                setError(data?.error || 'Failed to record transfer');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await deleteTransaction(deleteTarget.id);
            setTransfers((prev) => prev.filter((t) => t.id !== deleteTarget.id));
            setDeleteTarget(null);
            await load(true);
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="skeleton h-8 w-40 rounded-xl" />
                <div className="skeleton h-32 rounded-3xl" />
                <div className="skeleton h-48 rounded-3xl" />
            </div>
        );
    }

    return (
        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-5">
            {/* Header */}
            <motion.div variants={fadeUp} className="flex items-center gap-3 pt-1">
                <button onClick={() => navigate(-1)}
                    className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center transition active:scale-95">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <div>
                    <p className="text-[10px] font-bold text-dark-400 uppercase tracking-widest">Move money</p>
                    <h1 className="text-xl font-extrabold text-dark-900 tracking-tight">Transfer</h1>
                </div>
            </motion.div>

            {/* Balances + source picker */}
            <motion.div variants={fadeUp}>
                <p className="section-title">From account</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {accounts.map((account) => {
                        const style = ACCOUNT_STYLES[account.provider] || ACCOUNT_STYLES.CASH;
                        const isActive = from === account.provider;
                        return (
                            <button key={account.provider}
                                onClick={() => selectFrom(account.provider)}
                                className={`relative rounded-2xl border-2 p-3 text-left transition-all duration-200 active:scale-[0.98] ${
                                    isActive ? style.active : style.idle
                                }`}>
                                {isActive && (
                                    <motion.span layoutId="from-badge"
                                        className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />
                                )}
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-base">{account.icon}</span>
                                    <span className="text-xs font-bold">{account.label}</span>
                                </div>
                                <p className={`text-sm font-extrabold ${isActive ? '' : 'text-dark-800'}`}>
                                    {formatMoney(account.balance)}
                                </p>
                                <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1.5 ${style.dot}`} />
                            </button>
                        );
                    })}
                </div>
            </motion.div>

            {/* Destination */}
            <motion.div variants={fadeUp}>
                <div className="flex items-center justify-between mb-3">
                    <p className="section-title mb-0">To account</p>
                    <button onClick={swap}
                        className="flex items-center gap-1.5 text-[11px] font-bold text-primary-600 hover:text-primary-700 transition">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="17 1 21 5 17 9" />
                            <path d="M3 11V9a4 4 0 014-4h14" />
                            <polyline points="7 23 3 19 7 15" />
                            <path d="M21 13v2a4 4 0 01-4 4H3" />
                        </svg>
                        Swap
                    </button>
                </div>
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                    {accounts.filter((a) => a.provider !== from).map((account) => {
                        const style = ACCOUNT_STYLES[account.provider] || ACCOUNT_STYLES.CASH;
                        const isActive = to === account.provider;
                        return (
                            <button key={account.provider}
                                onClick={() => selectTo(account.provider)}
                                className={`py-3 rounded-2xl text-xs font-bold transition-all duration-200 border-2 active:scale-[0.98] ${
                                    isActive ? style.active : style.idle
                                }`}>
                                <span className="block text-base mb-0.5">{account.icon}</span>
                                {account.label}
                            </button>
                        );
                    })}
                </div>
            </motion.div>

            {/* Amount */}
            <motion.div variants={fadeUp} className="card text-center !py-8">
                <p className="text-xs font-bold text-muted uppercase tracking-widest mb-2">Amount</p>
                <div className="flex items-center justify-center gap-1">
                    <span className="text-2xl font-bold text-muted">KES</span>
                    <input type="number" value={amount} onChange={(e) => { setAmount(e.target.value); setShortfall(null); }} placeholder="0"
                        className="text-5xl font-extrabold text-secondary bg-transparent text-center w-48
                            focus:outline-none placeholder-gray-200 [appearance:textfield]
                            [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                </div>
                {amountValue > 0 && (
                    <p className="text-[11px] text-dark-400 mt-2">
                        {labelOf(from)} <span className="text-dark-300">→</span> {labelOf(to)}
                    </p>
                )}
            </motion.div>

            {/* Note */}
            <motion.div variants={fadeUp}>
                <p className="section-title">Note (optional)</p>
                <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. School fees, ATM withdrawal"
                    className="input-field" />
            </motion.div>

            {/* Preview */}
            {amountValue > 0 && (
                <motion.div variants={fadeUp}
                    className="rounded-3xl border border-primary-200/60 bg-gradient-to-br from-primary-50 to-white p-4">
                    <p className="text-[10px] font-bold text-primary-700 uppercase tracking-widest mb-3">After this transfer</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white/80 border border-primary-100 p-3">
                            <p className="text-[10px] text-dark-400 font-semibold uppercase tracking-wider">{labelOf(from)}</p>
                            <p className={`text-lg font-extrabold mt-0.5 ${preview.from < 0 ? 'text-red-500' : 'text-dark-800'}`}>
                                {formatMoney(preview.from)}
                            </p>
                        </div>
                        <div className="rounded-2xl bg-white/80 border border-primary-100 p-3">
                            <p className="text-[10px] text-dark-400 font-semibold uppercase tracking-wider">{labelOf(to)}</p>
                            <p className="text-lg font-extrabold text-primary-600 mt-0.5">{formatMoney(preview.to)}</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Messages */}
            {error && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                    <span className="text-red-500">⚠️</span>
                    <p className="text-red-600 text-sm font-medium">{error}</p>
                </motion.div>
            )}

            {shortfall && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                    <p className="text-amber-800 text-sm font-semibold">
                        {labelOf(from)} only has {formatMoney(shortfall.available)} tracked.
                    </p>
                    <p className="text-amber-700/80 text-xs mt-0.5">
                        Record it anyway if you have untracked money in that account.
                    </p>
                </motion.div>
            )}

            <motion.div variants={fadeUp}>
                <button onClick={() => submit(Boolean(shortfall))} disabled={saving || !amountValue}
                    className="btn-primary w-full disabled:opacity-40">
                    {saving ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            Recording...
                        </span>
                    ) : shortfall ? (
                        `Record ${formatMoney(amountValue)} anyway`
                    ) : (
                        `Transfer ${amountValue ? formatMoney(amountValue) : ''}`
                    )}
                </button>
            </motion.div>

            {/* Recent transfers */}
            <motion.div variants={fadeUp}>
                <div className="flex items-center justify-between mb-3">
                    <p className="section-title mb-0">Recent transfers</p>
                    <span className="text-[11px] font-semibold text-dark-400">{transfers.length} total</span>
                </div>

                {transfers.length === 0 ? (
                    <div className="card text-center py-10">
                        <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-3">
                            <span className="text-2xl">🔁</span>
                        </div>
                        <p className="text-sm font-bold text-dark-700 mb-1">No transfers yet</p>
                        <p className="text-xs text-dark-400">Move money between M-Pesa, your bank and cash</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <AnimatePresence initial={false}>
                            {transfers.map((transfer) => {
                                const fromStyle = ACCOUNT_STYLES[transfer.provider] || ACCOUNT_STYLES.CASH;
                                const toStyle = ACCOUNT_STYLES[transfer.toProvider] || ACCOUNT_STYLES.CASH;
                                return (
                                    <motion.div key={transfer.id} layout
                                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                                        className="card-hover flex items-center gap-3 !p-3">
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <span className={`w-2 h-2 rounded-full ${fromStyle.dot}`} />
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="5" y1="12" x2="19" y2="12" />
                                                <polyline points="12 5 19 12 12 19" />
                                            </svg>
                                            <span className={`w-2 h-2 rounded-full ${toStyle.dot}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-dark-800 truncate">
                                                {labelOf(transfer.provider)}
                                                <span className="text-dark-300 mx-1">→</span>
                                                {labelOf(transfer.toProvider)}
                                            </p>
                                            <p className="text-[10px] text-dark-400 truncate">
                                                {transfer.description}
                                                <span className="mx-1">•</span>
                                                {new Date(transfer.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <p className="text-sm font-extrabold text-primary-600">
                                                {formatMoney(transfer.amount)}
                                            </p>
                                            <button onClick={() => setDeleteTarget(transfer)}
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
                    </div>
                )}
            </motion.div>

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
                            <h3 className="text-lg font-bold text-dark-800 text-center mb-1">Delete transfer?</h3>
                            <p className="text-sm text-dark-400 text-center mb-6">
                                {labelOf(deleteTarget.provider)} → {labelOf(deleteTarget.toProvider)} — {formatMoney(deleteTarget.amount)}
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteTarget(null)}
                                    className="flex-1 py-3 rounded-2xl bg-dark-100 text-dark-700 font-bold text-sm transition active:scale-95 hover:bg-dark-200">
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
        </motion.div>
    );
}
