
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { FundTransaction, FundType, FundStatus, MilestoneBonusRequest, MilestoneBonusRequestStatus, TransactionType, Transaction, TransactionStatus } from '../../features/finance/types';
import { FundSettings, SupportFundTierSetting, Achievement, AchievementMetric } from '../../features/settings/types';
import { AdminManagedUser, UserStatus, MembershipTier } from '../../features/users/types';
import Pagination from '../../components/Pagination';
import { ArrowPathIcon, Cog6ToothIcon, CheckCircleIcon, XCircleIcon, DocumentArrowDownIcon, CalendarDaysIcon, ChevronDownIcon, TrophyIcon, UserGroupIcon, InformationCircleIcon, SparklesIcon, EyeIcon, ExclamationTriangleIcon, HeartIcon, MagnifyingGlassIcon, BanknotesIcon, CurrencyDollarIcon } from '../../components/Icons';
import { isEqual } from 'lodash-es';
import Modal from '../../components/Modal';
import { useToast } from '../../components/ToastProvider';
import { exportToCsv } from '../../utils/exportUtils';
import RowsPerPageSelector from '../../components/RowsPerPageSelector';
import { useActions } from '../../features/actions/useActions';
import FormattedNumberInput from '../../components/FormattedNumberInput';
import { useFinance } from '../../features/finance/useFinance';
import { useSettings } from '../../features/settings/useSettings';
import { useUser } from '../../features/users/useUser';
import { TierBadge, RankLevelBadge } from '../../components/Badges';

const leaderFundData = [
  { name: 'Top BXH', value: 60000000 },
  { name: 'Mốc thưởng', value: 30000000 },
  { name: 'Doanh thu F11+', value: 10000000 },
];
const COLORS = ['#4f46e5', '#818cf8', '#a78bfa'];

interface FundCardProps {
    title: string;
    statusData: FundStatus;
    onDistribute: () => void;
    children: React.ReactNode;
    extraHeader?: React.ReactNode;
}

const FundCard: React.FC<FundCardProps> = ({ title, statusData, onDistribute, children, extraHeader }) => {
    const totalFlow = statusData.totalIn + Math.abs(statusData.totalOut);
    const inflowPercentage = totalFlow > 0 ? (statusData.totalIn / totalFlow) * 100 : 0;

    return (
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 flex flex-col h-full border border-slate-200 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
                    {extraHeader}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onDistribute} className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-full hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30 flex items-center gap-1">
                        <SparklesIcon className="h-3 w-3" /> Chi trả
                    </button>
                </div>
            </div>

            <div className="p-6 flex-grow flex flex-col">
                <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">{statusData.balance.toLocaleString('vi-VN')}đ</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Số dư hiện tại</p>

                <div className="space-y-2 mb-4">
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                        <div className="bg-gradient-to-r from-green-400 to-blue-500 h-2.5 rounded-full" style={{ width: `${inflowPercentage}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Thu: <span className="font-semibold text-green-500">{statusData.totalIn.toLocaleString('vi-VN')}đ</span></span>
                        <span>Chi: <span className="font-semibold text-red-500">{statusData.totalOut.toLocaleString('vi-VN')}đ</span></span>
                    </div>
                </div>
                
                <div className="flex-grow flex items-center justify-center">{children}</div>
            </div>
        </div>
    );
};

// --- NEW COMPONENT: PAGINATED TABLE FOR PREVIEWS ---
interface PaginatedPreviewTableProps<T> {
    data: T[];
    title: React.ReactNode;
    renderHeader: () => React.ReactNode;
    renderRow: (item: T, index: number) => React.ReactNode;
    renderFooter?: (pageData: T[]) => React.ReactNode;
    filterFunction?: (item: T, searchTerm: string) => boolean;
}

function PaginatedPreviewTable<T>({ data, title, renderHeader, renderRow, renderFooter, filterFunction }: PaginatedPreviewTableProps<T>) {
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const pageSize = 5;

    const filteredData = useMemo(() => {
        if (!searchTerm || !filterFunction) return data;
        return data.filter(item => filterFunction(item, searchTerm));
    }, [data, searchTerm, filterFunction]);

    const totalPages = Math.ceil(filteredData.length / pageSize);
    const paginatedData = filteredData.slice((page - 1) * pageSize, page * pageSize);

    // Reset page when search changes
    useEffect(() => {
        setPage(1);
    }, [searchTerm]);

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-end mb-2">
                <div className="text-sm">{title}</div>
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Tìm thành viên..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-7 pr-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 focus:ring-1 focus:ring-indigo-500 outline-none w-40"
                    />
                </div>
            </div>
            
            <div className="border rounded-lg overflow-hidden border-slate-200 dark:border-slate-700">
                <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 font-bold uppercase text-slate-500">
                        {renderHeader()}
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((item, index) => renderRow(item, index))
                        ) : (
                            <tr>
                                <td colSpan={10} className="px-4 py-4 text-center text-slate-400 italic">
                                    Không tìm thấy dữ liệu phù hợp.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {renderFooter && paginatedData.length > 0 && (
                        <tfoot className="bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                            {renderFooter(paginatedData)}
                        </tfoot>
                    )}
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex justify-end pt-1">
                    <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                </div>
            )}
        </div>
    );
}

interface LeaderPayoutItem {
    user: AdminManagedUser;
    reason: string;
    payoutAmount: number;
    isFixed?: boolean; 
}

interface SupportPayoutItem {
    user: AdminManagedUser;
    payoutAmount: number;
    remainingTotalLimit: number;
    totalSupportReceived: number;
    totalLimit: number;
}

const FundManagementPage: React.FC = () => {
    const { financeState: { fundStatus, fundTransactions, allTransactions } } = useFinance();
    const { settingsState: { systemSettings, fundSettings } } = useSettings();
    const { userState: { allUsers: users } } = useUser();
    const { handleProcessSupportFundPayout: onProcessSupportFund, handleProcessLeaderFundPayout: onProcessLeaderFundPayout } = useActions();

    const { addToast } = useToast();
    const [viewingTransaction, setViewingTransaction] = useState<FundTransaction | null>(null);
    const [isLeaderMechanismOpen, setIsLeaderMechanismOpen] = useState(false);
    const [isSupportMechanismOpen, setIsSupportMechanismOpen] = useState(false);

    const leaderMechanismContent = useMemo(() => {
        const { participation } = systemSettings.profitSettings;
        const { participationCommissions } = systemSettings.commissionSettings;
        const totalCommission = participationCommissions.reduce((sum: number, c: any) => sum + c.percentage, 0);
        const adminFunds = participation.adminWallet + (participation.vat || 10) + (participation.corporateTax || 3) + participation.leaderBonusFund + participation.supportFund;

        return (
            <div className="space-y-6 text-sm">
                <section className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                        <ArrowPathIcon className="h-4 w-4 text-indigo-500" />
                        1. Cơ chế Phân bổ (40/60)
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400 mb-4 text-xs">
                        Toàn bộ các loại phí (Tham gia & Duy trì) được tự động phân bổ theo tỷ lệ 40% cho Quỹ & Admin, 60% cho Hoa hồng Hệ thống:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-bold text-emerald-500 uppercase flex justify-between">
                                <span>Hoa hồng Hệ thống (60%)</span>
                                <span>Tỷ lệ</span>
                            </p>
                            <ul className="mt-2 space-y-1">
                                {participationCommissions.map((c: any) => (
                                    <li key={c.level} className="flex justify-between text-xs">
                                        <span className="text-slate-500">{c.level}:</span>
                                        <span className="font-bold">{c.percentage}%</span>
                                    </li>
                                ))}
                                <li className="pt-1 border-t flex justify-between font-bold text-slate-700 dark:text-slate-300 text-xs">
                                    <span>Tổng cộng:</span>
                                    <span>{totalCommission}%</span>
                                </li>
                            </ul>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 shadow-sm">
                            <p className="text-[10px] font-bold text-indigo-500 uppercase flex justify-between">
                                <span>Phân bổ Quỹ & Admin (40%)</span>
                                <span>Tỷ lệ</span>
                            </p>
                            <ul className="mt-2 space-y-1">
                                <li className="flex justify-between text-xs">
                                    <span className="text-slate-500">Thuế (VAT + TNDN):</span>
                                    <span className="font-bold">{(participation.vat || 10) + (participation.corporateTax || 3)}%</span>
                                </li>
                                <li className="flex justify-between text-xs">
                                    <span className="text-slate-500">Ví Admin:</span>
                                    <span className="font-bold">{participation.adminWallet}%</span>
                                </li>
                                <li className="flex justify-between text-xs">
                                    <span className="text-slate-500">Quỹ Thưởng Leader:</span>
                                    <span className="font-bold">{participation.leaderBonusFund}%</span>
                                </li>
                                <li className="flex justify-between text-xs">
                                    <span className="text-slate-500">Quỹ Hỗ trợ:</span>
                                    <span className="font-bold">{participation.supportFund}%</span>
                                </li>
                                <li className="pt-1 border-t flex justify-between font-bold text-slate-700 dark:text-slate-300 text-xs">
                                    <span>Tổng cộng:</span>
                                    <span>{adminFunds}%</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                        <TrophyIcon className="h-4 w-4 text-amber-500" />
                        2. Cơ chế Chi trả Quỹ Leader
                    </h4>
                    <div className="space-y-4">
                        <div className="p-4 bg-amber-50/50 dark:bg-amber-900/10 rounded-lg border border-amber-100">
                            <h5 className="font-bold text-amber-700 dark:text-amber-400 text-[10px] uppercase mb-2">Đồng chia Bể Quỹ (Theo Danh hiệu)</h5>
                            <p className="text-[11px] text-amber-600 dark:text-amber-500 mb-3 italic">
                                * Tổng Quỹ Leader thu được từ doanh thu hệ thống sẽ được phân loại thành các Bể (Pools) theo % thiết lập, chia đều cho danh sách thành viên đạt cấp độ trong kỳ.
                            </p>
                            <div className="max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                                <table className="w-full text-[11px] text-left">
                                    <thead className="text-amber-800 dark:text-amber-300 bg-amber-100/50">
                                        <tr>
                                            <th className="p-2 sticky top-0 bg-amber-50">Cấp bậc</th>
                                            <th className="p-2 text-right sticky top-0 bg-amber-50">Doanh thu yêu cầu</th>
                                            <th className="p-2 text-right sticky top-0 bg-amber-50">Đồng chia Quỹ</th>
                                            <th className="p-2 text-center sticky top-0 bg-amber-50">Nhánh</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-amber-100">
                                        {systemSettings.levelSettings.filter((s:any) => s.level > 1).map((lvl: any) => (
                                            <tr key={lvl.level}>
                                                <td className="p-2 text-amber-900 dark:text-amber-200 font-medium">{lvl.name}</td>
                                                <td className="p-2 text-right font-mono">{(lvl.requiredGroupRevenue || lvl.requiredEarnings || 0).toLocaleString()}đ</td>
                                                <td className="p-2 text-right font-bold text-orange-600">{lvl.rewardPercentage}% Quỹ</td>
                                                <td className="p-2 text-center">
                                                    {lvl.branchRequirements.map((r: any, i: number) => (
                                                        <span key={i} className="px-1.5 py-0.5 rounded-full bg-amber-200/50 text-[10px] whitespace-nowrap inline-block mr-1">
                                                            {r.count}n. C.{r.targetLevel}
                                                        </span>
                                                    ))}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-lg border border-indigo-100">
                            <h5 className="font-bold text-indigo-700 dark:text-indigo-400 text-[10px] uppercase mb-2">Thưởng Vinh danh (Cố định 1 lần)</h5>
                            <p className="text-[11px] text-indigo-600 dark:text-indigo-500 mb-3 italic">
                                * Được chi trả 1 lần duy nhất ngay khi thành viên thăng cấp (ví dụ Cúp, Chuyến du lịch hoặc tiền mặt).
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {systemSettings.levelSettings.filter((s:any) => !!s.honorAward).map((lvl: any) => (
                                    <div key={lvl.level} className="p-2 bg-white dark:bg-slate-800 rounded border border-indigo-100 flex justify-between items-center">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{lvl.name}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-indigo-600 font-bold text-xs">{lvl.honorAward}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        );
    }, [systemSettings]);

    const supportMechanismContent = useMemo(() => {
        const { supportFundSettings } = fundSettings;
        return (
            <div className="space-y-6 text-sm">
                <section className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                    <h4 className="font-bold text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-2 text-base">
                        <HeartIcon className="h-5 w-5 text-emerald-500" />
                        Cơ chế Quỹ Hỗ trợ
                    </h4>
                    <p className="text-slate-600 dark:text-slate-400 mb-4 text-xs">
                        Dành cho những thành viên Active đang trong quá trình xây dựng hệ thống (chưa có hoa hồng F1).
                    </p>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 flex items-center gap-2">
                                <div className="p-1 bg-emerald-100 rounded-full"><CheckCircleIcon className="h-3 w-3 text-emerald-600" /></div>
                                <span className="text-[11px] font-medium">Trạng thái: Active</span>
                            </div>
                            <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 flex items-center gap-2">
                                <div className="p-1 bg-emerald-100 rounded-full"><CheckCircleIcon className="h-3 w-3 text-emerald-600" /></div>
                                <span className="text-[11px] font-medium">Số lượng F1 = 0</span>
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Hạn mức tối đa được nhận (Tổng cộng)</p>
                            <div className="border border-emerald-100 rounded-lg overflow-hidden">
                                <table className="w-full text-[11px] text-left">
                                    <thead className="bg-emerald-50 dark:bg-emerald-950 font-bold">
                                        <tr>
                                            <th className="px-4 py-2">Gói thành viên</th>
                                            <th className="px-4 py-2 text-right">Tổng hạn mức</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-emerald-100 bg-white dark:bg-slate-900">
                                        {Object.entries(supportFundSettings).map(([tier, settings]: [any, any]) => (
                                            <tr key={tier}>
                                                <td className="px-4 py-3"><TierBadge tier={tier} /></td>
                                                <td className="px-4 py-3 text-right font-bold text-emerald-600">{settings.totalPayoutLimit.toLocaleString()}đ</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 shadow-sm">
                            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 mb-2">Quy định chi trả:</p>
                            <ul className="text-[11px] text-slate-500 list-disc pl-4 space-y-1 italic">
                                <li>Phát đều cho toàn bộ thành viên thỏa điều kiện dựa trên số dư quỹ thực tế.</li>
                                <li>Dừng hỗ trợ ngay khi có phát sinh 01 thành viên F1 trực tiếp.</li>
                                <li>Tiền thưởng được cộng trực tiếp vào Số dư Ví chính.</li>
                            </ul>
                        </div>
                    </div>
                </section>
            </div>
        );
    }, [fundSettings]);

    // --- FILTERS FOR FUND TRANSACTION HISTORY ---
    const [fundFilter, setFundFilter] = useState<FundType | 'all'>(FundType.Admin);
    const [typeFilter, setTypeFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [minAmount, setMinAmount] = useState<string>('');
    const [maxAmount, setMaxAmount] = useState<string>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [historySearch, setHistorySearch] = useState('');
    const [historyPage, setHistoryPage] = useState(1);
    const [historyRowsPerPage, setHistoryRowsPerPage] = useState(10);

    const filteredFundHistory = useMemo(() => {
        return fundTransactions
            .filter(t => {
                const matchFund = fundFilter === 'all' || t.fund === fundFilter;
                const matchType = typeFilter === 'all' || t.type === typeFilter;
                const matchCategory = categoryFilter === 'all' || t.description.toLowerCase().includes(categoryFilter.toLowerCase());
                
                const min = minAmount ? Number(minAmount.replace(/[^0-9]/g, '')) : -Infinity;
                const max = maxAmount ? Number(maxAmount.replace(/[^0-9]/g, '')) : Infinity;
                const matchAmount = Math.abs(t.amount) >= min && Math.abs(t.amount) <= max;

                const matchSearch = t.description.toLowerCase().includes(historySearch.toLowerCase()) || 
                                  t.id.toLowerCase().includes(historySearch.toLowerCase());
                
                // Date filtering logic
                let matchDate = true;
                if (startDate || endDate) {
                    const datePart = t.date.split(' ')[0];
                    const parts = datePart ? datePart.split('/') : [];
                    
                    if (parts.length === 3) {
                        const [d, m, y] = parts;
                        const txDateOnly = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                        
                        if (startDate && txDateOnly < startDate) matchDate = false;
                        if (endDate && matchDate && txDateOnly > endDate) matchDate = false;
                    } else {
                        // Nếu không đúng định dạng DD/MM/YYYY, có thể đây là định dạng ISO YYYY-MM-DD
                        const isoDatePart = datePart; 
                        if (isoDatePart.includes('-')) {
                            if (startDate && isoDatePart < startDate) matchDate = false;
                            if (endDate && matchDate && isoDatePart > endDate) matchDate = false;
                        } else {
                            // Nếu không xác định được định dạng, mặc định không khớp nếu có bộ lọc
                            matchDate = false;
                        }
                    }
                }

                return matchFund && matchType && matchSearch && matchDate && matchCategory && matchAmount;
            });
    }, [fundTransactions, fundFilter, typeFilter, historySearch, startDate, endDate, categoryFilter, minAmount, maxAmount]);

    const totalHistoryPages = Math.ceil(filteredFundHistory.length / historyRowsPerPage);
    const paginatedHistory = filteredFundHistory.slice((historyPage - 1) * historyRowsPerPage, historyPage * historyRowsPerPage);

    useEffect(() => {
        setHistoryPage(1);
    }, [fundFilter, typeFilter, historySearch, historyRowsPerPage, startDate, endDate, categoryFilter, minAmount, maxAmount]);
    
    // Preview States
    const [leaderPayoutPreview, setLeaderPayoutPreview] = useState<{ 
        fixedLeaders: LeaderPayoutItem[]; 
        totalFixed: number;
        poolLeaders: LeaderPayoutItem[];
        totalPool: number;
        availableBalance: number;
    } | null>(null);

    const [supportPayoutPreview, setSupportPayoutPreview] = useState<{
        users: SupportPayoutItem[];
        totalPayout: number;
        availableBalance: number;
    } | null>(null);

    const [isDistributing, setIsDistributing] = useState(false);

    // --- LEADER FUND LOGIC ---
    const calculateAllLeaderPayouts = () => {
         const leaderFund = fundStatus[FundType.LeaderBonus];
         
         const flattenUsers = (list: AdminManagedUser[]): AdminManagedUser[] => list.flatMap(u => [u, ...(u.children ? flattenUsers(u.children) : [])]);
         const allFlatUsers = flattenUsers(users);
         const { levelSettings } = systemSettings;

         let fixedLeaders: LeaderPayoutItem[] = [];
         let totalFixed = 0;

         let remainingBalance = leaderFund.balance - totalFixed;
         let poolLeaders: LeaderPayoutItem[] = [];
         let totalPool = 0;

         if (remainingBalance > 0) {
             const totalRewardPercentage = levelSettings.reduce((sum: number, lvl: any) => sum + (lvl.rewardPercentage || 0), 0);
             
             if (totalRewardPercentage > 0) {
                 levelSettings.forEach((lvl: any) => {
                     if (!lvl.rewardPercentage || lvl.rewardPercentage <= 0) return;
                     
                     const usersInLevel = allFlatUsers.filter(u => u.status === UserStatus.Active && u.rankLevel === lvl.level);
                     if (usersInLevel.length > 0) {
                         const poolAmount = (remainingBalance * (lvl.rewardPercentage / totalRewardPercentage));
                         const payoutPerUser = Math.floor(poolAmount / usersInLevel.length);

                         if (payoutPerUser > 0) {
                             usersInLevel.forEach(u => {
                                 poolLeaders.push({
                                     user: u,
                                     reason: `Đồng chia Quỹ (Danh hiệu ${lvl.name})`,
                                     payoutAmount: payoutPerUser,
                                     isFixed: false
                                 });
                                 totalPool += payoutPerUser;
                             });
                         }
                     }
                 });
             }
         }

         setLeaderPayoutPreview({
            fixedLeaders,
            totalFixed,
            poolLeaders,
            totalPool,
            availableBalance: leaderFund.balance
         });
    };

    // --- SUPPORT FUND LOGIC ---
    const calculateSupportPayouts = () => {
        const supportFund = fundStatus[FundType.Support];
        let availableBalance = supportFund.balance;

        const flattenUsers = (list: AdminManagedUser[]): AdminManagedUser[] => list.flatMap(u => [u, ...(u.children ? flattenUsers(u.children) : [])]);
        const allFlatUsers = flattenUsers(users);
        const { supportFundSettings } = fundSettings;

        const eligibleCandidates = allFlatUsers.filter(u => {
            const tier = u.membershipTier === MembershipTier.None ? MembershipTier.Starter : u.membershipTier;
            const userSupportSettings = supportFundSettings[tier as keyof typeof supportFundSettings];
            return u.f1Count === 0 &&
                   u.status === UserStatus.Active &&
                   u.totalSupportReceived < userSupportSettings.totalPayoutLimit;
        });

        const payoutList: SupportPayoutItem[] = [];
        let totalPayout = 0;

        for (const user of eligibleCandidates) {
            if (availableBalance <= 0) break;

            const tier = user.membershipTier === MembershipTier.None ? MembershipTier.Starter : user.membershipTier;
            const userSupportSettings = supportFundSettings[tier as keyof typeof supportFundSettings];
            const remainingTotalLimit = userSupportSettings.totalPayoutLimit - user.totalSupportReceived;
            
            // Mỗi lần chi tối đa bằng hạn mức tổng còn lại hoặc số dư quỹ
            const payoutAmount = Math.min(remainingTotalLimit, availableBalance);

            if (payoutAmount > 0) {
                payoutList.push({
                    user,
                    payoutAmount,
                    remainingTotalLimit,
                    totalSupportReceived: user.totalSupportReceived,
                    totalLimit: userSupportSettings.totalPayoutLimit
                });
                totalPayout += payoutAmount;
                availableBalance -= payoutAmount;
            }
        }

        setSupportPayoutPreview({
            users: payoutList,
            totalPayout,
            availableBalance: supportFund.balance
        });
    };


    const handleConfirmLeaderPayout = async () => {
        if (!leaderPayoutPreview) return;
        
        if (leaderPayoutPreview.availableBalance < leaderPayoutPreview.totalFixed) {
            addToast("Quỹ không đủ chi trả các khoản cố định. Vui lòng nạp thêm.", "error");
            return;
        }

        setIsDistributing(true);
        
        const allItems = [...leaderPayoutPreview.fixedLeaders, ...leaderPayoutPreview.poolLeaders].filter(i => i.payoutAmount > 0);
        
        if (allItems.length === 0) {
             addToast("Không có khoản chi nào trong đợt này.", "info");
             setIsDistributing(false);
             setLeaderPayoutPreview(null);
             return;
        }

        const payoutData = allItems.map(l => ({
            userId: l.user.id,
            user: { name: l.user.name, avatar: l.user.avatar },
            amount: l.payoutAmount,
            reason: l.isFixed ? `Thưởng Vinh danh: ${l.reason}` : l.reason,
            metadata: { 
                leaderBonus: { 
                    isFixed: l.isFixed 
                } 
            }
        }));

        onProcessLeaderFundPayout(payoutData, `Chi thưởng Leader - Đợt ${new Date().toLocaleDateString('vi-VN')}`);
        setIsDistributing(false);
        setLeaderPayoutPreview(null);
    };

    const handleConfirmSupportPayout = () => {
        if (!supportPayoutPreview) return;
        if (supportPayoutPreview.users.length === 0) {
            addToast("Không có thành viên nào đủ điều kiện hoặc quỹ đã hết.", "info");
            setSupportPayoutPreview(null);
            return;
        }

        setIsDistributing(true);
        onProcessSupportFund(); // Function in useActions handles the logic again for safety, ideally we pass data but keeping existing pattern
        setIsDistributing(false);
        setSupportPayoutPreview(null);
    };

    // --- VIEW HISTORY DETAIL LOGIC ---
    const historicalDetail = useMemo(() => {
        if (!viewingTransaction) return null;

        if (viewingTransaction.fund === FundType.LeaderBonus) {
            // Filter allTransactions for LeaderBonus on the same date
            // Note: Ideally, we'd use a batch ID, but date + type is a decent proxy for this demo
            const relatedTransactions = allTransactions.filter(t => 
                t.type === TransactionType.LeaderBonus && 
                t.date === viewingTransaction.date
            );
            
            const fixedLeaders = relatedTransactions
                .filter(t => t.metadata?.leaderBonus?.isFixed)
                .map(t => ({
                    user: t.user ? { ...t.user, id: t.userId } : { name: 'Unknown', id: t.userId },
                    reason: t.description,
                    payoutAmount: t.amount,
                    isFixed: true
                }));
            
            const poolLeaders = relatedTransactions
                .filter(t => !t.metadata?.leaderBonus?.isFixed)
                .map(t => ({
                    user: t.user ? { ...t.user, id: t.userId } : { name: 'Unknown', id: t.userId },
                    reason: t.description,
                    payoutAmount: t.amount,
                    isFixed: false
                }));

            return {
                type: 'leader',
                data: {
                    fixedLeaders,
                    poolLeaders,
                    totalFixed: fixedLeaders.reduce((sum: number, i: any) => sum + i.payoutAmount, 0),
                    totalPool: poolLeaders.reduce((sum: number, i: any) => sum + i.payoutAmount, 0),
                    totalAmount: Math.abs(viewingTransaction.amount)
                }
            };
        } else if (viewingTransaction.fund === FundType.Support || viewingTransaction.description.includes('Chi thưởng sự kiện')) {
            // Check if metadata exists with users list (preferred for batch payouts)
            if (viewingTransaction.metadata?.users) {
                return {
                    type: viewingTransaction.description.includes('Chi thưởng sự kiện') ? 'event' : 'support',
                    data: {
                        users: viewingTransaction.metadata.users,
                        totalAmount: Math.abs(viewingTransaction.amount)
                    }
                };
            }

            // Fallback: filter allTransactions
            const isEvent = viewingTransaction.description.includes('Chi thưởng sự kiện');
            const relatedTransactions = allTransactions.filter(t => 
                (isEvent ? true : t.type === TransactionType.SupportFundPayout) && 
                t.date === viewingTransaction.date &&
                t.description === viewingTransaction.description
            );
            
            return {
                type: isEvent ? 'event' : 'support',
                data: {
                    users: relatedTransactions.map(t => ({
                        user: t.user ? { ...t.user, id: t.userId } : { name: 'Unknown', id: t.userId },
                        payoutAmount: t.amount,
                        reason: t.description
                    })),
                    totalAmount: Math.abs(viewingTransaction.amount)
                }
            };
        }
        return null;
    }, [viewingTransaction, allTransactions]);


    return (
        <div className="space-y-6">
            <Modal isOpen={isLeaderMechanismOpen} onClose={() => setIsLeaderMechanismOpen(false)} title="Cơ chế Quỹ Thưởng Leader" size="3xl" hideFooter>
                {leaderMechanismContent}
            </Modal>

            <Modal isOpen={isSupportMechanismOpen} onClose={() => setIsSupportMechanismOpen(false)} title="Cơ chế Quỹ Hỗ Trợ" size="2xl" hideFooter>
                {supportMechanismContent}
            </Modal>

            {/* PREVIEW MODAL: LEADER FUND */}
            {leaderPayoutPreview && (
                <Modal isOpen={!!leaderPayoutPreview} onClose={() => setLeaderPayoutPreview(null)} title="Phê duyệt chi thưởng Leader" size="5xl" onConfirm={handleConfirmLeaderPayout} confirmText={isDistributing ? "Đang xử lý..." : "Xác nhận Chi trả"} isConfirmDisabled={isDistributing || (leaderPayoutPreview.availableBalance < leaderPayoutPreview.totalFixed)}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200">
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Quỹ Hiện Có</p>
                                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{leaderPayoutPreview.availableBalance.toLocaleString()}đ</p>
                            </div>
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100">
                                <p className="text-[10px] font-bold text-blue-500 uppercase">Cần chi Cố Định</p>
                                <p className={`text-xl font-bold ${leaderPayoutPreview.availableBalance < leaderPayoutPreview.totalFixed ? 'text-red-600' : 'text-blue-700 dark:text-blue-300'}`}>{leaderPayoutPreview.totalFixed.toLocaleString()}đ</p>
                                <p className="text-[10px] text-blue-400 mt-1">{leaderPayoutPreview.fixedLeaders.length} mốc thưởng thăng hạng mới</p>
                            </div>
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 ring-2 ring-emerald-500/50">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase">TỔNG CHI ĐỢT NÀY</p>
                                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{(leaderPayoutPreview.totalFixed + leaderPayoutPreview.totalPool).toLocaleString()}đ</p>
                            </div>
                        </div>

                        {leaderPayoutPreview.availableBalance < leaderPayoutPreview.totalFixed && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm font-semibold border border-red-200">
                                <ExclamationTriangleIcon className="h-5 w-5" />
                                Quỹ hiện tại không đủ để trả các mốc thăng cấp bắt buộc. Vui lòng nạp thêm quỹ.
                            </div>
                        )}

                        <div className="space-y-6">
                            {leaderPayoutPreview.fixedLeaders.length > 0 && (
                                <PaginatedPreviewTable 
                                    data={leaderPayoutPreview.fixedLeaders}
                                    title={<h4 className="text-xs font-bold text-blue-500 uppercase flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full"></div>Thưởng Vinh danh (Cố định 1 lần)</h4>}
                                    filterFunction={(item: any, term) => item.user.name.toLowerCase().includes(term.toLowerCase())}
                                    renderHeader={() => (
                                        <tr><th className="px-4 py-2">Thành viên</th><th className="px-4 py-2">Danh hiệu</th><th className="px-4 py-2 text-right">Tiền thưởng</th></tr>
                                    )}
                                    renderRow={(l, i) => (
                                        <tr key={i}><td className="px-4 py-2 font-medium">{l.user.name}</td><td className="px-4 py-2 text-blue-500 font-semibold">{l.reason.replace('Thăng cấp: ', '')}</td><td className="px-4 py-2 text-right font-bold text-green-600">+{l.payoutAmount.toLocaleString()}đ</td></tr>
                                    )}
                                    renderFooter={() => (
                                         <tr className="font-bold text-slate-900 dark:text-white">
                                            <td colSpan={2} className="px-4 py-2 text-right uppercase text-[10px]">Tổng Cố định:</td>
                                            <td className="px-4 py-2 text-right text-indigo-600 dark:text-indigo-400">{leaderPayoutPreview.totalFixed.toLocaleString()}đ</td>
                                        </tr>
                                    )}
                                />
                            )}

                            {leaderPayoutPreview.poolLeaders.length > 0 && (
                                <PaginatedPreviewTable 
                                    data={leaderPayoutPreview.poolLeaders}
                                    title={<h4 className="text-xs font-bold text-orange-500 uppercase flex items-center gap-2"><div className="w-2 h-2 bg-orange-500 rounded-full"></div>Đồng chia Bể Quỹ Leader</h4>}
                                    filterFunction={(item: any, term) => item.user.name.toLowerCase().includes(term.toLowerCase())}
                                    renderHeader={() => (
                                        <tr><th className="px-4 py-2">Thành viên</th><th className="px-4 py-2">Bể chia (Danh hiệu)</th><th className="px-4 py-2 text-right">Tiền thưởng</th></tr>
                                    )}
                                    renderRow={(l, i) => (
                                        <tr key={i}><td className="px-4 py-2 font-medium">{l.user.name}</td><td className="px-4 py-2 text-orange-500 font-semibold">{l.reason.replace('Đồng chia Quỹ (Danh hiệu ', '').replace(')', '')}</td><td className="px-4 py-2 text-right font-bold text-green-600">+{l.payoutAmount.toLocaleString()}đ</td></tr>
                                    )}
                                    renderFooter={() => (
                                         <tr className="font-bold text-slate-900 dark:text-white">
                                            <td colSpan={2} className="px-4 py-2 text-right uppercase text-[10px]">Tổng Đồng chia Quỹ:</td>
                                            <td className="px-4 py-2 text-right text-orange-600 dark:text-orange-400">{leaderPayoutPreview.totalPool.toLocaleString()}đ</td>
                                        </tr>
                                    )}
                                />
                            )}

                            {leaderPayoutPreview.fixedLeaders.length === 0 && leaderPayoutPreview.poolLeaders.length === 0 && (
                                <div className="text-center py-10 text-slate-500 italic">
                                    Không có mốc thăng cấp nào mới hoặc không có ai đủ điều kiện nhận Bể chia thưởng kỳ này.
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* PREVIEW MODAL: SUPPORT FUND */}
            {supportPayoutPreview && (
                 <Modal isOpen={!!supportPayoutPreview} onClose={() => setSupportPayoutPreview(null)} title="Phê duyệt chi Quỹ Hỗ Trợ" size="4xl" onConfirm={handleConfirmSupportPayout} confirmText={isDistributing ? "Đang xử lý..." : "Xác nhận Chi trả"} isConfirmDisabled={isDistributing || supportPayoutPreview.users.length === 0}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200">
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Quỹ Hiện Có</p>
                                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{supportPayoutPreview.availableBalance.toLocaleString()}đ</p>
                            </div>
                             <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100">
                                <p className="text-[10px] font-bold text-emerald-500 uppercase">Tổng Chi Đợt Này</p>
                                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{supportPayoutPreview.totalPayout.toLocaleString()}đ</p>
                                <p className="text-[10px] text-emerald-500 mt-1">Cho {supportPayoutPreview.users.length} thành viên</p>
                            </div>
                        </div>

                        {supportPayoutPreview.users.length > 0 ? (
                            <PaginatedPreviewTable 
                                data={supportPayoutPreview.users}
                                title={<span className="font-bold text-emerald-600">Danh sách thành viên nhận hỗ trợ</span>}
                                filterFunction={(item: any, term) => item.user.name.toLowerCase().includes(term.toLowerCase())}
                                renderHeader={() => (
                                    <tr><th className="px-4 py-2">Thành viên</th><th className="px-4 py-2">Gói</th><th className="px-4 py-2 text-center">Đã nhận / Hạn mức</th><th className="px-4 py-2 text-right">Nhận đợt này</th></tr>
                                )}
                                renderRow={(item, i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-2 font-medium">{item.user.name}</td>
                                        <td className="px-4 py-2"><TierBadge tier={item.user.membershipTier} /></td>
                                        <td className="px-4 py-2 text-center text-slate-500 font-mono">{item.totalSupportReceived.toLocaleString()} / {item.totalLimit.toLocaleString()}</td>
                                        <td className="px-4 py-2 text-right font-bold text-green-600">+{item.payoutAmount.toLocaleString()}đ</td>
                                    </tr>
                                )}
                            />
                        ) : (
                            <div className="text-center py-10 text-slate-500 italic bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                <HeartIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>Không có thành viên nào đủ điều kiện nhận hỗ trợ (0 F1, Active) hoặc Quỹ đã hết.</p>
                            </div>
                        )}
                    </div>
                 </Modal>
            )}

            {/* HISTORY DETAIL MODAL */}
            {viewingTransaction && historicalDetail && (
                <Modal 
                    isOpen={!!viewingTransaction} 
                    onClose={() => setViewingTransaction(null)} 
                    title={`Chi tiết Giao dịch: ${viewingTransaction.description}`} 
                    size="5xl" 
                    hideFooter
                >
                    <div className="space-y-6">
                        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Ngày giao dịch</p>
                                <p className="font-bold text-slate-800 dark:text-slate-200">{viewingTransaction.date}</p>
                            </div>
                             <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 text-right">Tổng chi</p>
                                <p className="font-bold text-red-600 text-xl">{historicalDetail.data.totalAmount.toLocaleString()}đ</p>
                            </div>
                        </div>

                        {historicalDetail.type === 'leader' && (
                             <div className="space-y-6">
                                {/* @ts-ignore */}
                                {historicalDetail.data.fixedLeaders.length > 0 && (
                                     <PaginatedPreviewTable<any>
                                        data={historicalDetail.data.fixedLeaders as any[]}
                                        title={<h4 className="text-xs font-bold text-blue-500 uppercase flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full"></div>1. Thưởng thăng hạng (Cố định)</h4>}
                                        filterFunction={(item: any, term) => item.user.name.toLowerCase().includes(term.toLowerCase())}
                                        renderHeader={() => (
                                            <tr><th className="px-4 py-2">Thành viên</th><th className="px-4 py-2">Lý do</th><th className="px-4 py-2 text-right">Tiền thưởng</th></tr>
                                        )}
                                        renderRow={(l: any, i) => (
                                            <tr key={i}><td className="px-4 py-2 font-medium">{l.user.name}</td><td className="px-4 py-2 text-slate-500">{l.reason.replace('Thưởng Leader: ', '')}</td><td className="px-4 py-2 text-right font-bold text-green-600">+{l.payoutAmount.toLocaleString()}đ</td></tr>
                                        )}
                                        renderFooter={() => (
                                            <tr className="font-bold text-slate-900 dark:text-white">
                                                <td colSpan={2} className="px-4 py-2 text-right uppercase text-[10px]">Tổng cố định:</td>
                                                {/* @ts-ignore */}
                                                <td className="px-4 py-2 text-right text-indigo-600 dark:text-indigo-400">{historicalDetail.data.totalFixed.toLocaleString()}đ</td>
                                            </tr>
                                        )}
                                    />
                                )}
                                
                                {/* @ts-ignore */}
                                {historicalDetail.data.poolLeaders.length > 0 && (
                                     <PaginatedPreviewTable<any> 
                                        data={historicalDetail.data.poolLeaders as any[]}
                                        title={<h4 className="text-xs font-bold text-orange-500 uppercase flex items-center gap-2"><div className="w-2 h-2 bg-orange-500 rounded-full"></div>2. Đồng chia Bể Quỹ</h4>}
                                        filterFunction={(item: any, term) => item.user.name.toLowerCase().includes(term.toLowerCase())}
                                        renderHeader={() => (
                                            <tr><th className="px-4 py-2">Thành viên</th><th className="px-4 py-2">Lý do</th><th className="px-4 py-2 text-right">Tiền thưởng</th></tr>
                                        )}
                                        renderRow={(l: any, i) => (
                                            <tr key={i}>
                                                <td className="px-4 py-2 font-medium">{l.user.name}</td>
                                                <td className="px-4 py-2 text-slate-500">{l.reason.replace('Thưởng Quỹ: ', '')}</td>
                                                <td className="px-4 py-2 text-right font-bold text-green-600">+{l.payoutAmount.toLocaleString()}đ</td>
                                            </tr>
                                        )}
                                        renderFooter={() => (
                                            <tr className="font-bold text-slate-900 dark:text-white">
                                                <td colSpan={2} className="px-4 py-2 text-right uppercase text-[10px]">Tổng Bể chia:</td>
                                                {/* @ts-ignore */}
                                                <td className="px-4 py-2 text-right text-orange-600 dark:text-orange-400">{historicalDetail.data.totalPool.toLocaleString()}đ</td>
                                            </tr>
                                        )}
                                    />
                                )}
                             </div>
                        )}

                        {historicalDetail.type === 'support' && (
                             <div>
                                <PaginatedPreviewTable<any> 
                                    data={historicalDetail.data.users as any[]}
                                    title={<h4 className="text-xs font-bold text-emerald-500 uppercase flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div>Danh sách thành viên nhận hỗ trợ</h4>}
                                    filterFunction={(item: any, term) => item.user.name.toLowerCase().includes(term.toLowerCase())}
                                    renderHeader={() => (
                                        <tr><th className="px-4 py-2">STT</th><th className="px-4 py-2">Thành viên</th><th className="px-4 py-2 text-right">Số tiền nhận</th></tr>
                                    )}
                                    renderRow={(u: any, i) => (
                                        <tr key={i}>
                                            <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                                            <td className="px-4 py-2 font-medium">{u.user.name}</td>
                                            <td className="px-4 py-2 text-right font-bold text-green-600">+{u.payoutAmount.toLocaleString()}đ</td>
                                        </tr>
                                    )}
                                />
                             </div>
                        )}

                        {historicalDetail.type === 'event' && (
                             <div>
                                <PaginatedPreviewTable<any> 
                                    data={historicalDetail.data.users as any[]}
                                    title={<h4 className="text-xs font-bold text-amber-500 uppercase flex items-center gap-2"><div className="w-2 h-2 bg-amber-500 rounded-full"></div>Danh sách thành viên đạt giải sự kiện</h4>}
                                    filterFunction={(item: any, term) => item.user.name.toLowerCase().includes(term.toLowerCase())}
                                    renderHeader={() => (
                                        <tr><th className="px-4 py-2">STT</th><th className="px-4 py-2">Thành viên</th><th className="px-4 py-2 text-right">Tiền thưởng</th></tr>
                                    )}
                                    renderRow={(u: any, i) => (
                                        <tr key={i}>
                                            <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                                            <td className="px-4 py-2 font-medium">{u.user.name}</td>
                                            <td className="px-4 py-2 text-right font-bold text-green-600">+{u.payoutAmount.toLocaleString()}đ</td>
                                        </tr>
                                    )}
                                />
                             </div>
                        )}
                    </div>
                </Modal>
            )}

            <div className="flex flex-wrap justify-between items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Quản lý Quỹ</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FundCard 
                    title="Quỹ Thưởng Leader" 
                    statusData={fundStatus[FundType.LeaderBonus]} 
                    onDistribute={() => calculateAllLeaderPayouts()}
                    extraHeader={(
                        <button 
                            onClick={() => setIsLeaderMechanismOpen(true)}
                            className="p-1 text-slate-400 hover:text-indigo-500 transition-colors"
                            title="Xem cơ chế Quỹ Leader"
                        >
                            <InformationCircleIcon className="h-5 w-5" />
                        </button>
                    )}
                >
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart><Pie data={leaderFundData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" nameKey="name">{leaderFundData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip formatter={(v: number) => `${v.toLocaleString()}đ`} /><Legend wrapperStyle={{fontSize: '12px'}} /></PieChart>
                    </ResponsiveContainer>
                </FundCard>
                <FundCard 
                    title="Quỹ Hỗ Trợ" 
                    statusData={fundStatus[FundType.Support]} 
                    onDistribute={() => calculateSupportPayouts()}
                    extraHeader={(
                        <button 
                            onClick={() => setIsSupportMechanismOpen(true)}
                            className="p-1 text-slate-400 hover:text-pink-500 transition-colors"
                            title="Xem cơ chế Quỹ Hỗ trợ"
                        >
                            <InformationCircleIcon className="h-5 w-5" />
                        </button>
                    )}
                >
                    <div className="w-full space-y-4">
                        {Object.entries(fundSettings.supportFundSettings).map(([tier, s]) => {
                            const setting = s as SupportFundTierSetting;
                            return (
                                <div key={tier} className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                                    <p className="font-semibold text-sm capitalize">{tier}</p>
                                    <p className="text-xs text-slate-500">Tổng hạn mức hỗ trợ: {setting.totalPayoutLimit.toLocaleString()}đ</p>
                                </div>
                            );
                        })}
                    </div>
                </FundCard>
                <FundCard 
                     title="Thuế TNCN (10%)" 
                     statusData={fundStatus[FundType.TNCN_TAX]} 
                     onDistribute={() => addToast("Tiền thuế TNCN được khấu trừ từ các lệnh rút. Admin sẽ thực hiện nộp thuế theo định kỳ.", "info")}
                     extraHeader={<div className="bg-orange-100 text-orange-600 p-1 rounded-md"><SparklesIcon className="h-3 w-3" /></div>}
                >
                    <div className="text-center py-4">
                        <BanknotesIcon className="h-12 w-12 text-orange-200 mx-auto mb-2" />
                        <p className="text-[11px] text-slate-500 italic">Khấu trừ 10% từ thu nhập của thành viên khi rút tiền.</p>
                    </div>
                </FundCard>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h3 className="text-lg font-bold uppercase">Lịch sử Giao dịch Quỹ</h3>
                    
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-lg">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Từ</span>
                            <input 
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent border-none text-xs focus:ring-0 outline-none w-28 h-6"
                            />
                            <span className="text-[10px] uppercase font-bold text-slate-400 border-l border-slate-200 dark:border-slate-700 pl-2">Đến</span>
                            <input 
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent border-none text-xs focus:ring-0 outline-none w-28 h-6"
                            />
                            {(startDate || endDate) && (
                                <button 
                                    onClick={() => { setStartDate(''); setEndDate(''); }}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400"
                                    title="Xóa bộ lọc ngày"
                                >
                                    <XCircleIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        <div className="relative flex-grow md:flex-initial">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Tìm mô tả, ngày..."
                                value={historySearch}
                                onChange={(e) => setHistorySearch(e.target.value)}
                                className="pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-64"
                            />
                        </div>

                        <select 
                            value={fundFilter}
                            onChange={(e) => setFundFilter(e.target.value as any)}
                            className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">Tất cả Quỹ</option>
                            <option value={FundType.Admin}>Ví Admin (Lợi nhuận)</option>
                            <option value={FundType.LeaderBonus}>Quỹ Leader</option>
                            <option value={FundType.Support}>Quỹ Hỗ trợ</option>
                        </select>

                        <select 
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as any)}
                            className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">Tất cả Chiều</option>
                            <option value="inflow">Cộng (+) quỹ</option>
                            <option value="outflow">Chi (-) quỹ</option>
                        </select>

                        <select 
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="all">Phân loại GD</option>
                            <option value="Lợi nhuận">Lợi nhuận</option>
                            <option value="Hoa hồng">Hoa hồng</option>
                            <option value="Rút tiền">Rút tiền</option>
                            <option value="Thưởng">Thưởng</option>
                            <option value="Phí">Các loại phí</option>
                        </select>

                        <div className="flex items-center gap-1">
                             <input 
                                type="text" 
                                placeholder="Số tiền từ..." 
                                value={minAmount} 
                                onChange={e => setMinAmount(e.target.value)} 
                                className="w-24 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500" 
                            />
                             <span className="text-slate-400">-</span>
                             <input 
                                type="text" 
                                placeholder="..." 
                                value={maxAmount} 
                                onChange={e => setMaxAmount(e.target.value)} 
                                className="w-24 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-indigo-500" 
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs bg-slate-50 dark:bg-slate-900/50 uppercase font-bold text-slate-500">
                            <tr>
                                <th className="px-6 py-3">Ngày</th>
                                <th className="px-6 py-3">Tên Quỹ</th>
                                <th className="px-6 py-3">Mô tả</th>
                                <th className="px-6 py-3 text-right">Số tiền</th>
                                <th className="px-6 py-3 text-center">Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {paginatedHistory.length > 0 ? (
                                paginatedHistory.map(tx => (
                                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-xs text-slate-500 font-mono">{tx.date}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                                tx.fund === FundType.Admin ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' :
                                                tx.fund === FundType.LeaderBonus ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30' : 
                                                'bg-pink-100 text-pink-700 dark:bg-pink-900/30'
                                            }`}>
                                                {tx.fund === FundType.Admin ? 'Admin' : tx.fund === FundType.LeaderBonus ? 'Leader' : 'Hỗ trợ'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">{tx.description}</td>
                                        <td className={`px-6 py-4 text-right font-bold font-mono ${tx.type === 'inflow' ? 'text-green-600' : 'text-red-500'}`}>
                                            {tx.type === 'inflow' ? '+' : ''}{tx.amount.toLocaleString('vi-VN')}đ
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {tx.type === 'outflow' && (
                                                <button 
                                                    onClick={() => setViewingTransaction(tx)} 
                                                    className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-colors"
                                                    title="Xem chi tiết danh sách chi trả"
                                                >
                                                    <EyeIcon className="h-5 w-5"/>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic bg-slate-50/30 dark:bg-slate-900/10">
                                        Không tìm thấy giao dịch nào phù hợp với bộ lọc.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 dark:bg-slate-900/20 p-4 rounded-xl gap-4">
                    <div className="flex items-center gap-4">
                        <RowsPerPageSelector 
                            rowsPerPage={historyRowsPerPage} 
                            onChange={setHistoryRowsPerPage} 
                        />
                        <span className="text-xs text-slate-500">
                            Hiển thị {(historyPage - 1) * historyRowsPerPage + 1} - {Math.min(historyPage * historyRowsPerPage, filteredFundHistory.length)} của {filteredFundHistory.length} giao dịch
                        </span>
                    </div>
                    {totalHistoryPages > 1 && (
                        <Pagination 
                            currentPage={historyPage} 
                            totalPages={totalHistoryPages} 
                            onPageChange={setHistoryPage} 
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default FundManagementPage;
