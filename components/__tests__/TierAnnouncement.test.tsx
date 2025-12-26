import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';
import { TierAnnouncement } from '../TierAnnouncement';

describe('TierAnnouncement', () => {
    it('displays the correct message for Tier 2 (Weaver)', () => {
        render(<TierAnnouncement tier={1} />);
        expect(screen.getByText('WEAVER DETECTED')).toBeDefined();
        expect(screen.getByText('TIER 2')).toBeDefined();
    });

    it('displays the correct message for Tier 3 (Shielded Drone)', () => {
        render(<TierAnnouncement tier={2} />);
        expect(screen.getByText('SHIELDED DRONE INCOMING')).toBeDefined();
        expect(screen.getByText('TIER 3')).toBeDefined();
    });

    it('displays the correct message for Tier 4 (Swarm Intensifying)', () => {
        render(<TierAnnouncement tier={3} />);
        expect(screen.getByText('SWARM INTENSIFYING')).toBeDefined();
        expect(screen.getByText('TIER 4')).toBeDefined();
    });
});
