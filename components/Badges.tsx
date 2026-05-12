
import React from 'react';
import { UserStatus, MembershipTier } from '../features/users/types';
import { TransactionStatus } from '../features/finance/types';
import { CrownIcon, TrophyIcon } from './Icons';
import { useSettings } from '../features/settings/useSettings';

export const TierBadge: React.FC<{ tier: MembershipTier }> = React.memo(({ tier }) => {
    const { settingsState } = useSettings();
    const { tierSettings } = settingsState.systemSettings;

    const styles: Record<MembershipTier, string> = {
        [MembershipTier.None]: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
        [MembershipTier.Starter]: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300",
        [MembershipTier.Pro]: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
        [MembershipTier.Master]: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
    };
    
    const tierName = tier === MembershipTier.None ? "Chưa kích hoạt" : tierSettings[tier]?.name || tier;

    return <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full ${styles[tier]}`}>
      {tier !== MembershipTier.Starter && tier !== MembershipTier.None && <CrownIcon className="h-3 w-3" />}
      {tierName}
    </span>;
});

export const UserStatusBadge: React.FC<{ 
    status: UserStatus; 
    missedMonths?: number; 
    previousStatus?: UserStatus 
}> = React.memo(({ status, missedMonths, previousStatus }) => {
    const styles: Record<UserStatus, string> = {
        [UserStatus.Active]: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
        [UserStatus.PendingFee]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
        [UserStatus.Suspended]: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
    };
    const baseText: Record<UserStatus, string> = {
      [UserStatus.Active]: "Hoạt động",
      [UserStatus.PendingFee]: "Chờ đóng phí",
      [UserStatus.Suspended]: "Bị khóa",
    };

    let displayText = baseText[status];

    /**
     * LOGIC HIỂN THỊ THÔNG TIN TRỄ PHÍ:
     * Chỉ hiển thị hậu tố "(Trễ X tháng)" khi:
     * 1. Trạng thái hiện tại ĐANG LÀ PendingFee.
     * 2. Hoặc trạng thái hiện tại ĐANG LÀ Suspended NHƯNG trạng thái gốc (previousStatus) là PendingFee.
     * Nếu trạng thái gốc là Active, tuyệt đối không hiện "Trễ X tháng".
     */
    const isActuallyPending = status === UserStatus.PendingFee;
    const wasPendingBeforeLock = status === UserStatus.Suspended && previousStatus === UserStatus.PendingFee;
    
    const shouldShowDelay = (isActuallyPending || wasPendingBeforeLock) && (missedMonths && missedMonths > 0);

    if (shouldShowDelay) {
        displayText += ` (Trễ ${missedMonths} tháng)`;
    }

    return <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>{displayText}</span>;
});

export const TransactionStatusBadge: React.FC<{ status: TransactionStatus }> = React.memo(({ status }) => {
    const styles: Record<TransactionStatus, string> = {
        [TransactionStatus.Completed]: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
        [TransactionStatus.Pending]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
        [TransactionStatus.Failed]: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
    };
    const text: Record<TransactionStatus, string> = {
        [TransactionStatus.Completed]: "Hoàn thành",
        [TransactionStatus.Pending]: "Chờ xử lý",
        [TransactionStatus.Failed]: "Thất bại",
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>{text[status]}</span>;
});

export const RankLevelBadge: React.FC<{ level: number }> = React.memo(({ level }) => {
    const { settingsState } = useSettings();
    const { levelSettings } = settingsState.systemSettings;

    if (level === 0) {
        return null;
    }

    const levelInfo = levelSettings.find(l => l.level === level);
    const levelName = levelInfo ? levelInfo.name : `Cấp ${level}`;

    const colors = [
        'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400', // Bronze (Cấp 1)
        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300',      // Silver (Cấp 2)
        'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400', // Gold (Cấp 3)
        'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/30 dark:text-sky-400',          // Diamond (Cấp 4)
        'bg-indigo-600 text-white border-indigo-700 shadow-sm shadow-indigo-500/30',            // Crown (Cấp 5)
    ];
    
    const colorClass = colors[(level - 1) % colors.length];

    return (
        <span className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${colorClass}`}>
            <TrophyIcon className="h-3 w-3" />
            {levelName}
        </span>
    );
});
