
import React from 'react';
import { useAuth } from '../features/auth/useAuth';
import { useSettings } from '../features/settings/useSettings';
import { Achievement, AchievementMetric } from '../features/settings/types';
import { SparklesIcon, CalendarIcon, TrophyIcon, GiftIcon } from './Icons';
import { motion } from 'motion/react';

const EventProgressWidget: React.FC = () => {
    const { loggedInUser: user } = useAuth();
    const { settingsState: { systemSettings } } = useSettings();

    if (!user) return null;

    const activeEvents = systemSettings.leaderAchievements.filter(ach => {
        if (!ach.isActive) return false;
        const now = new Date();
        const start = ach.startDate ? new Date(ach.startDate) : null;
        const end = ach.endDate ? new Date(ach.endDate) : null;
        
        if (start && now < start) return false;
        if (end && now > end) return false;
        
        return true;
    });

    if (activeEvents.length === 0) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-700 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 border border-indigo-400/30 dark:border-slate-700/50 rounded-3xl p-1 shadow-lg relative overflow-hidden"
        >
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl rounded-[22px] p-6 h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-fuchsia-500/10 dark:bg-fuchsia-500/20 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-xl">
                            <TrophyIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
                            Sự kiện đang diễn ra
                        </h3>
                    </div>
                    <span className="text-xs font-bold text-indigo-800 dark:text-indigo-200 bg-indigo-100 dark:bg-indigo-900/50 px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm ring-1 ring-indigo-200/50 dark:ring-indigo-700/50">
                        {activeEvents.length} Sự kiện
                    </span>
                </div>

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {activeEvents.map((event) => {
                        let current = 0;
                        if (event.rule.metric === AchievementMetric.F1Count) current = user.f1Count || 0;
                        else if (event.rule.metric === AchievementMetric.NetworkSize) current = user.networkSize || 0;
                        else if (event.rule.metric === AchievementMetric.TotalEarnings) current = user.totalEarnings || 0;

                        const target = event.rule.target;
                        const progress = Math.min(100, (current / target) * 100);
                        const remaining = Math.max(0, target - current);
                        
                        const metricLabel = {
                            [AchievementMetric.F1Count]: 'F1 mới',
                            [AchievementMetric.NetworkSize]: 'thành viên mới',
                            [AchievementMetric.TotalEarnings]: 'VNĐ doanh thu',
                        }[event.rule.metric];

                        return (
                            <motion.div 
                                key={event.id}
                                whileHover={{ y: -4 }}
                                className="relative bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200/60 dark:border-slate-700/60 group hover:shadow-xl transition-all duration-300 flex flex-col"
                            >
                                <div className="flex items-start gap-4 mb-5">
                                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0 transform group-hover:scale-110 transition-transform duration-300">
                                        {event.customIconUrl ? (
                                            <img src={event.customIconUrl} alt={event.name} className="h-8 w-8 object-contain drop-shadow-md" />
                                        ) : (
                                            <SparklesIcon className="h-7 w-7 text-white" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate text-base mb-1">{event.name}</h4>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 line-clamp-1">
                                            {event.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mb-6">
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50 px-2.5 py-1 rounded-md uppercase tracking-wider border border-slate-200 dark:border-slate-700">
                                        <CalendarIcon className="h-3.5 w-3.5" />
                                        KT: {event.endDate ? new Date(event.endDate).toLocaleDateString('vi-VN') : 'Không hạn'}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-md uppercase tracking-wider border border-amber-200 dark:border-amber-800/50">
                                        <GiftIcon className="h-3.5 w-3.5" />
                                        Thưởng: {event.bonusAmount?.toLocaleString('vi-VN')}đ
                                    </div>
                                </div>

                                <div className="mt-auto">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className={`text-sm font-black ${progress >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                            {progress >= 100 ? 'Đã hoàn thành!' : `Còn thiếu ${remaining.toLocaleString('vi-VN')} ${metricLabel}`}
                                        </span>
                                        <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md">
                                            {current.toLocaleString('vi-VN')} / {target.toLocaleString('vi-VN')}
                                        </span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50 shadow-inner">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                                            className={`h-full rounded-full ${progress >= 100 ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </motion.div>
    );
};

export default EventProgressWidget;
