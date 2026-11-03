import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function AnimatedNumber({ 
  value, 
  prefix = '', 
  suffix = '', 
  decimals = 0, 
  duration = 1.2, 
  className = '',
  formatter 
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const targetValue = typeof value === 'number' ? value : parseFloat(value) || 0;
    
    if (!hasAnimated) {
      const startTime = performance.now();
      const startValue = 0;
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / (duration * 1000), 1);
        
        // Spring-like easing
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = startValue + (targetValue - startValue) * eased;
        
        setDisplayValue(current);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setDisplayValue(targetValue);
          setHasAnimated(true);
        }
      };
      
      requestAnimationFrame(animate);
    } else {
      setDisplayValue(targetValue);
    }
  }, [value, duration, hasAnimated]);

  const formatted = formatter 
    ? formatter(displayValue) 
    : displayValue.toLocaleString(undefined, { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
      });

  return (
    <span className={className}>
      {prefix}
      <motion.span
        key={formatted}
        initial={{ opacity: 0, y: '0.5em' }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="inline-block"
      >
        {formatted}
      </motion.span>
      {suffix}
    </span>
  );
}

export function CountUp({ 
  end, 
  start = 0, 
  duration = 1.5, 
  decimals = 0, 
  prefix = '', 
  suffix = '',
  separator = ',',
  className = '',
  onComplete,
  delay = 0
}) {
  const [count, setCount] = useState(start);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(true);
      const startTime = performance.now();
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / (duration * 1000), 1);
        
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = start + (end - start) * eased;
        
        setCount(current);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setCount(end);
          setIsAnimating(false);
          onComplete?.();
        }
      };
      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timer);
  }, [end, start, duration, delay, onComplete]);

  const formatted = count.toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals,
    useGrouping: true 
  }).replace(/,/g, separator);

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

export function AnimatedProgressRing({ 
  progress, 
  size = 120, 
  strokeWidth = 8, 
  className = '',
  showValue = true,
  value,
  colors = ['#10B981', '#34D399'],
  backgroundColor = '#E2E8F0'
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative inline-flex ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="transition-all duration-500"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{ 
            stroke: `url(#gradient-${Math.random().toString(36).substr(2, 9)})`,
          }}
        >
          <defs>
            <linearGradient id={`gradient-${Math.random().toString(36).substr(2, 9)}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors[0]} />
              <stop offset="100%" stopColor={colors[1]} />
            </linearGradient>
          </defs>
        </motion.circle>
      </svg>
      
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatedNumber 
            value={value ?? progress} 
            suffix="%" 
            className="text-2xl font-bold text-gray-900"
            duration={1}
          />
        </div>
      )}
    </div>
  );
}