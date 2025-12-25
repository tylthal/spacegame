/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './{components,services,systems,utils,config,telemetry}/**/*.{ts,tsx,js,jsx}',
    './App.tsx',
    './index.tsx'
  ],
  theme: {
    screens: {
      'xs': '480px',      // Small phones
      'sm': '640px',      // Large phones / small tablets
      'md': '768px',      // Tablets
      'lg': '1024px',     // Desktops
      'xl': '1280px',     // Large desktops
      '2xl': '1536px',    // Extra large
      // Height-based breakpoints for landscape detection
      'tall': { 'raw': '(min-height: 500px)' },
      'short': { 'raw': '(max-height: 499px)' },
    },
    extend: {
      fontFamily: {
        mono: ['"Courier New"', 'monospace'], // Raw code look
        display: ['"Chakra Petch"', 'sans-serif'], // Headers
        body: ['"Teko"', 'sans-serif'], // UI Data
      },
      colors: {
        y2k: {
          yellow: '#E6FF00', // Acid Yellow
          black: '#000000', // Void
          red: '#FF003C', // System Error
          white: '#F0F0F0', // Static
          silver: '#C0C0C0', // Old hardware
          cyan: '#00FFFF', // Cyber Blue
        }
      },
      animation: {
        'glitch': 'glitch 0.2s linear infinite',
        'twitch': 'twitch 3s ease-in-out infinite',
        'marquee': 'marquee 20s linear infinite',
      },
      keyframes: {
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' }
        },
        twitch: {
          '0%, 90%': { transform: 'translate(0)' },
          '91%': { transform: 'translate(1px, 0)' },
          '92%': { transform: 'translate(-1px, 0)' },
          '93%': { transform: 'translate(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        }
      }
    }
  },
  plugins: [],
};
