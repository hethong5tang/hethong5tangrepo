import { describe, it, expect, beforeEach } from 'vitest';
import { calculateFeePaymentChanges } from './financeService';
import { AdminManagedUser, MembershipTier, UserStatus } from '../features/users/types';
import { SystemSettings, FundSettings } from '../features/settings/types';
import { TransactionType } from '../features/finance/types';

describe('financeService', () => {
  
    const mockSystemSettings: SystemSettings = {
        participationFee: 100000,
        maintenanceFee: 50000,
        proParticipationFee: 1000000,
        proMaintenanceFee: 500000,
        masterParticipationFee: 10000000,
        masterMaintenanceFee: 5000000,
        profitSettings: {
            participation: { adminWallet: 10, leaderBonusFund: 10, supportFund: 5 },
            maintenance: { adminWallet: 5, supportFund: 5 },
        },
        commissionSettings: {
            participationCommissions: [
                { level: 'F1', percentage: 40 },
                { level: 'F2', percentage: 20 },
                { level: 'F3', percentage: 10 },
            ],
            maintenanceCommissions: [],
        },
    } as SystemSettings;

    const mockFundSettings: FundSettings = {} as FundSettings;

    let mockUsers: AdminManagedUser[];

    beforeEach(() => {
        // u1 (Pro, Active) -> u2 (Starter, Active) -> u3 (Starter, Active)
        mockUsers = [
            { id: 'u1', name: 'User 1', membershipTier: MembershipTier.Pro, status: UserStatus.Active, children: [
                { id: 'u2', name: 'User 2', parentId: 'u1', membershipTier: MembershipTier.Starter, status: UserStatus.Active, children: [
                    { id: 'u3', name: 'User 3', parentId: 'u2', membershipTier: MembershipTier.Starter, status: UserStatus.Active, children: [] }
                ]}
            ]}
        ] as AdminManagedUser[];
    });

    it('should calculate commissions, profit, and fund allocations correctly for a Starter participation fee', () => {
        const payingUserId = 'u3';
        const feeType = 'participation';
        const membershipTier = MembershipTier.Starter;

        const result = calculateFeePaymentChanges(payingUserId, feeType, membershipTier, mockUsers, mockSystemSettings, mockFundSettings);

        expect(result).not.toBeNull();
        if (!result) return;

        const feeAmount = mockSystemSettings.participationFee; // 100,000
        const { participation } = mockSystemSettings.profitSettings;
        const totalAllocationPercentage = participation.adminWallet + participation.leaderBonusFund + participation.supportFund; // 25%
        
        const systemProfit = feeAmount * (participation.adminWallet / 100); // 10,000
        const leaderBonus = feeAmount * (participation.leaderBonusFund / 100); // 10,000
        const supportFund = feeAmount * (participation.supportFund / 100); // 5,000
        const commissionableAmount = feeAmount * (1 - totalAllocationPercentage / 100); // 75,000

        // Check system profit transaction
        const profitTx = result.newTransactions.find(t => t.type === TransactionType.SystemProfit);
        expect(profitTx?.amount).toBe(systemProfit);

        // Check leader bonus fund allocation
        expect(result.fundUpdates.leader_bonus?.balanceChange).toBe(leaderBonus);
        const leaderFundTx = result.newFundTransactions.find(t => t.fund === 'leader_bonus');
        expect(leaderFundTx?.amount).toBe(leaderBonus);

        // Check support fund allocation
        expect(result.fundUpdates.support?.balanceChange).toBe(supportFund);
        const supportFundTx = result.newFundTransactions.find(t => t.fund === 'support');
        expect(supportFundTx?.amount).toBe(supportFund);


        // Check F1 commission (for u2)
        const f1Commission = commissionableAmount * 0.40; // 30,000
        const u2Update = result.userUpdates['u2'];
        expect(u2Update.balanceChange).toBe(f1Commission);
        const f1Tx = result.newTransactions.find(t => t.userId === 'u2');
        expect(f1Tx?.amount).toBe(f1Commission);

        // Check F2 commission (for u1, who is Pro)
        const potentialF2Commission = commissionableAmount * 0.20; // 15,000
        // u1's entitlement is based on their Pro fee
        const u1CommissionableAmount = mockSystemSettings.proParticipationFee * (1 - totalAllocationPercentage / 100);
        const u1Entitlement = u1CommissionableAmount * 0.20; // 1,000,000 * 0.75 * 0.2 = 150,000
        const actualF2Commission = Math.min(potentialF2Commission, u1Entitlement); // 15,000
        const u1Update = result.userUpdates['u1'];
        expect(u1Update.balanceChange).toBe(actualF2Commission);

        // Check commission difference
        const missedCommission = 30000; // 7,500 (F3 missing) + 22,500 (unallocated pool 30%)
        const diffTx = result.newTransactions.find(t => t.type === TransactionType.CommissionDifference);
        expect(diffTx?.amount).toBeCloseTo(missedCommission); 
    });
    
     it('should calculate commission difference when upline has a lower tier', () => {
        // u1 (Pro) -> u2 (Starter) -> u3 (Pro)
        mockUsers[0].children![0].children![0].membershipTier = MembershipTier.Pro;

        const payingUserId = 'u3';
        const feeType = 'participation';
        const membershipTier = MembershipTier.Pro;

        const result = calculateFeePaymentChanges(payingUserId, feeType, membershipTier, mockUsers, mockSystemSettings, mockFundSettings);
        expect(result).not.toBeNull();
        if(!result) return;
        
        const { participation } = mockSystemSettings.profitSettings;
        const totalAllocationPercentage = participation.adminWallet + participation.leaderBonusFund + participation.supportFund;

        const feeAmount = mockSystemSettings.proParticipationFee; // 1,000,000
        const commissionableAmount = feeAmount * (1 - totalAllocationPercentage / 100); // 750,000

        // F1 commission for u2 (Starter)
        const potentialF1Commission = commissionableAmount * 0.40; // 300,000
        // u2's entitlement is based on their Starter fee
        const u2CommissionableAmount = mockSystemSettings.participationFee * (1 - totalAllocationPercentage / 100);
        const u2Entitlement = u2CommissionableAmount * 0.40; // 100,000 * 0.75 * 0.4 = 30,000
        const actualF1Commission = Math.min(potentialF1Commission, u2Entitlement); // 30,000
        const missedF1Commission = potentialF1Commission - actualF1Commission; // 270,000
        
        // F2 commission for u1 (Pro)
        // potentialF2Commission = 750,000 * 0.20 = 150,000. Cap is 150,000. So missed is 0.
        // F3 missing = 75,000.
        // Unallocated 30% = 225,000.
        // Total sys diff = 270,000 + 0 + 75,000 + 225,000 = 570,000.

        const u2Update = result.userUpdates['u2'];
        expect(u2Update.balanceChange).toBe(actualF1Commission);

        const diffTx = result.newTransactions.find(t => t.type === TransactionType.CommissionDifference);
        expect(diffTx?.amount).toBeCloseTo(570000);
    });
});
