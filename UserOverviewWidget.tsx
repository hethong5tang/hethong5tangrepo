import React, { useMemo } from 'react';
import { AdminManagedUser, UserStatus } from '../../features/users/types';
import { UsersIcon, UserPlusIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '../Icons';
import UserStatCard from '../UserStatCard';

const UserOverviewWidget: React.FC<{ users: AdminManagedUser[], timeframe: 'week' | 'month' | 'year', setTimeframe: (tf: 'week' | 'month' | 'year') => void }> = ({ users, timeframe, setTimeframe }) => {
    const userStats = useMemo(() => {
        const now = new Date();
        const getPeriodRange = (referenceDate: Date, period: 'week' | 'month' | 'year') => {
            let start: Date, end: Date;
            if (period === 'week') {
                const day = referenceDate.getDay();
                const diff = referenceDate.getDate() - day + (day === 0 ? -6 : 1); 
                start = new Date(referenceDate);
                start.setDate(diff);
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setDate(start.getDate() + 6);
                end.setHours(23, 59, 59, 999);
            } else if (period === 'year') {
                start = new Date(referenceDate.getFullYear(), 0, 1);
                end = new Date(referenceDate.getFullYear(), 11, 31, 23, 59, 59, 999);
            } else { // month
                start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
                end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59, 999);
            }
            return { start, end };
        };

        const getPreviousPeriodRefDate = (referenceDate: Date, period: 'week' | 'month' | 'year') => {
            const prevDate = new Date(referenceDate);
            if (period === 'week') prevDate.setDate(prevDate.getDate() - 7);
            else if (period === 'year') prevDate.setFullYear(prevDate.getFullYear() - 1);
            else prevDate.setMonth(prevDate.getMonth() - 1);
            return prevDate;
        };
        const currentRange = getPeriodRange(now, timeframe as 'week' | 'month' | 'year');
        const previousPeriodRefDate = getPreviousPeriodRefDate(now, timeframe as 'week' | 'month' | 'year');
        const previousRange = getPeriodRange(previousPeriodRefDate, timeframe as 'week' | 'month' | 'year');
        const calculateChange = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? Infinity : 0;
            return ((current - previous) / previous) * 100;
        };
        const flatten = (usersToFlatten: AdminManagedUser[]): AdminManagedUser[] => usersToFlatten.flatMap(u => [u, ...(u.children ? flatten(u.children) : [])]);
        const flatUsers = flatten(users);
        const currentNewUsers = flatUsers.filter(u => new Date(u.joinDate) >= currentRange.start && new Date(u.joinDate) <= currentRange.end).length;
        const previousNewUsers = flatUsers.filter(u => new Date(u.joinDate) >= previousRange.start && new Date(u.joinDate) <= previousRange.end).length;
        const newUsersChange = calculateChange(currentNewUsers, previousNewUsers);
        
        return {
            total: { value: flatUsers.length },
            new: { value: currentNewUsers, change: newUsersChange },
            active: { value: flatUsers.filter(u => u.status === UserStatus.Active).length },
            pending: { value: flatUsers.filter(u => u.status === UserStatus.PendingFee).length },
            suspended: { value: flatUsers.filter(u => u.status === UserStatus.Suspended).length },
        };
    }, [users, timeframe]);

    return (
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold">Tổng quan Người dùng</h3>
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                    <button onClick={() => setTimeframe('week')} className={`px-3 py-1 text-xs font-semibold rounded-md ${timeframe === 'week' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-500 dark:text-slate-400'}`}>Tuần</button>
                    <button onClick={() => setTimeframe('month')} className={`px-3 py-1 text-xs font-semibold rounded-md ${timeframe === 'month' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-500 dark:text-slate-400'}`}>Tháng</button>
                    <button onClick={() => setTimeframe('year')} className={`px-3 py-1 text-xs font-semibold rounded-md ${timeframe === 'year' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-500 dark:text-slate-400'}`}>Năm</button>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <UserStatCard title="Tổng thành viên" value={userStats.total.value.toLocaleString('vi-VN')} icon={<UsersIcon />} />
                <UserStatCard title="Người dùng mới" value={userStats.new.value.toLocaleString('vi-VN')} icon={<UserPlusIcon />} change={userStats.new.change} />
                <UserStatCard title="Đang hoạt động" value={userStats.active.value.toLocaleString('vi-VN')} icon={<ShieldCheckIcon />} />
                <UserStatCard title="Trễ phí" value={userStats.pending.value.toLocaleString('vi-VN')} icon={<ExclamationTriangleIcon />} />
            </div>
        </div>
    );
};

export default React.memo(UserOverviewWidget);