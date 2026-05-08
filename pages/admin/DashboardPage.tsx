
import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
    BanknotesIcon, ChartBarIcon, CurrencyDollarIcon, UserGroupIcon, 
    ChartPieIcon, LifebuoyIcon, ArrowRightIcon, BellIcon, 
    UserPlusIcon, ExclamationTriangleIcon, CheckCircleIcon,
    TrophyIcon, ChevronRightIcon, SparklesIcon, HeartIcon,
    ArrowDownCircleIcon
} from '../../components/Icons';
import { Transaction, TransactionType, FundType } from '../../features/finance/types';
import LeaderboardWidget from '../../components/LeaderboardWidget';
import FinanceStatCard from '../../components/admin/FinanceStatCard';
import UserOverviewWidget from '../../components/admin/UserOverviewWidget';
import RevenueReportTable from '../../components/admin/RevenueReportTable';
import { useUser } from '../../features/users/useUser';
import { useFinance } from '../../features/finance/useFinance';
import { useSupport } from '../../features/support/useSupport';
import { TicketStatus } from '../../features/support/types';
import { useSettings } from '../../features/settings/useSettings';
import { AdminManagedUser, UserStatus, MembershipTier } from '../../features/users/types';


const REVENUE_COLORS: Record<string, string> = {
    'Phí Tham Gia': '#38bdf8', // sky-400
    'Phí Duy Trì': '#818cf8', // indigo-400
    'Phí Phạt': '#f59e0b', // amber-500
};

const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000) {
        return `${(value / 1_000_000_000).toFixed(2)} tỷ`;
    }
    if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)} tr`;
    }
    if (value >= 1_000) {
        return `${Math.round(value / 1000)}k`;
    }
    return `${value.toLocaleString('vi-VN')}`;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="p-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-600 shadow-lg">
                <p className="label font-semibold text-slate-700 dark:text-slate-200 mb-2 border-b border-slate-200 dark:border-slate-700 pb-1">{`${label}`}</p>
                {payload.map((pld: any, index: number) => (
                    <div key={index} style={{ color: pld.stroke }} className="text-sm font-medium">
                        {`${pld.name}: ${Number(pld.value).toLocaleString('vi-VN')}đ`}
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

// --- NÂNG CẤP GỌN NHẸ: Action Center (Slim Bar) ---
const ActionCenterWidget: React.FC<{ 
    pendingWithdrawals: number, 
    pendingDeposits: number,
    newTickets: number, 
    newUsers: number,
    pendingMilestones: number, 
    pendingSupport: number,
    onNavigate: (page: string) => void
}> = ({ pendingWithdrawals, pendingDeposits, newTickets, newUsers, pendingMilestones, pendingSupport, onNavigate }) => {
    
    const actions = [
        { 
            id: 'withdraw', 
            label: 'Chi chờ duyệt', 
            count: pendingWithdrawals, 
            icon: BanknotesIcon, 
            color: 'text-rose-500', 
            bg: 'bg-rose-50 dark:bg-rose-900/20',
            link: 'Tài chính' 
        },
        { 
            id: 'deposit', 
            label: 'Nạp chờ duyệt', 
            count: pendingDeposits, 
            icon: ArrowDownCircleIcon, 
            color: 'text-green-600', 
            bg: 'bg-green-50 dark:bg-green-900/20',
            link: 'Tài chính' // Đổi về trang Tài chính gốc theo yêu cầu
        },
        { 
            id: 'support_fund', 
            label: 'Hỗ trợ chờ duyệt', 
            count: pendingSupport, 
            icon: HeartIcon, 
            color: 'text-emerald-500', 
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            link: 'Quản lý Quỹ' 
        },
        { 
            id: 'milestones', 
            label: 'Thưởng chờ duyệt', 
            count: pendingMilestones, 
            icon: TrophyIcon, 
            color: 'text-purple-500', 
            bg: 'bg-purple-50 dark:bg-purple-900/20',
            link: 'Quản lý Quỹ' 
        },
        { 
            id: 'support', 
            label: 'Yêu cầu mới', 
            count: newTickets, 
            icon: LifebuoyIcon, 
            color: 'text-amber-500', 
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            link: 'Yêu cầu Hỗ trợ' 
        },
        { 
            id: 'users', 
            label: 'Thành viên mới', 
            count: newUsers, 
            icon: UserPlusIcon, 
            color: 'text-blue-500', 
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            link: 'Quản lý người dùng' 
        },
    ];

    const totalTasks = actions.reduce((a,b) => a + b.count, 0);

    return (
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-2.5 overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-1.5 border-r border-slate-200 dark:border-slate-700 mr-1 shrink-0">
                    <div className="relative">
                        <BellIcon className="h-4 w-4 text-indigo-500" />
                        {totalTasks > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Việc cần xử lý</span>
                </div>
                
                <div className="flex flex-1 items-center gap-3 w-full overflow-x-auto scrollbar-hide">
                    {actions.map(action => (
                        <button 
                            key={action.id} 
                            onClick={() => onNavigate(action.link)}
                            className={`flex items-center gap-3 px-4 py-1.5 rounded-xl border transition-all whitespace-nowrap cursor-pointer ${
                                action.count > 0 
                                    ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95' 
                                    : 'border-transparent opacity-60 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            <div className={`p-1.5 rounded-lg ${action.bg} ${action.color}`}>
                                {React.createElement(action.icon, { className: "h-4 w-4" })}
                            </div>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{action.label}</span>
                            {action.count > 0 && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
                                    action.id === 'withdraw' ? 'bg-rose-500' : 
                                    action.id === 'deposit' ? 'bg-green-600' :
                                    action.id === 'milestones' ? 'bg-purple-500' : 
                                    action.id === 'support_fund' ? 'bg-emerald-500' :
                                    action.id === 'support' ? 'bg-amber-500' : 
                                    'bg-blue-500'
                                }`}>
                                    {action.count}
                                </span>
                            )}
                        </button>
                    ))}
                    
                    {totalTasks === 0 && (
                         <div className="flex items-center gap-2 text-emerald-500 text-xs font-semibold px-4">
                            <CheckCircleIcon className="h-4 w-4" />
                            Hệ thống đang vận hành ổn định
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const DashboardPage: React.FC<{}> = () => {
    const { userState: { allUsers: users } } = useUser();
    const { financeState: { allTransactions: transactions, fundStatus, fundTransactions, withdrawalRequests, milestoneBonusRequests, depositRequests } } = useFinance();
    const { supportState: { supportTickets } } = useSupport();
    const { settingsState: { systemSettings, fundSettings } } = useSettings();

    const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | string>('30d');
    const [userStatsTimeframe, setUserStatsTimeframe] = useState<'week' | 'month' | 'year'>('month');

    // --- Fund Change Calculation ---
    const fundChanges = useMemo(() => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const calculateChange = (fundType: FundType) => {
            const currentBalance = fundStatus[fundType]?.balance || 0;
            const recentTxs = fundTransactions.filter(t => t.fund === fundType && t.date >= thirtyDaysAgo);
            const netChange = recentTxs.reduce((sum, t) => sum + t.amount, 0);
            const startBalance = currentBalance - netChange;
            if (startBalance === 0) return currentBalance > 0 ? 100 : 0;
            return (netChange / startBalance) * 100;
        };

        return {
            [FundType.Admin]: calculateChange(FundType.Admin),
            [FundType.LeaderBonus]: calculateChange(FundType.LeaderBonus),
            [FundType.Support]: calculateChange(FundType.Support),
        };
    }, [fundStatus, fundTransactions]);

    // --- Action Center Data ---
    const pendingWithdrawalsCount = useMemo(() => {
        return withdrawalRequests.filter(r => r.status === 'pending').length;
    }, [withdrawalRequests]);

    const pendingDepositsCount = useMemo(() => {
        return depositRequests.filter(r => r.status === 'pending').length;
    }, [depositRequests]);
    
    // --- CALCULATE DYNAMIC PENDING LEADERS ---
    const pendingMilestonesCount = useMemo(() => {
        const manualRequests = milestoneBonusRequests.filter(r => r.status === 'pending').length;

        const flattenUsers = (list: AdminManagedUser[]): AdminManagedUser[] => list.flatMap(u => [u, ...(u.children ? flattenUsers(u.children) : [])]);
        const allFlatUsers = flattenUsers(users);
        const { leaderAchievements, levelSettings } = systemSettings;

        const getPaidCountForMetric = (userId: string, metricKey: string) => {
            const relevantTx = transactions.filter(t => 
                t.userId === userId && 
                t.type === TransactionType.LeaderBonus && 
                t.description.toLowerCase().includes(metricKey.toLowerCase())
            );
            let paidSteps = 0;
            relevantTx.forEach(tx => {
                const match = tx.description.match(/\(x(\d+)\)/);
                paidSteps += match ? parseInt(match[1]) : 1;
            });
            return paidSteps;
        };

        let eligibleCount = 0;

        allFlatUsers.forEach(u => {
            if (u.status !== UserStatus.Active) return;

            if (u.rankLevel > 0) {
                const currentRankInfo = levelSettings.find(l => l.level === u.rankLevel);
                if (currentRankInfo) {
                    const hasReceivedRank = transactions.some(t => 
                        t.userId === u.id && 
                        t.type === TransactionType.LeaderBonus && 
                        t.description.includes(`Thăng cấp: ${currentRankInfo.name}`)
                    );
                    if (!hasReceivedRank) {
                        eligibleCount++;
                    }
                }
            }

            leaderAchievements.forEach(ach => {
                const metricVal = u[ach.rule.metric] as number;
                const target = ach.rule.target;
                
                const paidSteps = getPaidCountForMetric(u.id, `Đạt thành tích: ${ach.name}`);
                const paidValue = paidSteps * target;
                const currentEffectiveValue = metricVal - paidValue;
                const newSteps = Math.floor(currentEffectiveValue / target);

                if (newSteps > 0) {
                    eligibleCount++;
                }
            });
        });

        return manualRequests + eligibleCount;
    }, [milestoneBonusRequests, users, transactions, systemSettings]);

    // --- CALCULATE PENDING SUPPORT USERS (Đã đồng bộ với số dư quỹ) ---
    const pendingSupportCount = useMemo(() => {
        const flatten = (list: AdminManagedUser[]): AdminManagedUser[] => list.flatMap(u => [u, ...(u.children ? flatten(u.children) : [])]);
        const allFlatUsers = flatten(users);
        const { supportFundSettings } = fundSettings;
        let availableBalance = fundStatus[FundType.Support]?.balance || 0;

        const eligibleUsers = allFlatUsers.filter(u => {
            const tier = u.membershipTier === MembershipTier.None ? MembershipTier.Starter : u.membershipTier;
            const userSupportSettings = supportFundSettings[tier as keyof typeof supportFundSettings];
            const limit = userSupportSettings?.totalPayoutLimit || 0;
            
            // Điều kiện hỗ trợ: Active & 0 F1 & chưa nhận hết hạn mức tổng
            return u.status === UserStatus.Active && 
                   u.f1Count === 0 && 
                   u.totalSupportReceived < limit;
        });

        // Chỉ đếm những người mà ngân sách hiện tại có thể chi trả (giống trong trang Quản lý Quỹ)
        let actualCount = 0;
        for (const user of eligibleUsers) {
            if (availableBalance <= 0) break;
            const tier = user.membershipTier === MembershipTier.None ? MembershipTier.Starter : user.membershipTier;
            const userSupportSettings = supportFundSettings[tier as keyof typeof supportFundSettings];
            const remainingTotalLimit = userSupportSettings.totalPayoutLimit - user.totalSupportReceived;
            const payoutAmount = Math.min(remainingTotalLimit, availableBalance);

            if (payoutAmount > 0) {
                actualCount++;
                availableBalance -= payoutAmount;
            }
        }

        return actualCount;
    }, [users, fundSettings, fundStatus]);
    
    const newTicketsCount = useMemo(() => supportTickets.filter(t => t.status === TicketStatus.New).length, [supportTickets]);
    
    const newUsersCount = useMemo(() => {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const countRecursive = (list: typeof users): number => {
            let count = 0;
            for (const u of list) {
                if (new Date(u.joinDate) >= yesterday) count++;
                if (u.children) count += countRecursive(u.children);
            }
            return count;
        };
        return countRecursive(users);
    }, [users]);


    const availableYears = useMemo(() => {
        const years = new Set<number>();
        transactions.forEach(t => { years.add(new Date(t.date).getFullYear()); });
        years.add(new Date().getFullYear());
        return Array.from(years).sort((a, b) => b - a);
    }, [transactions]);
    
    useEffect(() => {
        if (Number(timeframe) && !availableYears.includes(Number(timeframe))) {
            setTimeframe(availableYears[0] ? String(availableYears[0]) : '30d');
        }
    }, [timeframe, availableYears]);
    
    const dashboardStats = useMemo(() => {
        const now = new Date();
        const getChartDataForTimeframe = () => {
            if (timeframe === '7d') {
                return Array.from({ length: 7 }).map((_, i) => {
                    const date = new Date(new Date().setDate(now.getDate() - (6 - i)));
                    const dateStr = date.toISOString().split('T')[0];
                    const dailyTxs = transactions.filter(t => t.date === dateStr);
                    const participation = dailyTxs.filter(t => t.type === TransactionType.ParticipationFee && t.amount < 0).reduce((s, t) => s - t.amount, 0);
                    const maintenance = dailyTxs.filter(t => t.type === TransactionType.MaintenanceFee && t.amount < 0).reduce((s, t) => s - t.amount, 0);
                    return { name: date.toLocaleDateString('vi-VN', { weekday: 'short' }), "Phí Tham Gia": participation, "Phí Duy Trì": maintenance };
                });
            }
            if (timeframe === '30d') {
                 return Array.from({ length: 4 }).map((_, i) => {
                    const weekEnd = new Date(new Date().setDate(now.getDate() - ( (3-i) * 7)));
                    const weekStart = new Date(new Date().setDate(weekEnd.getDate() - 6));
                    const weeklyTxs = transactions.filter(t => new Date(t.date) >= weekStart && new Date(t.date) <= weekEnd);
                    const participation = weeklyTxs.filter(t => t.type === TransactionType.ParticipationFee && t.amount < 0).reduce((s, t) => s - t.amount, 0);
                    const maintenance = weeklyTxs.filter(t => t.type === TransactionType.MaintenanceFee && t.amount < 0).reduce((s, t) => s - t.amount, 0);
                    return { name: `Tuần ${i + 1}`, "Phí Tham Gia": participation, "Phí Duy Trì": maintenance };
                });
            }
            if (timeframe === '90d') {
                return Array.from({ length: 3 }).map((_, i) => {
                    const monthDate = new Date(now.getFullYear(), now.getMonth() - (2 - i), 1);
                    const monthlyTxs = transactions.filter(t => new Date(t.date).getFullYear() === monthDate.getFullYear() && new Date(t.date).getMonth() === monthDate.getMonth());
                    const participation = monthlyTxs.filter(t => t.type === TransactionType.ParticipationFee && t.amount < 0).reduce((s, t) => s - t.amount, 0);
                    const maintenance = monthlyTxs.filter(t => t.type === TransactionType.MaintenanceFee && t.amount < 0).reduce((s, t) => s - t.amount, 0);
                    return { name: `Tháng ${monthDate.getMonth() + 1}`, "Phí Tham Gia": participation, "Phí Duy Trì": maintenance };
                });
            }
            const selectedYear = parseInt(timeframe);
            if (!isNaN(selectedYear)) {
                return Array.from({ length: 12 }).map((_, i) => {
                    const monthlyTxs = transactions.filter(t => new Date(t.date).getFullYear() === selectedYear && new Date(t.date).getMonth() === i);
                    const participation = monthlyTxs.filter(t => t.type === TransactionType.ParticipationFee && t.amount < 0).reduce((s, t) => s - t.amount, 0);
                    const maintenance = monthlyTxs.filter(t => t.type === TransactionType.MaintenanceFee && t.amount < 0).reduce((s, t) => s - t.amount, 0);
                    return { name: `T${i + 1}`, "Phí Tham Gia": participation, "Phí Duy Trì": maintenance };
                });
            }
            return [];
        };
        return getChartDataForTimeframe();
    }, [transactions, timeframe]);

    const { data: revenueSourceData, total: totalRevenue } = useMemo(() => {
        const sources: Record<string, {name: string, value: number, color: string}> = {
            [TransactionType.ParticipationFee]: { name: 'Phí Tham Gia', value: 0, color: REVENUE_COLORS['Phí Tham Gia'] },
            [TransactionType.MaintenanceFee]: { name: 'Phí Duy Trì', value: 0, color: REVENUE_COLORS['Phí Duy Trì'] },
            [TransactionType.PenaltyFee]: { name: 'Phí Phạt', value: 0, color: REVENUE_COLORS['Phí Phạt'] },
        };
        let total = 0;

        transactions.forEach(tx => {
            if (sources[tx.type] && tx.amount < 0) {
                const amount = -tx.amount;
                sources[tx.type].value += amount;
                total += amount;
            }
        });
        const data = Object.values(sources).filter(s => s.value > 0).map(s => ({ ...s, percentage: total > 0 ? (s.value / total) * 100 : 0, }));
        return { data, total };
    }, [transactions]);
    
    const isChartDataEmpty = useMemo(() => {
        if (!dashboardStats || dashboardStats.length === 0) return true;
        return dashboardStats.every(d => d["Phí Tham Gia"] === 0 && d["Phí Duy Trì"] === 0);
    }, [dashboardStats]);

    const isYearSelected = useMemo(() => availableYears.includes(Number(timeframe)), [availableYears, timeframe]);
    
    const handleNavigate = (page: string) => {
        window.location.hash = page;
    }

    return (
    <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Bảng Điều Khiển</h2>
        
        <ActionCenterWidget 
            pendingWithdrawals={pendingWithdrawalsCount} 
            pendingDeposits={pendingDepositsCount}
            newTickets={newTicketsCount}
            newUsers={newUsersCount}
            pendingMilestones={pendingMilestonesCount}
            pendingSupport={pendingSupportCount}
            onNavigate={handleNavigate}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FinanceStatCard 
                title="Ví Admin" 
                value={fundStatus[FundType.Admin]?.balance || 0} 
                change={fundChanges[FundType.Admin]}
                icon={<CurrencyDollarIcon />} 
                color="green" 
            />
            <FinanceStatCard 
                title="Quỹ Thưởng Leader" 
                value={fundStatus[FundType.LeaderBonus]?.balance || 0} 
                change={fundChanges[FundType.LeaderBonus]}
                icon={<TrophyIcon />} 
                color="purple" 
            />
            <FinanceStatCard 
                title="Quỹ Hỗ Trợ" 
                value={fundStatus[FundType.Support]?.balance || 0} 
                change={fundChanges[FundType.Support]}
                icon={<UserGroupIcon />} 
                color="blue" 
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-sm ring-1 ring-black ring-opacity-5 p-5 flex flex-col">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">Biểu đồ Doanh thu</h3>
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                        <button onClick={() => setTimeframe('7d')} className={`px-3 py-1 text-[10px] font-bold rounded-md ${timeframe === '7d' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-500 dark:text-slate-400'}`}>7N</button>
                        <button onClick={() => setTimeframe('30d')} className={`px-3 py-1 text-[10px] font-bold rounded-md ${timeframe === '30d' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-500 dark:text-slate-400'}`}>30N</button>
                        <button onClick={() => setTimeframe('90d')} className={`px-3 py-1 text-[10px] font-bold rounded-md ${timeframe === '90d' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-500 dark:text-slate-400'}`}>90N</button>
                        <div className={`relative ${isYearSelected ? 'bg-white dark:bg-slate-600 shadow rounded-md' : ''}`}>
                            <select value={isYearSelected ? timeframe : 'placeholder'} onChange={e => setTimeframe(e.target.value)} className="pl-3 pr-8 py-1 text-[10px] font-bold rounded-md appearance-none bg-transparent border-none focus:ring-0 text-slate-500 dark:text-slate-300">
                                <option value="placeholder" disabled>Năm</option>
                                {availableYears.map(year => ( <option key={year} value={String(year)}>{year}</option> ))}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="flex-grow min-h-[350px]">
                     {isChartDataEmpty ? (
                         <div className="flex flex-col items-center justify-center h-full text-slate-500 dark:text-slate-400">
                             <ChartBarIcon className="h-12 w-12 text-slate-400 mb-2"/>
                             <p>Không có dữ liệu doanh thu</p>
                         </div>
                     ) : (
                        <ResponsiveContainer width="100%" height="100%">
                             <AreaChart data={dashboardStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorParticipation" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8}/><stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorMaintenance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/><stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="#94a3b8" />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#94a3b8" tickFormatter={(value) => `${formatCurrency(Number(value))}`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{fontSize: '10px', color: '#94a3b8'}} iconSize={8} />
                                <Area type="monotone" dataKey="Phí Tham Gia" stackId="1" stroke="#38bdf8" fill="url(#colorParticipation)" strokeWidth={2} />
                                <Area type="monotone" dataKey="Phí Duy Trì" stackId="1" stroke="#818cf8" fill="url(#colorMaintenance)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                     )}
                </div>
            </div>
            <div className="space-y-4">
                <UserOverviewWidget users={users} timeframe={userStatsTimeframe} setTimeframe={setUserStatsTimeframe} />
                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-sm ring-1 ring-black ring-opacity-5 p-5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Phân tích Nguồn thu</h3>
                     <div className="relative h-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={revenueSourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" paddingAngle={5} cornerRadius={5}>
                                    {revenueSourceData.map((entry) => <Cell key={`cell-${entry.name}`} fill={entry.color} />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => `${value.toLocaleString('vi-VN')}đ`} />
                            </PieChart>
                        </ResponsiveContainer>
                         <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">Tổng thu</span>
                            <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(totalRevenue)}</span>
                        </div>
                    </div>
                     <div className="mt-4 space-y-2">
                        {revenueSourceData.map(entry => (
                            <div key={entry.name} className="flex justify-between items-center text-[11px]">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                    <span className="text-slate-600 dark:text-slate-300 font-medium">{entry.name}</span>
                                </div>
                                <span className="font-bold text-slate-800 dark:text-slate-100">{entry.percentage.toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-8">
            <div className="lg:col-span-2">
                <RevenueReportTable data={dashboardStats} />
            </div>
            <div className="lg:col-span-1">
                <LeaderboardWidget />
            </div>
        </div>
    </div>
    );
}

export default DashboardPage;
