/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#2e1065',
        },
        yellow: {
          lms: '#ffd668',
        }
      },
      fontFamily: {
        sans:    ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Plus Jakarta Sans', 'ui-sans-serif', 'sans-serif'],
      },
      keyframes: {
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideIn: {
          '0%':   { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',      opacity: '1' }
        },
        pulse2: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' }
        }
      },
      animation: {
        'fadeInUp':   'fadeInUp 0.5s ease-out both',
        'fadeIn':     'fadeIn 0.3s ease-out both',
        'slideIn':    'slideIn 0.4s ease-out both',
        'pulse2':     'pulse2 2s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      boxShadow: {
        'card':    '0 4px 24px rgba(109, 40, 217, 0.08)',
        'card-lg': '0 8px 40px rgba(109, 40, 217, 0.14)',
        'glow':    '0 0 32px rgba(109, 40, 217, 0.3)',
      }
    }
  },
  plugins: [],
}
