import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, afterEach } from 'vitest';
import HudOverlay from '../HudOverlay';

afterEach(() => {
  cleanup();
});

describe('HudOverlay', () => {
  it('surfaces score, hull, and lives with accessible labels', () => {
    render(<HudOverlay score={12450} hull={72} lives={3} multiplier={2.5} />);

    expect(screen.getByRole('region', { name: /player hud/i })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /score/i })).toHaveTextContent('12,450');
    // Check hull percentage is displayed
    expect(screen.getByText(/72%/)).toBeInTheDocument();
    // Check multiplier is shown
    expect(screen.getByLabelText(/multiplier x2.5/i)).toBeInTheDocument();
    // Check lives are rendered (3 life indicators) via sr-only status
    const allStatuses = screen.getAllByRole('status');
    // One of them should contain lives info
    expect(allStatuses.some(el => el.textContent?.includes('Lives 3'))).toBe(true);
  });

  it('clamps hull values into a readable range for the meter and sr-only copy', () => {
    render(<HudOverlay score={50} hull={-12} lives={1} multiplier={1} ariaLabel="HUD" />);

    // The clamped value for display should be 0
    // Check sr-only status - there's only one sr-only element with role="status" in this render
    const allStatuses = screen.getAllByRole('status');
    // Find the sr-only one that contains the full announcement
    const srStatus = allStatuses.find(el => el.className.includes('sr-only'));
    expect(srStatus).toBeDefined();
    expect(srStatus!.textContent).toMatch(/Hull 0 percent/i);
    expect(srStatus!.textContent).toMatch(/Score 50/i);
  });
});
