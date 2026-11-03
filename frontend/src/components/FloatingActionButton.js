import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const QUICK_ACTIONS = [
  { id: 'add-expense', label: 'Log Expense', icon: '💸', href: '/add', type: 'expense' },
  { id: 'add-income', label: 'Log Income', icon: '💰', href: '/add', type: 'income' },
  { id: 'transfer', label: 'Transfer', icon: '🔁', href: '/transfer' },
  { id: 'parse-sms', label: 'Parse SMS', icon: '📱', href: '/parse-sms' },
  { id: 'budget', label: 'Budget', icon: '📊', href: '/budget' },
];

export default function FloatingActionButton({ className = '' }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleActionClick = (action) => {
    if (action.type) {
      // Navigate with type preselected - we'll handle this via URL params
      window.location.href = `${action.href}?type=${action.type}`;
    } else {
      window.location.href = action.href;
    }
    setIsOpen(false);
  };

  return (
    <div className={`fixed bottom-24 md:bottom-8 right-4 md:right-6 z-40 ${className}`}>
      <AnimatePresence>
        {isOpen && QUICK_ACTIONS.map((action, index) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, scale: 0, y: 20, rotate: -90 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0, y: 20, rotate: 90 }}
            transition={{ 
              type: 'spring', 
              damping: 18, 
              stiffness: 300, 
              delay: index * 0.05 
            }}
            onClick={() => handleActionClick(action)}
            className="absolute bottom-16 right-0 mb-3 flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-xl border border-gray-100 hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 whitespace-nowrap"
            style={{ transformOrigin: 'bottom right' }}
          >
            <span className="text-lg">{action.icon}</span>
            <span className="text-sm font-semibold text-gray-800">{action.label}</span>
          </motion.button>
        ))}
      </AnimatePresence>
      
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-14 h-14 md:w-16 md:h-16 rounded-3xl gradient-hero flex items-center justify-center shadow-2xl"
        style={{ boxShadow: '0 10px 30px rgba(16, 185, 129, 0.4)' }}
        aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
          className="text-white text-2xl md:text-3xl"
        >
          +
        </motion.div>
        
        {/* Pulse ring */}
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0.6 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-3xl bg-primary/50"
            />
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}