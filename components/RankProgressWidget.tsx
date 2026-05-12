
import React from 'react';
import { useAuth } from '../features/auth/useAuth';
import { useSettings } from '../features/settings/useSettings';
import { TrophyIcon } from './Icons';
import { LevelSetting } from '../features/settings/types';

const RankProgressWidget: React.FC = () => {
    const { loggedInUser: user } = useAuth();
    const { settingsState } = useSettings();
    const { levelSettings } = settingsState.systemSettings;

    if (!user || !levelSettings || levelSettings.length === 0) {
        return null;
    }

    const currentLevelInfo: LevelSetting | undefined = levelSettings.find(l => l.level === user.rankLevel);
    const nextLevelInfo: LevelSetting | undefined = levelSettings.find(l => l.level === user.rankLevel + 1);

    const currentLevelName = currentLevelInfo ? currentLevelInfo.name : 'Chưa có Cấp';
    
    // User is at the highest level
    if (user.rankLevel > 0 && !nextLevelInfo) {
        return (
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-full text-amber-500">
                        <TrophyIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                            Chúc mừng! Bạn đã đạt cấp bậc cao nhất: {currentLevelName}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Tổng thu nhập: <span className="font-semibold text-green-500">{user.totalEarnings.toLocaleString('vi-VN')}đ</span>
                        </p>
                    </div>
                </div>
            </div>
        );
    }
    
    const nextLevelData = nextLevelInfo || levelSettings[0];
    if(!nextLevelData) return null; 

    const currentLevelRequired = currentLevelInfo ? (currentLevelInfo.requiredGroupRevenue || currentLevelInfo.requiredEarnings || 0) : 0;
    const nextLevelRequired = nextLevelData.requiredGroupRevenue || nextLevelData.requiredEarnings || 0;
    
    const currentSales = user.currentLevelRevenue || 0;
    const earningsInCurrentLevel = currentSales - currentLevelRequired;
    const earningsForNextLevel = nextLevelRequired - currentLevelRequired;
    
    const progressPercentage = earningsForNextLevel > 0 ? (earningsInCurrentLevel / earningsForNextLevel) * 100 : 0;
    
    const neededForNext = Math.max(0, nextLevelRequired - currentSales);

    return (
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                        Cấp bậc hiện tại: <span className="text-indigo-500">{currentLevelName}</span>
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Doanh số nhóm: <span className="font-semibold text-green-500">{(user.currentLevelRevenue || 0).toLocaleString('vi-VN')}đ</span>
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Còn <span className="text-xl text-green-500">{(neededForNext || 0).toLocaleString('vi-VN')}đ</span> doanh số nữa để đạt cấp <span className="text-indigo-500">{nextLevelData.name}</span>
                    </p>
                </div>
            </div>
            <div className="mt-4">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                    <div
                        className="bg-gradient-to-r from-blue-400 to-indigo-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span>{(currentLevelRequired || 0).toLocaleString('vi-VN')}đ</span>
                    <span>{(nextLevelRequired || 0).toLocaleString('vi-VN')}đ</span>
                </div>
            </div>
        </div>
    );
};

export default RankProgressWidget;
