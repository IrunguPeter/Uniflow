import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getAiActions } from '../services/financeApi';

const TOOL_ICONS = {
  list_transactions: '🔍',
  list_pending_transactions: '📋',
  update_transaction: '✏️',
  categorize_transaction: '🏷️',
  categorize_pending_transaction: '🏷️',
  categorize_pending_transactions: '🗂️',
  create_transaction: '➕',
  record_transfer: '🔁',
  delete_transaction: '🗑️',
};

const TOOL_LABELS = {
  list_transactions: 'Listed transactions',
  list_pending_transactions: 'Listed pending',
  update_transaction: 'Edited transaction',
  categorize_transaction: 'Categorized',
  categorize_pending_transaction: 'Categorized pending',
  categorize_pending_transactions: 'Auto-categorized',
  create_transaction: 'Created transaction',
  record_transfer: 'Recorded transfer',
  delete_transaction: 'Deleted transaction',
};

const statusConfig = {
  executed: { label: 'Done', className: 'bg-primary-50 text-primary-700 border-primary-200' },
  pending: { label: 'Waiting for you', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  failed: { label: 'Failed', className: 'bg-red-50 text-red-600 border-red-200' },
};

export default function AiActivity() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getAiActions()
      .then(setActions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48 rounded-xl" />
        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-[10px] font-bold text-dark-400 uppercase tracking-widest">Audit trail</p>
          <h1 className="text-xl font-extrabold text-secondary">AI Activity</h1>
        </div>
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center transition active:scale-95">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <p className="text-xs text-muted leading-relaxed">
        Everything the AI has done to your ledger. Anything destructive waits for your approval first.
      </p>

      {actions.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🤖</span>
          </div>
          <p className="text-sm font-bold text-dark-700 mb-1">Nothing yet</p>
          <p className="text-xs text-dark-400">Ask the AI advisor to change something and it will show up here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {actions.map((action) => {
              const status = statusConfig[action.status] || statusConfig.failed;
              return (
                <motion.div key={action.id} layout
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="card-hover flex items-start gap-3 !p-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-lg flex-shrink-0">
                    {TOOL_ICONS[action.tool] || '⚙️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-dark-800">{TOOL_LABELS[action.tool] || action.tool}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-dark-500 mt-0.5 leading-snug">{action.summary}</p>
                    <p className="text-[10px] text-dark-300 mt-1">
                      {new Date(action.createdAt).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
