import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

export function usePullToRefresh(onRefresh, options = {}) {
  const { threshold = 80, maxPull = 120, resistance = 2.5 } = options;
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRelease, setShowRelease] = useState(false);
  const startY = useRef(0);
  const elementRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (isRefreshing) return;
    const scrollTop = elementRef.current?.scrollTop || window.scrollY;
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!isPulling || isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const delta = (currentY - startY.current) / resistance;
    
    if (delta > 0) {
      e.preventDefault();
      const distance = Math.min(delta, maxPull);
      setPullDistance(distance);
      setShowRelease(distance >= threshold);
    }
  }, [isPulling, isRefreshing, maxPull, resistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || isRefreshing) return;
    
    setIsPulling(false);
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setShowRelease(false);
      }
    }
    
    setPullDistance(0);
  }, [isPulling, isRefreshing, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const element = elementRef.current || window;
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(pullDistance / threshold, 1);
  const clampedProgress = Math.min(progress, 1);

  return {
    ref: elementRef,
    isPulling,
    isRefreshing,
    pullDistance,
    progress: clampedProgress,
    showRelease,
    setIsRefreshing,
  };
}

export function PullToRefreshIndicator({ progress, isRefreshing, showRelease }) {
  return (
    <div className="flex items-center justify-center py-4 px-4">
      <motion.div
        animate={{ rotate: isRefreshing ? 360 : progress * 90 }}
        transition={{ 
          duration: isRefreshing ? 1 : 0.1, 
          repeat: isRefreshing ? Infinity : 0,
          ease: isRefreshing ? 'linear' : 'easeOut'
        }}
        className="w-8 h-8"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" className="w-full h-full">
          <circle cx="12" cy="12" r="10" strokeDasharray="31.4 31.4" strokeDashoffset="31.4" strokeLinecap="round" 
            style={{ strokeDasharray: isRefreshing ? '31.4 31.4' : `${progress * 62.8} 31.4` }} />
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" 
            opacity={isRefreshing ? 0.3 : 1} />
        </svg>
      </motion.div>
      
      <AnimatePresence>
        {!isRefreshing && showRelease && (
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="ml-3 text-sm font-semibold text-primary"
          >
            Release to refresh
          </motion.span>
        )}
        
        {isRefreshing && (
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="ml-3 text-sm font-semibold text-primary"
          >
            Refreshing...
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}