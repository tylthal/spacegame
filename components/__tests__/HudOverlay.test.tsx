import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import HudOverlay from '../HudOverlay';

describe('HudOverlay', () => {
  it('surfaces score, hull, and lives with accessible labels', () => {
    render(<HudOverlay score={12450} hull={72} lives={3} multiplier={2.5} />);

    expect(screen.getByRole('region', { name: /player hud/i })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /score/i })).toHaveTextContent('12,450');
    expect(screen.getByRole('status', { name: /lives/i })).toHaveTextContent('3');
    expect(screen.getByText(/72%/)).toBeInTheDocument();
    expect(screen.getByLabelText(/multiplier x2.5/i)).toBeInTheDocument();
  });

  it('clamps hull values into a readable range for the meter and sr-only copy', () => {
    render(<HudOverlay score={50} hull={-12} lives={1} multiplier={1} ariaLabel="HUD" />);

    expect(screen.getByText(/0%/)).toBeInTheDocument();
    expect(screen.getByText(/Hull integrity at 0 percent/i)).toBeInTheDocument();
    expect(screen.getByText(/Score 50/i)).toBeInTheDocument();
  });
});
