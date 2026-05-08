
import { SystemSettings, FundSettings } from './types';
import { UserSettings, AdminManagedUser, MembershipTier } from '../users/types';
import { LogEntry, LoggableAction } from '../logging/types';

export const createSettingsActions = (deps: {
    settingsDispatch: any;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    logAction: (payload: Omit<LogEntry, 'id' | 'timestamp' | 'ipAddress'>) => void;
    loggedInUser: AdminManagedUser | null;
}) => {
    const { settingsDispatch, addToast, logAction, loggedInUser } = deps;

    const handleUpdateSystemSettings = (newSettings: SystemSettings) => {
        // --- LOGIC ĐỒNG BỘ SANG FUND SETTINGS ---
        settingsDispatch({ type: 'UPDATE_SYSTEM_SETTINGS', payload: newSettings });
        
        settingsDispatch({ type: 'UPDATE_FUND_SETTINGS_PERCENTAGES', payload: {
            leaderPct: newSettings.profitSettings.participation.leaderBonusFund,
            supportPartPct: newSettings.profitSettings.participation.supportFund, // Mới: Phí tham gia
            supportMaintPct: newSettings.profitSettings.maintenance.supportFund // Phí duy trì
        }});

        addToast('Cài đặt hệ thống đã được cập nhật và đồng bộ với Quỹ!', 'success');
        
        if (loggedInUser) {
            logAction({
                userId: loggedInUser.id,
                userName: loggedInUser.name,
                actionType: LoggableAction.SYSTEM_SETTINGS_UPDATE,
                details: 'Admin updated system settings and synced funds.',
                status: 'success'
            });
        }
    };
  
    const handleResetSystemSettingsToDefault = () => {
        settingsDispatch({ type: 'RESET_SYSTEM_SETTINGS_TO_DEFAULT' });
        addToast('Cài đặt Phí & Hoa hồng đã được khôi phục về mặc định.', 'success');
        if (loggedInUser) {
            logAction({
                userId: loggedInUser.id,
                userName: loggedInUser.name,
                actionType: LoggableAction.FEES_SETTINGS_UPDATE,
                details: 'Admin reset Fees & Commissions to default.',
                status: 'success'
            });
        }
    };

    const handleUpdateFundSettings = (newFundSettings: FundSettings) => {
        // --- LOGIC ĐỒNG BỘ SANG SYSTEM SETTINGS ---
        settingsDispatch({ type: 'UPDATE_FUND_SETTINGS', payload: newFundSettings });
        
        settingsDispatch({ type: 'SYNC_SYSTEM_PROFIT_SETTINGS', payload: {
            leaderBonusFund: newFundSettings.leaderBonusAllocationPercentage,
            supportPartFund: newFundSettings.supportParticipationAllocationPercentage,
            supportMaintFund: newFundSettings.supportFundSettings[MembershipTier.Starter].allocationPercentage
        }});

        addToast('Cài đặt Quỹ đã được cập nhật và đồng bộ sang Phí & Hoa hồng!', 'success');
        
        if (loggedInUser) {
            logAction({
                userId: loggedInUser.id,
                userName: loggedInUser.name,
                actionType: LoggableAction.FUND_SETTINGS_UPDATE,
                details: 'Admin updated fund settings and synced profit config.',
                status: 'success'
            });
        }
    };

    const handleUpdateUserSettings = (newSettings: UserSettings) => {
        settingsDispatch({ type: 'UPDATE_USER_SETTINGS', payload: newSettings });
        addToast('Cài đặt của bạn đã được lưu!', 'success');
    };

    return {
        handleUpdateSystemSettings,
        handleResetSystemSettingsToDefault,
        handleUpdateFundSettings,
        handleUpdateUserSettings,
    };
};
