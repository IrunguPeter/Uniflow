/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#00B97A',
        'primary-dark': '#009966',
        'primary-light': '#00D98F',
        secondary: '#1A1A1A',
        accent: '#FFD700',
        background: '#F0F2F5',
        surface: '#FFFFFF',
        'surface-dim': '#F8F9FB',
        muted: '#6B7280',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.06)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 2px 8px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.06)',
        'bottom-bar': '0 -2px 20px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
