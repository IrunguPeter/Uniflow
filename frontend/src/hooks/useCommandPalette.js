import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const COMMANDS = [
  { id: 'dashboard', label: 'Dashboard', description: 'View your financial overview', shortcut: '⌘1', icon: '🏠', action: () => window.location.href = '/' },
  { id: 'transactions', label: 'Transactions', description: 'View all transactions', shortcut: '⌘2', icon: '📒', action: () => window.location.href = '/transactions' },
  { id: 'add', label: 'Add Transaction', description: 'Log a new expense or income', shortcut: '⌘N', icon: '➕', action: () => window.location.href = '/add' },
  { id: 'transfer', label: 'Transfer Money', description: 'Move money between accounts', shortcut: '⌘T', icon: '🔁', action: () => window.location.href = '/transfer' },
  { id: 'parse-sms', label: 'Parse M-Pesa SMS', description: 'Import transactions from SMS', shortcut: '⌘P', icon: '📱', action: () => window.location.href = '/parse-sms' },
  { id: 'budget', label: 'Budget Planner', description: 'Set up budgets and track spending', shortcut: '⌘B', icon: '📊', action: () => window.location.href = '/budget' },
  { id: 'charts', label: 'Analytics', description: 'View spending charts and trends', shortcut: '⌘3', icon: '📈', action: () => window.location.href = '/charts' },
  { id: 'savings-goals', label: 'Savings Goals', description: 'Create and track savings goals', shortcut: '⌘G', icon: '🎯', action: () => window.location.href = '/savings-goals' },
  { id: 'helb', label: 'HELB Planner', description: 'Plan your semester budget', shortcut: '⌘H', icon: '🎓', action: () => window.location.href = '/helb' },
  { id: 'chat', label: 'AI Chat', description: 'Ask the AI advisor questions', shortcut: '⌘4', icon: '💬', action: () => window.location.href = '/chat' },
  { id: 'recurring', label: 'Recurring Expenses', description: 'Manage recurring bills', shortcut: '⌘R', icon: '🔁', action: () => window.location.href = '/recurring' },
  { id: 'pending', label: 'Pending Transactions', description: 'Review uncategorized transactions', shortcut: '⌘5', icon: '⏳', action: () => window.location.href = '/pending' },
  { id: 'ai-activity', label: 'AI Activity Log', description: 'View AI actions history', shortcut: '⌘A', icon: '🤖', action: () => window.location.href = '/ai-activity' },
];

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const itemsRef = useRef([]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
        setQuery('');
        setSelectedIndex(0);
      }
      
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        setSelectedIndex(0);
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const filteredCommands = COMMANDS.filter(cmd => 
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description.toLowerCase().includes(query.toLowerCase()) ||
    cmd.shortcut.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (cmd) => {
    cmd.action();
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      handleSelect(filteredCommands[selectedIndex]);
    }
  };

  return {
    isOpen,
    setIsOpen,
    query,
    setQuery,
    selectedIndex,
    filteredCommands,
    handleSelect,
    handleKeyDown,
    inputRef,
    itemsRef,
  };
}

export function CommandPalette({ isOpen, onClose, query, setQuery, selectedIndex, filteredCommands, handleSelect, handleKeyDown, inputRef }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-start justify-center pt-16"
        style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-2xl mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
          onClick={e => e.stopPropagation()}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-blue-50/50" />
            <div className="relative p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent text-lg font-medium text-gray-900 placeholder-gray-400 focus:outline-none"
                  autoComplete="off"
                  spellCheck="false"
                />
                <kbd className="px-2.5 py-1 text-xs font-mono text-gray-400 bg-gray-100 rounded-lg">⌘K</kbd>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-100 max-h-96 overflow-y-auto">
            <AnimatePresence mode="popLayout">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((cmd, index) => (
                  <motion.button
                    key={cmd.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.02, type: 'spring', damping: 20, stiffness: 300 }}
                    onClick={() => handleSelect(cmd)}
                    className={`w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors ${
                      index === selectedIndex
                        ? 'bg-primary-50 border-l-4 border-primary'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl">{cmd.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-gray-900 ${index === selectedIndex ? 'text-primary' : ''}`}>
                        {cmd.label}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{cmd.description}</p>
                    </div>
                    <kbd className="px-2 py-1 text-[10px] font-mono text-gray-400 bg-gray-100 rounded-lg">
                      {cmd.shortcut}
                    </kbd>
                    {index === selectedIndex && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 rounded-full bg-primary"
                      />
                    )}
                  </motion.button>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  <p className="font-medium">No commands found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
            <p className="text-[11px] text-gray-500 text-center">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-100 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-100 rounded">↓</kbd>
              Navigate • 
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-100 rounded">Enter</kbd>
              Select • 
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-100 rounded">Esc</kbd>
              Close
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}