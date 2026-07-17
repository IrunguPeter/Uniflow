import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseSms } from '../services/financeApi';
import { motion, AnimatePresence } from 'framer-motion';

const SAMPLE_SMS = `Till Number 462987 Confirmed. KSh1,200.00 sent to GEORGE OTIENO on 15/01/26 at 2:30 PM. M-Pesa transaction cost KSh0.00. New M-Pesa balance KSh4,500.00. Transaction code, QKH7B6GKZ4.`;

export default function ParseSms() {
  const [sms, setSms] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [parsing, setParsing] = useState(false);
  const navigate = useNavigate();

  const handleParse = async () => {
    setError('');
    setResult(null);
    if (!sms.trim()) return setError('Paste an M-Pesa SMS first');
    setParsing(true);
    try {
      const data = await parseSms(sms.trim());
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to parse SMS');
    } finally {
      setParsing(false);
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
        <h1 className="text-xl font-extrabold text-secondary">M-Pesa Parser</h1>
      </div>

      {/* Phone mockup */}
      <div className="relative">
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-gray-300 rounded-full" />
        <div className="card !p-0 overflow-hidden border border-gray-200/80">
          <div className="bg-gradient-to-r from-green-600 to-green-500 px-4 py-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-sm">📱</span>
            </div>
            <div>
              <p className="text-white text-xs font-bold">M-Pesa SMS</p>
              <p className="text-white/60 text-[10px]">Safaricom</p>
            </div>
          </div>
          <div className="p-4">
            <textarea
              value={sms}
              onChange={(e) => setSms(e.target.value)}
              rows={5}
              placeholder="Paste your Safaricom M-Pesa notification here..."
              className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm text-secondary placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-medium leading-relaxed border border-gray-100"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={handleParse} disabled={parsing} className="btn-primary flex-1">
          {parsing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Parsing...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
                <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" />
              </svg>
              Parse & Log
            </span>
          )}
        </button>
        <button onClick={() => setSms(SAMPLE_SMS)} className="btn-secondary px-4">
          Try Sample
        </button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
            className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm">✕</span>
            </div>
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </motion.div>
        )}

        {result && (
          <motion.div initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
            className="relative overflow-hidden rounded-3xl border border-emerald-200"
            style={{ background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-primary/10 -mr-10 -mt-10" />
            <div className="relative z-10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="font-bold text-primary text-sm">Parsed Successfully</p>
              </div>

              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted font-medium">Type</span>
                  <span className="badge bg-primary/10 text-primary capitalize">{result.parsed.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted font-medium">Amount</span>
                  <span className="text-lg font-extrabold text-secondary">KES {result.parsed.amount?.toLocaleString()}</span>
                </div>
                {result.parsed.recipient && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted font-medium">To</span>
                    <span className="text-sm font-bold text-secondary">{result.parsed.recipient}</span>
                  </div>
                )}
                {result.parsed.sender && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted font-medium">From</span>
                    <span className="text-sm font-bold text-secondary">{result.parsed.sender}</span>
                  </div>
                )}
                {result.parsed.ref && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted font-medium">Reference</span>
                    <span className="text-xs font-mono font-bold text-muted bg-gray-100 px-2 py-0.5 rounded-lg">{result.parsed.ref}</span>
                  </div>
                )}
              </div>

              <button onClick={() => navigate('/transactions')}
                className="mt-4 w-full bg-primary/10 text-primary py-2.5 rounded-2xl text-sm font-bold transition active:scale-98">
                View in Ledger →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
