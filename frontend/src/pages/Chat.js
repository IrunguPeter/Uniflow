import React, { useEffect, useState, useRef } from 'react';
import { getChatHistory, sendChatMessage, clearChatHistory } from '../services/financeApi';
import { motion, AnimatePresence } from 'framer-motion';

const SUGGESTIONS = [
  { text: "Can I afford a pizza tonight?", icon: '🍕' },
  { text: "How much did I spend on food?", icon: '🍽️' },
  { text: "What's my biggest expense?", icon: '📊' },
  { text: "Give me a budget tip", icon: '💡' },
  { text: "How's my weekly spending?", icon: '📈' },
  { text: "Should I save more?", icon: '🐷' },
];

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    getChatHistory().then(setMessages).catch(console.error);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || sending) return;
    setInput('');
    setSending(true);

    const userMsg = { role: 'user', content: msg };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const data = await sendChatMessage(msg);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleClear = async () => {
    setClearing(true);
    await clearChatHistory();
    setMessages([]);
    setClearing(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] md:h-[calc(100vh-48px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pt-2">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl gradient-cool flex items-center justify-center shadow-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4z" />
                <path d="M18 14h.01M6 14h.01M12 17v4M8 21h8" />
              </svg>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-primary-400 rounded-full border-2 border-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-dark-900">AI Advisor</h1>
            <p className="text-[11px] text-dark-400 font-semibold">Powered by Llama 3.3 70B</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={handleClear} disabled={clearing}
            className="text-xs font-semibold text-dark-400 hover:text-red-500 transition-all px-4 py-2 rounded-xl hover:bg-red-50 active:scale-95">
            {clearing ? 'Clearing...' : 'Clear Chat'}
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 scroll-smooth">
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-12 text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-3xl gradient-cool flex items-center justify-center shadow-xl">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4z" />
                  <path d="M18 14h.01M6 14h.01M12 17v4M8 21h8" />
                </svg>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center animate-bounce">
                <span className="text-sm">✨</span>
              </div>
            </div>
            <h2 className="text-xl font-bold text-dark-800 mb-2">Ask me anything</h2>
            <p className="text-sm text-dark-400 mb-8 max-w-[280px] leading-relaxed">
              I know your balances, spending patterns, and budget status. Let's talk money!
            </p>
            <div className="w-full space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
              {SUGGESTIONS.map((s, i) => (
                <motion.button key={s.text} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => send(s.text)}
                  className="w-full flex items-center gap-3 bg-white border border-dark-100 rounded-2xl px-4 py-3.5 text-left transition-all duration-200 hover:border-primary-300 hover:bg-primary-50/50 hover:shadow-md active:bg-primary-100">
                  <span className="text-xl">{s.icon}</span>
                  <span className="text-sm font-medium text-dark-700">{s.text}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
              {m.role === 'assistant' && (
                <div className="w-9 h-9 rounded-2xl gradient-cool flex items-center justify-center flex-shrink-0 mt-1 shadow-md">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4z" />
                  </svg>
                </div>
              )}
              <div className={`max-w-[80%] px-5 py-3.5 text-[13px] leading-relaxed font-medium ${
                m.role === 'user'
                  ? 'bg-primary-500 text-white rounded-2xl rounded-br-lg shadow-md'
                  : 'bg-white text-dark-700 rounded-2xl rounded-bl-lg border border-dark-100'
              }`}
                style={m.role === 'assistant' ? { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)' } : {}}>
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {sending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-9 h-9 rounded-2xl gradient-cool flex items-center justify-center flex-shrink-0 mt-1 shadow-md">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2a4 4 0 014 4v2a4 4 0 01-8 0V6a4 4 0 014-4z" />
              </svg>
            </div>
            <div className="bg-white rounded-2xl rounded-bl-lg border border-dark-100 px-5 py-4">
              <span className="flex gap-2 items-center h-4">
                <span className="w-2 h-2 bg-dark-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-dark-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-dark-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-end gap-3 p-3 bg-white rounded-3xl border border-dark-100"
        style={{ boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.04)' }}>
        <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your money..."
          className="flex-1 bg-transparent text-sm font-medium text-dark-800 placeholder-dark-400 focus:outline-none px-2 py-2" />
        <button type="submit" disabled={sending || !input.trim()}
          className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center transition-all duration-200 flex-shrink-0 disabled:opacity-30 active:scale-90 hover:bg-primary-600"
          style={{ boxShadow: input.trim() ? '0 4px 16px rgba(16, 185, 129, 0.3)' : 'none' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}
