import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, options = {}) => {
    const id = Date.now() + Math.random();
    const toast = {
      id,
      message,
      type: options.type || 'info', // 'success' | 'error' | 'warning' | 'info'
      duration: options.duration ?? 4000,
      action: options.action,
      ...options,
    };
    setToasts(prev => [...prev, toast]);
    
    if (toast.duration > 0) {
      setTimeout(() => removeToast(id), toast.duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const success = useCallback((msg, opts) => addToast(msg, { ...opts, type: 'success' }), [addToast]);
  const error = useCallback((msg, opts) => addToast(msg, { ...opts, type: 'error' }), [addToast]);
  const warning = useCallback((msg, opts) => addToast(msg, { ...opts, type: 'warning' }), [addToast]);
  const info = useCallback((msg, opts) => addToast(msg, { ...opts, type: 'info' }), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info, toasts }}>
      {children}
      <AnimatePresence>
        {toasts.map(toast => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

const typeStyles = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const typeIcons = {
  success: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  error: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  warning: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
};

function Toast({ toast, onClose }) {
  const progressRef = useRef(1);
  
  useEffect(() => {
    if (toast.duration > 0) {
      const start = Date.now();
      const animate = () => {
        const elapsed = Date.now() - start;
        progressRef.current = 1 - elapsed / toast.duration;
        if (progressRef.current > 0) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }
  }, [toast.duration]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.9 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={`fixed bottom-24 md:bottom-8 right-4 md:right-8 z-[100] flex items-start gap-3 w-full max-w-sm sm:max-w-md 
        border rounded-2xl p-4 shadow-2xl backdrop-blur-xl ${typeStyles[toast.type]}`}
      style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
    >
      <div className="flex-shrink-0 mt-0.5 text-lg" style={{ color: 'inherit' }}>
        {typeIcons[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-relaxed">{toast.message}</p>
        {toast.action && (
          <button
            onClick={() => { toast.action.onClick(); onClose(toast.id); }}
            className="mt-2 text-xs font-bold underline hover:no-underline transition-colors"
            style={{ color: 'inherit' }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 w-6 h-6 rounded-xl flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity -mr-1 -mt-1"
        style={{ background: 'currentColor', color: 'inherit' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      
      {toast.duration > 0 && (
        <motion.div
          initial={false}
          animate={{ scaleX: 0 }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
          className="absolute bottom-0 left-0 h-1 rounded-bl-2xl rounded-br-2xl"
          style={{ background: 'currentColor', opacity: 0.3, transformOrigin: 'left center' }}
        />
      )}
    </motion.div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}