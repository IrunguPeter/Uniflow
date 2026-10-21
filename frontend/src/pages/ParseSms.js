import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseSms, parseBatchSms } from '../services/financeApi';
import { motion, AnimatePresence } from 'framer-motion';

const SAMPLE_SINGLE_SMS = `Till Number 462987 Confirmed. KSh1,200.00 sent to GEORGE OTIENO on 15/01/26 at 2:30 PM. M-Pesa transaction cost KSh0.00. New M-Pesa balance KSh4,500.00. Transaction code, QKH7B6GKZ4.`;

const SAMPLE_BATCH_SMS = `UE5JK2ZT6H Confirmed. Ksh50.00 sent to SAMUEL MALOI on 5/5/26 at 7:27 AM. New M-PESA balance is Ksh731.40. Transaction cost, Ksh0.00.

ABC123XYZ Confirmed. Ksh350.00 paid to KPLC PREPAID on 17/7/26 at 11:00 AM. New M-PESA balance is Ksh5,000.00.

XYZ999 Confirmed. Ksh2,500.00 received from MOM on 18/7/26 at 10:15 AM. New M-PESA balance is Ksh7,500.00.`;

export default function ParseSms() {
  const [tab, setTab] = useState('single'); // 'single' | 'batch'
  const [sms, setSms] = useState('');
  const [batchText, setBatchText] = useState('');
  const [autoConfirm, setAutoConfirm] = useState(true);
  const [result, setResult] = useState(null);
  const [batchResult, setBatchResult] = useState(null);
  const [error, setError] = useState('');
  const [parsing, setParsing] = useState(false);
  const navigate = useNavigate();

  const handleParseSingle = async () => {
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

  const handleParseBatch = async () => {
    setError('');
    setBatchResult(null);
    if (!batchText.trim()) return setError('Paste multiple M-Pesa messages first');
    setParsing(true);
    try {
      const data = await parseBatchSms(batchText.trim(), autoConfirm);
      setBatchResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to parse batch messages');
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
        <div>
          <h1 className="text-xl font-extrabold text-secondary">M-Pesa SMS Importer</h1>
          <p className="text-xs text-muted">Auto-categorizes food, utilities, transport & allowances</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-2xl">
        <button
          onClick={() => { setTab('single'); setError(''); }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
            tab === 'single' ? 'bg-white text-secondary shadow-sm' : 'text-gray-500 hover:text-secondary'
          }`}>
          Single SMS
        </button>
        <button
          onClick={() => { setTab('batch'); setError(''); }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
            tab === 'batch' ? 'bg-white text-secondary shadow-sm' : 'text-gray-500 hover:text-secondary'
          }`}>
          Batch Import (Multiple SMS)
        </button>
      </div>

      {tab === 'single' ? (
        <>
          {/* Phone mockup */}
          <div className="relative">
            <div className="card !p-0 overflow-hidden border border-gray-200/80">
              <div className="bg-gradient-to-r from-green-600 to-green-500 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-sm">📱</span>
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold">M-Pesa SMS</p>
                    <p className="text-white/60 text-[10px]">Safaricom notification</p>
                  </div>
                </div>
                <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full">
                  Instant Auto-Tag
                </span>
              </div>
              <div className="p-4">
                <textarea
                  value={sms}
                  onChange={(e) => setSms(e.target.value)}
                  rows={4}
                  placeholder="Paste your Safaricom M-Pesa notification here..."
                  className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm text-secondary placeholder-gray-400
                    focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-medium leading-relaxed border border-gray-100"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleParseSingle} disabled={parsing} className="btn-primary flex-1">
              {parsing ? 'Parsing...' : 'Parse & Save'}
            </button>
            <button onClick={() => setSms(SAMPLE_SINGLE_SMS)} className="btn-secondary px-4 text-xs font-bold">
              Try Sample
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Batch Mode */}
          <div className="card !p-0 overflow-hidden border border-gray-200/80">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-sm">📥</span>
                </div>
                <div>
                  <p className="text-white text-xs font-bold">Batch SMS Dump</p>
                  <p className="text-white/60 text-[10px]">Paste multiple messages at once</p>
                </div>
              </div>
              <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full">
                Bulk
              </span>
            </div>
            <div className="p-4 space-y-3">
              <textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                rows={6}
                placeholder="Paste several M-Pesa SMS messages here. Separate them with newlines or copy-paste directly from your phone..."
                className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm text-secondary placeholder-gray-400
                  focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-medium leading-relaxed border border-gray-100"
              />
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-secondary">
                <input
                  type="checkbox"
                  checked={autoConfirm}
                  onChange={(e) => setAutoConfirm(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                Auto-confirm directly into ledger (skip pending queue)
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleParseBatch} disabled={parsing} className="btn-primary flex-1">
              {parsing ? 'Importing Batch...' : 'Import All Messages'}
            </button>
            <button onClick={() => setBatchText(SAMPLE_BATCH_SMS)} className="btn-secondary px-4 text-xs font-bold">
              Try Sample Batch
            </button>
          </div>
        </>
      )}

      {/* Error Banner */}
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

        {/* Batch Result View */}
        {batchResult && (
          <motion.div initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
            className="card bg-emerald-50 border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800">
              <span className="text-xl">✅</span>
              <div>
                <p className="font-extrabold text-sm">Batch Processed Successfully!</p>
                <p className="text-xs text-emerald-700">
                  Detected {batchResult.totalParsed} messages • {batchResult.logged} logged directly • {batchResult.skipped} already in database
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              {batchResult.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white rounded-xl px-3 py-2 text-xs border border-emerald-100">
                  <div className="truncate max-w-[200px]">
                    <p className="font-bold text-dark-800 truncate">{item.description}</p>
                    <span className="text-[10px] text-muted">{item.category}</span>
                  </div>
                  <span className={`font-black ${item.type === 'transfer' ? 'text-primary' : item.type === 'income' ? 'text-primary' : 'text-dark-800'}`}>
                    {item.type === 'transfer' ? '' : item.type === 'income' ? '+' : '-'} KES {item.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <button onClick={() => navigate('/transactions')}
              className="w-full btn-primary !bg-emerald-600 hover:!bg-emerald-700 text-sm">
              View Transactions Ledger →
            </button>
          </motion.div>
        )}

        {/* Single SMS Pending View */}
        {result?.pending && (
          <motion.div initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
            className="relative overflow-hidden rounded-3xl border border-amber-200"
            style={{ background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)' }}>
            <div className="relative z-10 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="font-bold text-amber-900 text-sm">Parsed & Logged</p>
                    <p className="text-[11px] text-amber-700">Ref: {result.transaction?.transactionReference}</p>
                  </div>
                </div>
                {result.parsedDetails?.suggestedCategory && (
                  <span className="badge bg-amber-200 text-amber-900 font-bold text-xs">
                    Tag: {result.parsedDetails.suggestedCategory}
                  </span>
                )}
              </div>

              <div className="bg-white/80 rounded-2xl p-3 mb-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount:</span>
                  <span className="font-extrabold text-dark-900">KES {result.transaction?.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Target:</span>
                  <span className="font-semibold text-dark-800">{result.transaction?.counterparty || result.transaction?.suggestedDescription}</span>
                </div>
                {result.parsedDetails?.balance && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">New M-Pesa Balance:</span>
                    <span className="font-bold text-primary">KES {result.parsedDetails.balance.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => navigate('/pending')}
                  className="flex-1 bg-amber-500 text-white py-2.5 rounded-2xl text-xs font-bold transition active:scale-98">
                  Review & Categorize
                </button>
                <button onClick={() => navigate('/')}
                  className="px-4 bg-white text-dark-700 py-2.5 rounded-2xl text-xs font-bold border border-amber-200">
                  Dashboard
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
