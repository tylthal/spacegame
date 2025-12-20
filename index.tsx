/**
 * Application Entry Point
 * Initializes the React root and mounts the primary App component.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}