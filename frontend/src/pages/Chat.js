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
      <div className="flex items-center justify-between mb-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl gradient-cool flex items-center justify-center">
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-secondary">AI Advisor</h1>
            <p className="text-[10px] text-muted font-medium">Powered by Gemma 4</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={handleClear} disabled={clearing}
            className="text-xs text-muted hover:text-red-500 transition font-medium px-3 py-1.5 rounded-xl hover:bg-red-50">
            {clearing ? 'Clearing...' : 'Clear'}
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3 scroll-smooth">
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-10 text-center">
            <div className="w-20 h-20 rounded-full gradient-cool flex items-center justify-center mb-4 shadow-lg">
              <span className="text-3xl">🤖</span>
            </div>
            <p className="font-bold text-secondary mb-1">Ask me anything</p>
            <p className="text-sm text-muted mb-6 max-w-[240px]">I know your balances, spending patterns, and budget status</p>
            <div className="w-full space-y-2 md:grid md:grid-cols-2 md:gap-2 md:space-y-0">
              {SUGGESTIONS.map((s) => (
                <motion.button key={s.text} whileTap={{ scale: 0.97 }}
                  onClick={() => send(s.text)}
                  className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-left transition-all hover:border-primary/30 hover:bg-primary/5 active:bg-primary/10">
                  <span className="text-lg flex-shrink-0">{s.icon}</span>
                  <span className="text-sm font-medium text-secondary">{s.text}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full gradient-cool flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-[10px]">🤖</span>
                </div>
              )}
              <div className={`max-w-[78%] px-4 py-3 text-[13px] leading-relaxed font-medium ${
                m.role === 'user'
                  ? 'bg-primary text-white rounded-2xl rounded-br-lg'
                  : 'bg-white text-secondary rounded-2xl rounded-bl-lg shadow-card'
              }`}>
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {sending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <div className="w-7 h-7 rounded-full gradient-cool flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-[10px]">🤖</span>
            </div>
            <div className="bg-white rounded-2xl rounded-bl-lg shadow-card px-4 py-3">
              <span className="flex gap-1.5 items-center h-4">
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex items-end gap-2 p-3 bg-white rounded-3xl shadow-card border border-gray-100">
        <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your money..."
          className="flex-1 bg-transparent text-sm font-medium text-secondary placeholder-gray-400 focus:outline-none px-1 py-1" />
        <button type="submit" disabled={sending || !input.trim()}
          className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center transition-all duration-200 flex-shrink-0 disabled:opacity-30 active:scale-90 hover:bg-primary-dark"
          style={{ boxShadow: input.trim() ? '0 4px 12px rgba(0, 185, 122, 0.3)' : 'none' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
}
