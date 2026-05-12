import React, { useState, useMemo } from 'react';
import { SystemSettings, CommissionSetting } from '../features/settings/types';
import { MembershipTier } from '../features/users/types';
import { CurrencyDollarIcon, UserGroupIcon, TrophyIcon, CheckCircleIcon, XCircleIcon } from './Icons';
import { useSettings } from '../features/settings/useSettings';

import FormattedNumberInput from './FormattedNumberInput';

interface IncomeEstimatorProps {
    systemSettings: SystemSettings;
}

const IncomeEstimator: React.FC<IncomeEstimatorProps> = ({ systemSettings }) => {
    const { settingsState } = useSettings();
    const { tierSettings } = settingsState.systemSettings;
    const [selectedTier, setSelectedTier] = useState<MembershipTier>(MembershipTier.Starter);
    const [f1Count, setF1Count] = useState<number>(1);
    const [replicationFactor, setReplicationFactor] = useState<number>(1);
    const [activeTab, setActiveTab] = useState<'participation' | 'maintenance'>('participation');


    const simulationResults = useMemo(() => {
        const isParticipation = activeTab === 'participation';
        const { participation, maintenance } = systemSettings.profitSettings;

        const totalAllocationPercentage = isParticipation
            ? participation.adminWallet + (participation.vat || 10) + (participation.corporateTax || 3) + participation.leaderBonusFund + participation.supportFund
            : maintenance.adminWallet + (maintenance.vat || 10) + (maintenance.corporateTax || 3) + maintenance.leaderBonusFund + maintenance.supportFund;

        const baseFeeStarter = isParticipation ? systemSettings.participationFee : systemSettings.maintenanceFee;
        const baseFeePro = isParticipation ? systemSettings.proParticipationFee : systemSettings.proMaintenanceFee;
        const baseFeeMaster = isParticipation ? systemSettings.masterParticipationFee : systemSettings.masterMaintenanceFee;

        const commissionSettings = isParticipation 
            ? systemSettings.commissionSettings.participationCommissions 
            : systemSettings.commissionSettings.maintenanceCommissions;

        const levelDetails = [];
        let totalIncomeStarter = 0;
        let totalIncomePro = 0;
        let totalIncomeMaster = 0;
        let totalNetworkSize = 0;
        let membersAtPreviousLevel = 1;

        for (const [index, setting] of commissionSettings.entries()) {
            const level = index + 1;
            const levelName = setting.level;
            const membersAtLevel = level === 1 ? (f1Count || 0) : membersAtPreviousLevel * (replicationFactor || 0);
            
            const commissionPercentage = setting.percentage;
            
            const incomeAtLevelStarter = membersAtLevel * baseFeeStarter * (commissionPercentage / 100);
            const incomeAtLevelPro = membersAtLevel * baseFeePro * (commissionPercentage / 100);
            const incomeAtLevelMaster = membersAtLevel * baseFeeMaster * (commissionPercentage / 100);

            levelDetails.push({
                level: levelName,
                members: membersAtLevel,
                percentage: commissionPercentage,
                incomeStarter: incomeAtLevelStarter,
                incomePro: incomeAtLevelPro,
                incomeMaster: incomeAtLevelMaster,
            });

            totalIncomeStarter += incomeAtLevelStarter;
            totalIncomePro += incomeAtLevelPro;
            totalIncomeMaster += incomeAtLevelMaster;
            totalNetworkSize += membersAtLevel;
            membersAtPreviousLevel = membersAtLevel;
        }
        
        const sortedBonuses = [...systemSettings.leaderMilestoneBonuses].sort((a, b) => a.networkSize - b.networkSize);
        const achievedBonuses = sortedBonuses.filter(b => totalNetworkSize >= b.networkSize);
        const totalBonusAmount = achievedBonuses.reduce((sum, b) => sum + b.bonusAmount, 0);

        const nextBonus = sortedBonuses.find(b => totalNetworkSize < b.networkSize);
        let nextBonusProgress = 0;
        if (nextBonus) {
            const lastAchievedBonusSize = achievedBonuses.length > 0 ? achievedBonuses[achievedBonuses.length - 1].networkSize : 0;
            const progress = totalNetworkSize - lastAchievedBonusSize;
            const target = nextBonus.networkSize - lastAchievedBonusSize;
            if (target > 0) {
                nextBonusProgress = (progress / target) * 100;
            }
        }
        
        let totalCommissionIncome = 0;
        switch (selectedTier) {
            case MembershipTier.Starter: totalCommissionIncome = totalIncomeStarter; break;
            case MembershipTier.Pro: totalCommissionIncome = totalIncomePro; break;
            case MembershipTier.Master: totalCommissionIncome = totalIncomeMaster; break;
        }

        return { 
            levelDetails, 
            totalIncomeStarter,
            totalIncomePro,
            totalIncomeMaster,
            totalNetworkSize,
            achievedBonuses,
            totalBonusAmount,
            nextBonus,
            nextBonusProgress,
            totalPotentialIncome: totalCommissionIncome + totalBonusAmount
        };

    }, [selectedTier, f1Count, replicationFactor, systemSettings, activeTab]);

    return (
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Công cụ Mô phỏng Thu nhập</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
                Mô phỏng tiềm năng thu nhập từ hoa hồng {activeTab === 'participation' ? 'phí đăng ký' : 'phí thuê bao'} khi mạng lưới của bạn phát triển theo cấp số nhân.
            </p>

            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('participation')}
                        className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'participation'
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-200 dark:hover:border-slate-600'
                        }`}
                    >
                        Chiết khấu Đăng ký
                    </button>
                    <button
                        onClick={() => setActiveTab('maintenance')}
                        className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'maintenance'
                                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-200 dark:hover:border-slate-600'
                        }`}
                    >
                        Chiết khấu Thuê bao
                    </button>
                </nav>
            </div>
            
            {/* Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-6 p-4 bg-slate-100/50 dark:bg-slate-900/20 rounded-lg border border-slate-200 dark:border-slate-700">
                <div>
                    <label htmlFor="package-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Gói thành viên của bạn</label>
                    <select
                        id="package-select"
                        value={selectedTier}
                        onChange={(e) => setSelectedTier(e.target.value as MembershipTier)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        {tierSettings.starter.visible && <option value={MembershipTier.Starter}>{tierSettings.starter.name} ({(activeTab === 'participation' ? systemSettings.participationFee : systemSettings.maintenanceFee).toLocaleString('vi-VN')}đ)</option>}
                        {tierSettings.pro.visible && <option value={MembershipTier.Pro}>{tierSettings.pro.name} ({(activeTab === 'participation' ? systemSettings.proParticipationFee : systemSettings.proMaintenanceFee).toLocaleString('vi-VN')}đ)</option>}
                        {tierSettings.master.visible && <option value={MembershipTier.Master}>{tierSettings.master.name} ({(activeTab === 'participation' ? systemSettings.masterParticipationFee : systemSettings.masterMaintenanceFee).toLocaleString('vi-VN')}đ)</option>}
                    </select>
                </div>
                <div>
                    <label htmlFor="f1-count-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Số F1 bạn giới thiệu</label>
                    <div className="relative mt-1">
                        <FormattedNumberInput
                            value={f1Count}
                            onChange={(val) => setF1Count(val)}
                            className="block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm focus:ring-indigo-500 focus:border-indigo-500 pr-8"
                        />
                        {f1Count > 0 && (
                            <button
                                type="button"
                                onClick={() => setF1Count(0)}
                                className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600"
                            >
                                <XCircleIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>
                 <div>
                    <label htmlFor="replication-factor-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Số F1 trung bình / người</label>
                     <div className="relative mt-1">
                        <FormattedNumberInput
                            value={replicationFactor}
                            onChange={(val) => setReplicationFactor(val)}
                            className="block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white sm:text-sm focus:ring-indigo-500 focus:border-indigo-500 pr-8"
                        />
                         {replicationFactor > 0 && (
                            <button
                                type="button"
                                onClick={() => setReplicationFactor(0)}
                                className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600"
                            >
                                <XCircleIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Results */}
            <div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left">Tầng</th>
                                <th scope="col" className="px-4 py-3 text-right">Số TV</th>
                                <th scope="col" className="px-4 py-3 text-right">Tỷ lệ HH</th>
                                {tierSettings.starter.visible && <th scope="col" className="px-4 py-3 text-right">Thu nhập ({tierSettings.starter.name})</th>}
                                {tierSettings.pro.visible && <th scope="col" className="px-4 py-3 text-right">Thu nhập ({tierSettings.pro.name})</th>}
                                {tierSettings.master.visible && <th scope="col" className="px-4 py-3 text-right">Thu nhập ({tierSettings.master.name})</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
                            {simulationResults.levelDetails.map(item => (
                                <tr key={item.level} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.level}</td>
                                    <td className="px-4 py-3 text-right">{item.members.toLocaleString('vi-VN')}</td>
                                    <td className="px-4 py-3 text-right">{item.percentage}%</td>
                                    {tierSettings.starter.visible && <td className="px-4 py-3 text-right font-semibold text-green-600 dark:text-green-400">{item.incomeStarter.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ</td>}
                                    {tierSettings.pro.visible && <td className="px-4 py-3 text-right font-semibold text-blue-600 dark:text-blue-400">{item.incomePro.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ</td>}
                                    {tierSettings.master.visible && <td className="px-4 py-3 text-right font-semibold text-amber-600 dark:text-amber-400">{item.incomeMaster.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ</td>}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-300 dark:border-slate-600">
                            <tr className="font-bold text-slate-900 dark:text-white">
                                <td colSpan={3} className="px-4 py-3 text-left">Tổng Hoa hồng</td>
                                {tierSettings.starter.visible && <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">{simulationResults.totalIncomeStarter.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ</td>}
                                {tierSettings.pro.visible && <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">{simulationResults.totalIncomePro.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ</td>}
                                {tierSettings.master.visible && <td className="px-4 py-3 text-right text-amber-600 dark:text-amber-400">{simulationResults.totalIncomeMaster.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ</td>}
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Bonus Section */}
                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <h3 className="font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2 mb-4">
                        <TrophyIcon className="h-5 w-5" /> Thưởng Mốc Leader
                    </h3>
                    {simulationResults.achievedBonuses.length > 0 && (
                         <div className="space-y-2 mb-4">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Đã chinh phục:</p>
                            {simulationResults.achievedBonuses.map(bonus => (
                                <div key={bonus.id} className="flex items-center justify-between text-sm p-2 bg-green-100/50 dark:bg-green-900/30 rounded-md">
                                    <span className="flex items-center gap-1.5 text-green-800 dark:text-green-300"><CheckCircleIcon className="h-4 w-4"/>Mốc {bonus.networkSize.toLocaleString('vi-VN')} thành viên</span>
                                    <span className="font-semibold text-green-600 dark:text-green-400">+{bonus.bonusAmount.toLocaleString('vi-VN')}đ</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {simulationResults.nextBonus && (
                        <div>
                             <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Mục tiêu tiếp theo:</p>
                             <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 mt-1">
                                 <span>Mốc {simulationResults.nextBonus.networkSize.toLocaleString('vi-VN')} thành viên</span>
                                 <span>+{simulationResults.nextBonus.bonusAmount.toLocaleString('vi-VN')}đ</span>
                             </div>
                             <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-1">
                                 <div className="bg-gradient-to-r from-yellow-400 to-amber-500 h-2 rounded-full" style={{ width: `${simulationResults.nextBonusProgress}%` }}></div>
                             </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 flex items-center gap-4">
                        <div className="p-3 bg-indigo-200 dark:bg-indigo-500/30 rounded-full text-indigo-600 dark:text-indigo-300">
                             <UserGroupIcon className="h-6 w-6"/>
                        </div>
                        <div>
                            <p className="text-sm text-indigo-800 dark:text-indigo-200">Tổng quy mô mạng lưới</p>
                            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                {simulationResults.totalNetworkSize.toLocaleString('vi-VN')}
                            </p>
                        </div>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 flex items-center gap-4">
                        <div className="p-3 bg-green-200 dark:bg-green-500/30 rounded-full text-green-600 dark:text-green-300">
                            <CurrencyDollarIcon className="h-6 w-6"/>
                        </div>
                        <div>
                            <p className="text-sm text-green-800 dark:text-green-200">Tổng Thu nhập (Gói {tierSettings[selectedTier]?.name || selectedTier})</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                {simulationResults.totalPotentialIncome.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(IncomeEstimator);