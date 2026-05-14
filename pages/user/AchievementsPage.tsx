
import React, { useMemo } from 'react';
import { AdminManagedUser } from '../../features/users/types';
import { UserGroupIcon, CurrencyDollarIcon, UsersIcon, TrophyIcon, BanknotesIcon, ArrowTrendingUpIcon, CheckIcon, CrownIcon, CalendarIcon, GiftIcon } from '../../components/Icons';
import { useSettings } from '../../features/settings/useSettings';
import { Achievement, AchievementMetric } from '../../features/settings/types';
import { useAuth } from '../../features/auth/useAuth';

const achievementIcons: { [key: string]: React.FC<{ className?: string }> } = {
    UserGroupIcon,
    CurrencyDollarIcon,
    UsersIcon,
    TrophyIcon,
    BanknotesIcon,
    ArrowTrendingUpIcon,
    CrownIcon,
    CalendarIcon,
    GiftIcon
};

const getUnitForMetric = (metric: AchievementMetric) => {
    switch(metric) {
        case AchievementMetric.F1Count: return ' F1';
        case AchievementMetric.NetworkSize: return ' TV';
        case AchievementMetric.TotalEarnings: return 'đ';
        default: return '';
    }
};

const calculateAchievementProgress = (user: AdminManagedUser, achievement: Achievement) => {
    const { metric, target } = achievement.rule;
    const currentValue = (user[metric as keyof AdminManagedUser] as number) || 0;
    
    return {
        earned: currentValue >= target,
        progress: target > 0 ? Math.min((currentValue / target) * 100, 100) : 0,
        currentValue,
        targetValue: target,
        unit: getUnitForMetric(metric)
    };
};

const AchievementCard: React.FC<{ achievement: Achievement & { status: ReturnType<typeof calculateAchievementProgress> } }> = ({ achievement }) => {
    const Icon = achievementIcons[achievement.icon] || TrophyIcon;
    const { earned, progress, currentValue, targetValue, unit } = achievement.status;

    // Use a special style for rank-based achievements (typically identified by CrownIcon)
    const isRankAchievement = achievement.icon === 'CrownIcon';
    const isEvent = !!achievement.startDate || !!achievement.bonusAmount;

    // Determine event status icon color
    let eventBadge = null;
    if (isEvent) {
        const now = new Date();
        const start = achievement.startDate ? new Date(achievement.startDate) : null;
        const end = achievement.endDate ? new Date(achievement.endDate) : null;
        const isActive = achievement.isActive ?? true;

        if (!isActive) {
            eventBadge = { text: 'BỊ TẠM DỪNG', style: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' };
        } else if (start && now < start) {
            eventBadge = { text: 'SẮP DIỄN RA', style: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' };
        } else if (end && now > end) {
            eventBadge = { text: 'ĐÃ KẾT THÚC', style: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800' };
        } else if (end && (end.getTime() - now.getTime()) <= 3 * 24 * 60 * 60 * 1000) {
            eventBadge = { text: 'SẮP KẾT THÚC', style: 'bg-amber-500 text-white border-amber-400 shadow-md shadow-amber-500/40 animate-pulse' };
        } else {
            eventBadge = { text: 'ĐANG DIỄN RA', style: 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/40 animate-pulse' };
        }
    }

    const isActiveEvent = isEvent && (eventBadge?.text === 'ĐANG DIỄN RA' || eventBadge?.text === 'SẮP KẾT THÚC');

    return (
        <div
            className={`relative p-5 sm:p-6 rounded-2xl sm:rounded-[24px] transition-all duration-300 flex flex-col h-full group ${
                earned
                    ? 'bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-500/20 shadow-xl shadow-indigo-100/50 dark:shadow-indigo-900/20 hover:shadow-2xl hover:-translate-y-1 z-10'
                    : isActiveEvent
                        ? `bg-white dark:bg-slate-800 border-2 shadow-lg hover:-translate-y-1 ${eventBadge?.text === 'SẮP KẾT THÚC' ? 'border-amber-400/60 dark:border-amber-500/50 shadow-amber-100/40 dark:shadow-amber-900/20 hover:border-amber-400 hover:shadow-amber-200/50' : 'border-emerald-400/60 dark:border-emerald-500/50 shadow-emerald-100/40 dark:shadow-emerald-900/20 hover:border-emerald-400 hover:shadow-emerald-200/50'}`
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 opacity-80 hover:opacity-100 grayscale-[80%] hover:grayscale-0 hover:shadow-lg hover:-translate-y-0.5'
            } ${isRankAchievement && earned ? 'border-amber-200 dark:border-amber-500/30 shadow-amber-100/50 dark:shadow-amber-900/20' : ''} ${isEvent && earned ? 'border-emerald-200 dark:border-emerald-500/30 shadow-emerald-100/50' : ''}`}
        >
            {/* Soft background glow for earned */}
            {earned && (
                 <div className={`absolute inset-0 rounded-[24px] opacity-10 pointer-events-none ${isRankAchievement ? 'bg-gradient-to-br from-amber-400 to-orange-500' : isEvent ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-indigo-400 to-purple-500'}`}></div>
            )}

            {eventBadge && (
                <div className={`absolute top-4 left-4 px-2.5 py-1 text-[10px] font-bold rounded-full border shadow-sm z-10 uppercase tracking-wide ${eventBadge.style}`}>
                    {eventBadge.text}
                </div>
            )}

            {earned && (
                <div className={`absolute top-4 right-4 px-3 py-1 text-[10px] sm:text-xs font-black text-white rounded-full flex items-center gap-1.5 shadow-sm ${isRankAchievement ? 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-amber-500/30' : isEvent ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/30' : 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-indigo-500/30'}`}>
                    <CheckIcon className="h-3 w-3" /> ĐÃ ĐẠT
                </div>
            )}

            <div className={`flex items-start gap-4 ${eventBadge ? 'mt-7' : ''} relative z-10`}>
                <div className={`h-14 w-14 sm:h-16 sm:w-16 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-sm ${
                    earned 
                        ? (isRankAchievement ? 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700' 
                            : isEvent ? 'bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700' 
                            : 'bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700') 
                        : isActiveEvent
                            ? `bg-slate-50 dark:bg-slate-800 ${eventBadge?.text === 'SẮP KẾT THÚC' ? 'text-amber-500 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50' : 'text-emerald-500 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'}`
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 opacity-60 group-hover:opacity-100'
                }`}>
                    {achievement.customIconUrl ? (
                        <img src={achievement.customIconUrl} alt={achievement.name} className={`h-8 w-8 sm:h-10 sm:w-10 object-contain ${earned || isActiveEvent ? '' : 'opacity-60 saturate-50'}`} />
                    ) : (
                        Icon && <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
                    )}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                    <h3 className={`font-bold text-base sm:text-lg tracking-tight leading-tight mb-1.5 line-clamp-2 ${earned ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-slate-100'}`}>{achievement.name}</h3>
                    <p className={`text-xs sm:text-sm line-clamp-2 ${earned ? 'text-slate-600 dark:text-slate-400' : 'text-slate-500 dark:text-slate-400'}`}>{achievement.description}</p>
                </div>
            </div>
            
            {isEvent && (
                <div className="mt-5 flex flex-wrap items-center gap-2 relative z-10">
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        KT: {achievement.endDate ? new Date(achievement.endDate).toLocaleDateString('vi-VN') : 'Không hạn'}
                    </div>
                    {achievement.bonusAmount && (
                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-lg border border-amber-200/50 dark:border-amber-700/30">
                            <GiftIcon className="h-3.5 w-3.5" />
                            +{achievement.bonusAmount.toLocaleString('vi-VN')}đ
                        </div>
                    )}
                </div>
            )}
            
            <div className="flex-grow"></div>

            <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 relative z-10">
                {!earned ? (
                     <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end text-xs sm:text-sm">
                            <span className="font-semibold text-slate-500 dark:text-slate-400">Đã đạt <span className="text-indigo-600 dark:text-indigo-400">{progress.toFixed(0)}%</span></span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                                {currentValue.toLocaleString('vi-VN')}<span className="text-slate-400 font-medium text-[10px] sm:text-xs ml-0.5">{unit}</span> <span className="text-slate-300 dark:text-slate-600 mx-1">/</span> {targetValue.toLocaleString('vi-VN')}<span className="text-slate-400 font-medium text-[10px] sm:text-xs ml-0.5">{unit}</span>
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 sm:h-3 overflow-hidden ring-1 ring-inset ring-slate-200/50 dark:ring-slate-700/50">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 relative overflow-hidden ${isRankAchievement ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-indigo-400 to-indigo-600'}`}
                                style={{ width: `${Math.max(progress, 2)}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite] -skew-x-12"></div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                         <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Yêu cầu hoàn thành:</span>
                         <span className="text-sm font-black text-slate-800 dark:text-slate-200">{targetValue.toLocaleString('vi-VN')}{unit}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

const AchievementCategory: React.FC<{ title: string; achievements: (Achievement & { status: ReturnType<typeof calculateAchievementProgress> })[] }> = ({ title, achievements }) => {
    if (achievements.length === 0) return null;
    return (
        <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2 inline-block">{title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                {achievements.map(ach => <AchievementCard key={ach.id} achievement={ach} />)}
            </div>
        </div>
    );
};


const AchievementsPage: React.FC = () => {
    const { loggedInUser: user } = useAuth();
    const { settingsState } = useSettings();
    const { systemSettings } = settingsState;
    const { leaderAchievements, levelSettings } = systemSettings;

    // 1. Generate Achievements automatically from Levels
    const rankAchievements: Achievement[] = useMemo(() => {
        return levelSettings
            .filter(lvl => (lvl.requiredGroupRevenue || lvl.requiredEarnings || 0) > 0) // Skip base level if 0
            .map(lvl => ({
                id: `rank_auto_${lvl.level}`,
                name: `Chinh phục ${lvl.name}`,
                description: `Đạt cột mốc tổng thu nhập ${(lvl.requiredGroupRevenue || lvl.requiredEarnings || 0).toLocaleString('vi-VN')}đ để thăng cấp.`,
                icon: 'CrownIcon',
                customIconUrl: undefined,
                weight: lvl.level,
                rule: {
                    metric: AchievementMetric.TotalEarnings,
                    target: lvl.requiredGroupRevenue || lvl.requiredEarnings || 0
                }
            }));
    }, [levelSettings]);

    if (!user) {
        return null;
    }

    // 2. Merge with manual achievements
    const allAchievements = [...rankAchievements, ...leaderAchievements];

    const achievementsStatus = allAchievements.map(ach => ({
        ...ach,
        status: calculateAchievementProgress(user, ach)
    }));
    
    const earnedCount = achievementsStatus.filter(s => s.status.earned).length;
    const totalCount = achievementsStatus.length;
    const overallProgress = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;
    
    // Categorize achievements
    // Rank Achievements (Auto-generated)
    const rankCategory = achievementsStatus.filter(a => a.id.startsWith('rank_auto_')).sort((a,b) => a.rule.target - b.rule.target);
    
    // Other Categories (Manual)
    const recruitmentAchievements = achievementsStatus.filter(a => !a.id.startsWith('rank_auto_') && a.rule.metric === AchievementMetric.F1Count);
    const networkAchievements = achievementsStatus.filter(a => !a.id.startsWith('rank_auto_') && a.rule.metric === AchievementMetric.NetworkSize);
    const otherFinanceAchievements = achievementsStatus.filter(a => !a.id.startsWith('rank_auto_') && a.rule.metric === AchievementMetric.TotalEarnings);

    return (
        <div className="space-y-8 pb-10">
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 tracking-tight">Thành Tích & Sự Kiện</h2>
                </div>

                <div className="relative overflow-hidden rounded-[32px] bg-indigo-900 border border-indigo-800/50 shadow-2xl p-8 sm:p-10 z-0">
                    {/* Background decorations */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4 pointer-events-none"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
                        <div className="flex-1 text-center md:text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-indigo-100 text-xs font-bold uppercase tracking-wider mb-4 backdrop-blur-md">
                                <CrownIcon className="h-4 w-4 text-amber-400" />
                                Hành trình Leo Rank
                            </div>
                            <h3 className="text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight">Cột mốc vinh quang</h3>
                            <p className="text-indigo-200 text-sm sm:text-base max-w-xl mx-auto md:mx-0 leading-relaxed">
                                Đạt các cột mốc doanh thu để thăng cấp, mở khóa quyền lợi đặc biệt và nhận thưởng từ Quỹ Leader độc quyền.
                            </p>
                        </div>

                        <div className="w-full md:w-[320px] shrink-0 bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl">
                            <div className="flex justify-between items-end mb-4">
                                <div className="text-indigo-100 text-sm font-semibold">Tiến độ chung</div>
                                <div className="text-right">
                                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-orange-400">
                                        {overallProgress.toFixed(0)}<span className="text-lg">%</span>
                                    </span>
                                </div>
                            </div>
                            <div className="relative w-full h-3 bg-indigo-950/50 rounded-full overflow-hidden border border-indigo-900/50">
                                <div 
                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${Math.max(overallProgress, 2)}%` }}
                                >
                                    <div className="absolute inset-0 bg-white/30 w-full h-full animate-[shimmer_2s_infinite] -skew-x-12"></div>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs font-medium text-indigo-200">
                                <span><strong className="text-white">{earnedCount}</strong> đã đạt</span>
                                <span><strong className="text-white">{totalCount - earnedCount}</strong> chưa đạt</span>
                            </div>
                        </div>
                    </div>
                </div>

                <AchievementCategory title="Sự Kiện Đặc Biệt" achievements={achievementsStatus.filter(a => !a.id.startsWith('rank_auto_') && (!!a.startDate || !!a.bonusAmount))} />
                <AchievementCategory title="Cột Mốc Thăng Hạng (Auto)" achievements={rankCategory} />
                <AchievementCategory title="Danh Hiệu Thành Tích" achievements={recruitmentAchievements.concat(networkAchievements).filter(a => !a.startDate && !a.bonusAmount)} />
                {otherFinanceAchievements.length > 0 && <AchievementCategory title="Thành Tích Tài Chính Khác" achievements={otherFinanceAchievements.filter(a => !a.startDate && !a.bonusAmount)} />}
            </div>
        </div>
    );
};

export default AchievementsPage;
