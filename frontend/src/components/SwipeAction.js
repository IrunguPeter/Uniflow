import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function SwipeAction({ children, leftActions = [], rightActions = [], className = '', style = {} }) {
  const [translateX, setTranslateX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const containerRef = useRef(null);
  const threshold = 60;
  const maxSwipe = 180;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleTouchStart = (e) => {
    if (isOpen) {
      close();
      return;
    }
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current) return;
    
    currentX.current = e.touches[0].clientX;
    const delta = currentX.current - startX.current;
    
    // Only allow left swipe (negative delta) for right actions
    if (delta < 0 && rightActions.length > 0) {
      const distance = Math.min(Math.abs(delta), maxSwipe);
      setTranslateX(-distance);
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    const distance = Math.abs(translateX);
    
    if (distance >= threshold) {
      setIsOpen(true);
      setTranslateX(-maxSwipe);
    } else {
      close();
    }
  };

  const close = () => {
    setIsOpen(false);
    setTranslateX(0);
  };

  const handleActionClick = (action, onClose = true) => {
    action.onClick();
    if (onClose) close();
  };

  const leftActionsWidth = leftActions.length * 60;
  const rightActionsWidth = rightActions.length * 60;

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden touch-none ${className}`}
      style={{ ...style, transform: `translateX(${translateX}px)` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Right Actions (appear on left swipe) */}
      <div className="absolute top-0 right-0 bottom-0 flex items-center" style={{ width: rightActionsWidth }}>
        {rightActions.map((action, index) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: Math.min(Math.abs(translateX) / 40, 1), scale: 1 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => handleActionClick(action)}
            className={`flex items-center justify-center w-14 h-full ${action.bg || 'bg-red-500'} text-white font-semibold text-sm`}
            style={{ borderRadius: index === rightActions.length - 1 ? '0 1rem 1rem 0' : 0 }}
            aria-label={action.label}
          >
            {action.icon}
            <span className="ml-1 hidden sm:inline">{action.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Content */}
      <motion.div
        layout
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="relative bg-white rounded-2xl shadow-sm"
        style={{ willChange: 'transform' }}
      >
        {React.Children.map(children, child => 
          React.cloneElement(child, { 
            onClick: close,
            onTouchStart: (e) => e.stopPropagation(),
          })
        )}
      </motion.div>

      {/* Left Actions (appear on right swipe) - if needed */}
      <div className="absolute top-0 left-0 bottom-0 flex items-center" style={{ width: leftActionsWidth }}>
        {leftActions.map((action, index) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => handleActionClick(action)}
            className={`flex items-center justify-center w-14 h-full ${action.bg || 'bg-primary'} text-white font-semibold text-sm`}
            style={{ borderRadius: index === 0 ? '1rem 0 0 1rem' : 0 }}
            aria-label={action.label}
          >
            {action.icon}
          </motion.button>
        ))}
      </div>

      {/* Overlay when actions are open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-transparent z-10"
            onClick={close}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export function SwipeActionItem({ children, onClick, className = '', ...props }) {
  return (
    <div 
      onClick={onClick}
      className={`flex items-center p-4 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}