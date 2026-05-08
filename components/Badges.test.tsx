import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TierBadge, UserStatusBadge } from './Badges';
import { MembershipTier, UserStatus } from '../features/users/types';
import { SettingsContext } from '../features/settings/SettingsProvider';

const mockSettingsContextValue = {
    settingsState: {
        systemSettings: {
            tierSettings: {
                [MembershipTier.Starter]: { name: 'Starter' },
                [MembershipTier.Pro]: { name: 'Pro' },
                [MembershipTier.Master]: { name: 'Master' },
                [MembershipTier.None]: { name: 'None' },
            }
        }
    }
};

const MockSettingsProvider = ({ children }: { children: React.ReactNode }) => (
    <SettingsContext.Provider value={mockSettingsContextValue as any}>
        {children}
    </SettingsContext.Provider>
);

describe('Badge Components', () => {
    it('renders TierBadge with correct text for Pro tier', () => {
        render(
            <MockSettingsProvider>
                <TierBadge tier={MembershipTier.Pro} />
            </MockSettingsProvider>
        );
        expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    it('renders TierBadge with correct text for Master tier', () => {
        render(
            <MockSettingsProvider>
                <TierBadge tier={MembershipTier.Master} />
            </MockSettingsProvider>
        );
        expect(screen.getByText('Master')).toBeInTheDocument();
    });

    it('renders UserStatusBadge with correct text for Active status', () => {
        render(<UserStatusBadge status={UserStatus.Active} />);
        expect(screen.getByText('Hoạt động')).toBeInTheDocument();
    });

    it('renders UserStatusBadge with correct text for PendingFee status', () => {
        render(<UserStatusBadge status={UserStatus.PendingFee} />);
        expect(screen.getByText('Chờ đóng phí')).toBeInTheDocument();
    });

    it('renders UserStatusBadge with correct text for Suspended status', () => {
        render(<UserStatusBadge status={UserStatus.Suspended} />);
        expect(screen.getByText('Bị khóa')).toBeInTheDocument();
    });
});
