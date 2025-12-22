import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect } from 'vitest';
import App from '../../App';

describe('App shell', () => {
  it('surfaces the clean foundation copy', () => {
    render(<App />);

    expect(screen.getByText(/Fresh base with legacy code removed/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /rebuild checkpoints/i })).toBeInTheDocument();
  });

  it('lets the user cycle through placeholder screens', async () => {
    const user = userEvent.setup();
    render(<App />);

    const [phaseList] = screen.getAllByRole('list', { name: /rebuild phases/i });
    const calibrationButton = within(phaseList).getByRole('button', { name: /calibration placeholder/i });

    await user.click(calibrationButton);
    expect(screen.getByText(/calibration shell placeholder/i)).toBeInTheDocument();

    const advance = screen.getAllByRole('button', { name: /advance placeholder/i })[0];
    await user.click(advance);
    expect(screen.getByText(/ready screen placeholder/i)).toBeInTheDocument();
  });
});
