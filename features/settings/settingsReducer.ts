
import { MOCK_SYSTEM_SETTINGS } from '../../config';
import { SettingsAction, SettingsState } from './settingsTypes';
import { MembershipTier } from '../users/types';

// Mở rộng type action để hỗ trợ đồng bộ
export type ExtendedSettingsAction = 
    | SettingsAction
    | { type: 'UPDATE_FUND_SETTINGS_PERCENTAGES'; payload: { leaderPct: number; supportPartPct: number; supportMaintPct: number } }
    | { type: 'SYNC_SYSTEM_PROFIT_SETTINGS'; payload: { leaderBonusFund: number; supportPartFund: number; supportMaintFund: number } };

export const settingsReducer = (state: SettingsState, action: ExtendedSettingsAction): SettingsState => {
  switch (action.type) {
    case 'UPDATE_SYSTEM_SETTINGS':
      return {
        ...state,
        systemSettings: { ...state.systemSettings, ...action.payload },
      };

    case 'RESET_SYSTEM_SETTINGS_TO_DEFAULT':
      return {
          ...state,
          systemSettings: {
              ...state.systemSettings,
              participationFee: MOCK_SYSTEM_SETTINGS.participationFee,
              maintenanceFee: MOCK_SYSTEM_SETTINGS.maintenanceFee,
              proParticipationFee: MOCK_SYSTEM_SETTINGS.proParticipationFee,
              proMaintenanceFee: MOCK_SYSTEM_SETTINGS.proMaintenanceFee,
              masterParticipationFee: MOCK_SYSTEM_SETTINGS.masterParticipationFee,
              masterMaintenanceFee: MOCK_SYSTEM_SETTINGS.masterMaintenanceFee,
              penaltyFeeRate: MOCK_SYSTEM_SETTINGS.penaltyFeeRate,
              commissionSettings: MOCK_SYSTEM_SETTINGS.commissionSettings,
              profitSettings: MOCK_SYSTEM_SETTINGS.profitSettings,
              leaderMilestoneBonuses: MOCK_SYSTEM_SETTINGS.leaderMilestoneBonuses,
          }
      };

    case 'UPDATE_FUND_SETTINGS':
      return {
        ...state,
        fundSettings: action.payload,
      };
      
    case 'UPDATE_FUND_SETTINGS_PERCENTAGES':
        const { leaderPct, supportPartPct, supportMaintPct } = action.payload;
        return {
            ...state,
            fundSettings: {
                ...state.fundSettings,
                leaderBonusAllocationPercentage: leaderPct,
                supportParticipationAllocationPercentage: supportPartPct,
                supportFundSettings: {
                    [MembershipTier.Starter]: { ...state.fundSettings.supportFundSettings[MembershipTier.Starter], allocationPercentage: supportMaintPct },
                    [MembershipTier.Pro]: { ...state.fundSettings.supportFundSettings[MembershipTier.Pro], allocationPercentage: supportMaintPct },
                    [MembershipTier.Master]: { ...state.fundSettings.supportFundSettings[MembershipTier.Master], allocationPercentage: supportMaintPct },
                }
            }
        };

    case 'SYNC_SYSTEM_PROFIT_SETTINGS':
        return {
            ...state,
            systemSettings: {
                ...state.systemSettings,
                profitSettings: {
                    participation: {
                        ...state.systemSettings.profitSettings.participation,
                        leaderBonusFund: action.payload.leaderBonusFund,
                        supportFund: action.payload.supportPartFund,
                    },
                    maintenance: {
                        ...state.systemSettings.profitSettings.maintenance,
                        leaderBonusFund: action.payload.leaderBonusFund,
                        supportFund: action.payload.supportMaintFund,
                    }
                }
            }
        };

    case 'UPDATE_USER_SETTINGS':
        return {
            ...state,
            userSettings: action.payload,
        };

    default:
      return state;
  }
};
