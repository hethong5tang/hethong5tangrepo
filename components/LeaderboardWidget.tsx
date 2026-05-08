
import React, { useMemo } from 'react';
import { AdminManagedUser, UserStatus } from '../features/users/types';
import { Transaction, TransactionType } from '../features/finance/types';
import { LeaderboardMetric } from '../features/settings/types';
import { TrophyIcon, GoldMedalIcon, SilverMedalIcon, BronzeMedalIcon } from './Icons';
import { useSettings } from '../features/settings/useSettings';
import { useUser } from '../features/users/useUser';
import { useFinance } from '../features/finance/useFinance';

const LeaderboardWidget: React.FC = () => {
    const { settingsState } = useSettings();
    const { userState } = useUser();
    const { financeState } = useFinance();
    const { allUsers } = userState;
    const { allTransactions } = financeState;
    const { leaderboardSettings, useLeaderboardMockData, leaderboardMockData } = settingsState.systemSettings;
    
    const { title, description, leaders: topLeaders, metric } = useMemo(() => {
        if (useLeaderboardMockData) {
            return {
                title: leaderboardMockData.title,
                description: leaderboardMockData.description,
                leaders: leaderboardMockData.leaders.slice(0, 10),
                metric: leaderboardMockData.metric,
            };
        }

        const { metric, timeframe } = leaderboardSettings;
        const now = new Date();
        let startDate: Date;

        switch (timeframe) {
            case 'monthly': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case 'quarterly': const quarter = Math.floor(now.getMonth() / 3); startDate = new Date(now.getFullYear(), quarter * 3, 1); break;
            case 'yearly': startDate = new Date(now.getFullYear(), 0, 1); break;
            default: startDate = new Date(0); break;
        }
        startDate.setHours(0, 0, 0, 0);
        
        const flattenUsers = (users: AdminManagedUser[]): AdminManagedUser[] => users.flatMap(u => [u, ...(u.children ? flattenUsers(u.children) : [])]);
        const allFlatUsers = flattenUsers(allUsers);

        const leadersWithScores = allFlatUsers
            .filter(user => user.status === UserStatus.Active)
            .map(user => {
                let score = 0;
                switch (metric) {
                    case LeaderboardMetric.F1Count: score = (user.children || []).filter(f1 => new Date(f1.joinDate) >= startDate).length; break;
                    /* Fixed: Changed NetworkSize to Network_size */
                    case LeaderboardMetric.Network_size: const allDescendants = user.children ? flattenUsers(user.children) : []; score = allDescendants.filter(u => new Date(u.joinDate) >= startDate).length; break;
                    case LeaderboardMetric.TotalEarnings: const commissionTypes = [TransactionType.CommissionParticipation, TransactionType.CommissionMaintenance, TransactionType.LeaderBonus, TransactionType.SupportFundPayout]; score = allTransactions.filter(t => t.userId === user.id && t.amount > 0 && commissionTypes.includes(t.type) && new Date(t.date) >= startDate).reduce((sum, t) => sum + t.amount, 0); break;
                }
                return { id: user.id, name: user.name, avatar: user.avatar, score };
            })
            .filter(leader => leader.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        
        return { title: leaderboardSettings.title, description: leaderboardSettings.description, leaders: leadersWithScores, metric };
    }, [allUsers, allTransactions, leaderboardSettings, useLeaderboardMockData, leaderboardMockData]);

    const medalIcons = [ <GoldMedalIcon className="h-6 w-6" />, <SilverMedalIcon className="h-6 w-6" />, <BronzeMedalIcon className="h-6 w-6" /> ];
    
    const formatScore = (score: number, metricToUse: LeaderboardMetric) => {
        const formattedScore = score.toLocaleString('vi-VN');
        switch (metricToUse) {
            case LeaderboardMetric.F1Count: return `${formattedScore} F1`;
            /* Fixed: Changed NetworkSize to Network_size */
            case LeaderboardMetric.Network_size: return `${formattedScore} TV`;
            case LeaderboardMetric.TotalEarnings: return `${formattedScore}đ`;
            default: return formattedScore;
        }
    };

    return (
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900/50 rounded-2xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 p-6 flex flex-col h-full relative overflow-hidden group">
            {/* Background elements */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-40 h-40 bg-amber-400/10 dark:bg-amber-400/5 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700"></div>
            
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 relative z-10">
                <h3 className="text-xl font-black flex items-center gap-3 text-slate-800 dark:text-white tracking-tight">
                    <div className="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-500/20 dark:to-orange-500/20 p-2.5 rounded-xl shadow-sm shadow-amber-500/10 border border-amber-200/50 dark:border-amber-500/20">
                        <TrophyIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span dangerouslySetInnerHTML={{ __html: title }} className="leading-tight" />
                </h3>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6 relative z-10 ml-14">{description}</p>
            
            <div className="space-y-2 flex-grow relative z-10">
                {topLeaders.length > 0 ? topLeaders.map((leader, index) => (
                    <div 
                        key={leader.id} 
                        className={`flex items-center justify-between gap-4 p-3 rounded-2xl transition-all duration-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 ${
                            index === 0 
                            ? 'bg-gradient-to-r from-amber-50/80 to-transparent dark:from-amber-900/10 dark:to-transparent border border-amber-200/60 dark:border-amber-700/30' 
                            : 'hover:shadow-sm'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-8 flex-shrink-0 flex items-center justify-center font-black">
                                {index === 0 ? (
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-yellow-400 blur-md opacity-40 rounded-full scale-150 animate-pulse"></div>
                                        <GoldMedalIcon className="h-8 w-8 relative z-10 drop-shadow-sm" />
                                    </div>
                                ) : index === 1 ? (
                                    <SilverMedalIcon className="h-7 w-7 drop-shadow-sm" />
                                ) : index === 2 ? (
                                    <BronzeMedalIcon className="h-7 w-7 drop-shadow-sm" />
                                ) : (
                                    <span className="text-slate-400 dark:text-slate-500 text-lg">{index + 1}</span>
                                )}
                            </div>
                            <div className="relative">
                                <img 
                                    src={leader.avatar} 
                                    alt={leader.name} 
                                    className={`h-11 w-11 rounded-full object-cover border-2 shadow-sm ${
                                        index === 0 ? 'border-amber-400 shadow-amber-400/20 p-0.5' 
                                        : index === 1 ? 'border-slate-300 shadow-slate-400/20' 
                                        : index === 2 ? 'border-amber-600 shadow-amber-600/20' 
                                        : 'border-transparent'
                                    }`} 
                                />
                                {index < 3 && (
                                    <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-[2.5px] border-white dark:border-slate-800 flex items-center justify-center text-[9px] font-black shadow-sm ${
                                        index === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' 
                                        : index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' 
                                        : 'bg-gradient-to-br from-amber-600 to-amber-700 text-white'
                                    }`}>
                                        {index + 1}
                                    </div>
                                )}
                            </div>
                            <p className={`font-bold truncate ${index === 0 ? 'text-amber-700 dark:text-amber-400 text-base' : 'text-slate-700 dark:text-slate-200 text-sm'}`}>
                                {leader.name}
                            </p>
                        </div>
                        <p className={`font-black flex-shrink-0 px-3 py-1 rounded-lg ${
                            index === 0 
                            ? 'text-amber-700 dark:text-amber-400 bg-amber-100/50 dark:bg-amber-900/30 text-sm border border-amber-200/50 dark:border-amber-700/30' 
                            : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-sm'
                        }`}>
                            {formatScore(leader.score, metric)}
                        </p>
                    </div>
                )) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 py-8">
                        <TrophyIcon className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                        <p className="font-medium">Chưa có dữ liệu xếp hạng.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(LeaderboardWidget);
