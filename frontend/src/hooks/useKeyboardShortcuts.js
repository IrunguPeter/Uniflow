import { useEffect, useCallback, useRef } from 'react';
import { useCommandPalette } from './useCommandPalette';

export function useKeyboardShortcuts(shortcuts = [], enabled = true) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in inputs
      const target = e.target;
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable;
      
      if (isInput && !(e.metaKey || e.ctrlKey)) return;

      for (const shortcut of shortcutsRef.current) {
        const { key, metaKey = false, ctrlKey = false, shiftKey = false, altKey = false, action, preventDefault = true } = shortcut;
        
        const keyMatches = e.key.toLowerCase() === key.toLowerCase();
        const metaMatches = (e.metaKey || e.ctrlKey) === metaKey || (e.metaKey || e.ctrlKey) === ctrlKey;
        const shiftMatches = e.shiftKey === shiftKey;
        const altMatches = e.altKey === altKey;

        if (keyMatches && metaMatches && shiftMatches && altMatches) {
          if (preventDefault) e.preventDefault();
          action(e);
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}

export function useGlobalShortcuts(navigate) {
  const shortcuts = [
    // Navigation shortcuts
    { key: '1', metaKey: true, action: () => navigate('/') },
    { key: '2', metaKey: true, action: () => navigate('/transactions') },
    { key: '3', metaKey: true, action: () => navigate('/charts') },
    { key: '4', metaKey: true, action: () => navigate('/chat') },
    { key: '5', metaKey: true, action: () => navigate('/pending') },
    
    // Quick actions
    { key: 'n', metaKey: true, action: () => navigate('/add') },
    { key: 't', metaKey: true, action: () => navigate('/transfer') },
    { key: 'p', metaKey: true, action: () => navigate('/parse-sms') },
    { key: 'b', metaKey: true, action: () => navigate('/budget') },
    { key: 'g', metaKey: true, action: () => navigate('/savings-goals') },
    { key: 'h', metaKey: true, action: () => navigate('/helb') },
    { key: 'r', metaKey: true, action: () => navigate('/recurring') },
    { key: 'a', metaKey: true, action: () => navigate('/ai-activity') },
    
    // Command palette handled separately
  ];

  useKeyboardShortcuts(shortcuts);
}

// Shortcut help component
export function ShortcutsHelp() {
  const shortcuts = [
    { keys: ['⌘', 'K'], description: 'Open Command Palette' },
    { keys: ['⌘', '1'], description: 'Dashboard' },
    { keys: ['⌘', '2'], description: 'Transactions' },
    { keys: ['⌘', '3'], description: 'Charts' },
    { keys: ['⌘', '4'], description: 'AI Chat' },
    { keys: ['⌘', 'N'], description: 'New Transaction' },
    { keys: ['⌘', 'T'], description: 'Transfer Money' },
    { keys: ['⌘', 'P'], description: 'Parse SMS' },
    { keys: ['⌘', 'B'], description: 'Budget Planner' },
    { keys: ['⌘', 'G'], description: 'Savings Goals' },
    { keys: ['⌘', 'H'], description: 'HELB Planner' },
    { keys: ['⌘', 'R'], description: 'Recurring Expenses' },
    { keys: ['⌘', 'A'], description: 'AI Activity' },
    { keys: ['Esc'], description: 'Close modals / Go back' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl p-6 max-w-md w-full mx-4 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">Keyboard Shortcuts</h2>
          <button
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={() => {}}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {shortcuts.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm text-gray-600">{s.description}</span>
              <div className="flex items-center gap-1.5">
                {s.keys.map((k, idx) => (
                  <kbd key={idx} className="px-2 py-1 text-xs font-mono text-gray-500 bg-gray-100 rounded-lg">
                    {k}
                  </kbd>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}