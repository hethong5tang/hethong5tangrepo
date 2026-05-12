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
            participation: { adminWallet: 17, vat: 10, corporateTax: 3, leaderBonusFund: 5, supportFund: 5 },
            maintenance: { adminWallet: 17, vat: 10, corporateTax: 3, leaderBonusFund: 5, supportFund: 5 },
        },
        commissionSettings: {
            participationCommissions: [
                { level: 'F1', percentage: 40 },
                { level: 'F2', percentage: 20 },
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
        const totalAllocationPercentage = participation.adminWallet + (participation.vat || 10) + (participation.corporateTax || 3) + participation.leaderBonusFund + participation.supportFund; // 40%
        
        const systemProfit = feeAmount * (participation.adminWallet / 100) + feeAmount * ((participation.vat || 10)/100) + feeAmount * ((participation.corporateTax || 3)/100); // 17,000 + 10,000 + 3,000 = 30,000
        const leaderBonus = feeAmount * (participation.leaderBonusFund / 100); // 5,000
        const supportFund = feeAmount * (participation.supportFund / 100); // 5,000
        const commissionableAmount = feeAmount * (1 - totalAllocationPercentage / 100); // 60,000

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
        const f1Commission = feeAmount * 0.40; // 40,000
        const u2Update = result.userUpdates['u2'];
        expect(u2Update.balanceChange).toBe(f1Commission);
        const f1Tx = result.newTransactions.find(t => t.userId === 'u2');
        expect(f1Tx?.amount).toBe(f1Commission);

        // Check F2 commission (for u1, who is Pro)
        const potentialF2Commission = feeAmount * 0.20; // 20,000
        // u1's entitlement is based on their Pro fee
        const u1CommissionableAmount = mockSystemSettings.proParticipationFee; // 1,000,000
        const u1Entitlement = u1CommissionableAmount * 0.20; // 1,000,000 * 0.2 = 200,000
        const actualF2Commission = Math.min(potentialF2Commission, u1Entitlement); // 20,000
        const u1Update = result.userUpdates['u1'];
        expect(u1Update.balanceChange).toBe(actualF2Commission);

        // Check commission difference
        const missedCommission = feeAmount * 0.60 - f1Commission - actualF2Commission; // 60,000 - 40,000 - 20,000 = 0
        // Wait, commissionable pool is 60%. If all 60% are allocated, diff should be 0.
        const diffTx = result.newTransactions.find(t => t.type === TransactionType.CommissionDifference);
        
        if (missedCommission > 0) {
            expect(diffTx?.amount).toBeCloseTo(missedCommission);
        } else {
            expect(diffTx).toBeUndefined();
        } 
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
        const totalAllocationPercentage = participation.adminWallet + (participation.vat || 10) + (participation.corporateTax || 3) + participation.leaderBonusFund + participation.supportFund;

        const feeAmount = mockSystemSettings.proParticipationFee; // 1,000,000

        // F1 commission for u2 (Starter)
        const potentialF1Commission = feeAmount * 0.40; // 400,000
        // u2's entitlement is based on their Starter fee
        const u2FeeAmount = mockSystemSettings.participationFee; // 100,000
        const u2Entitlement = u2FeeAmount * 0.40; // 100,000 * 0.4 = 40,000
        const actualF1Commission = Math.min(potentialF1Commission, u2Entitlement); // 40,000
        const missedF1Commission = potentialF1Commission - actualF1Commission; // 360,000
        
        // F2 commission for u1 (Pro)
        const potentialF2Commission = feeAmount * 0.20; // 200,000
        // Cap is 200,000. So missed is 0.
        // Total sys diff = 360,000.

        const u2Update = result.userUpdates['u2'];
        expect(u2Update.balanceChange).toBe(actualF1Commission);

        const diffTx = result.newTransactions.find(t => t.type === TransactionType.CommissionDifference);
        expect(diffTx?.amount).toBeCloseTo(360000);
    });
});
