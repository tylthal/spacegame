/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './{components,services,systems,utils,config,telemetry}/**/*.{ts,tsx,js,jsx}',
    './App.tsx',
    './index.tsx'
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"DM Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace']
      }
    }
  },
  plugins: [],
};
