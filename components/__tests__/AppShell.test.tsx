import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import App from '../../App';

// Mock the BrowserHandTracker since it requires browser APIs
vi.mock('../../infrastructure/mediapipe/BrowserHandTracker', () => ({
  BrowserHandTracker: class MockBrowserHandTracker {
    subscribe() { return () => { }; }
    initialize() { return Promise.resolve(); }
    stop() { }
  }
}));

afterEach(() => {
  cleanup();
});

describe('App shell', () => {
  it('renders the title screen initially', () => {
    render(<App />);

    // App should start on Title screen - check for "ORBITAL DEFENSE" title
    expect(screen.getAllByText(/ORBITAL/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/DEFENSE/i).length).toBeGreaterThan(0);
  });

  it('has an initialize button', () => {
    render(<App />);

    // Check that the INITIALIZE_SYSTEM button exists (may be multiple due to React strict mode)
    const buttons = screen.getAllByRole('button', { name: /INITIALIZE_SYSTEM/i });
    expect(buttons.length).toBeGreaterThan(0);
  });
});
