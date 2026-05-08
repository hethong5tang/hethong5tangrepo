
import React, { useMemo, useState } from 'react';
import { AdminManagedUser, MembershipTier, UserStatus } from '../../features/users/types';
import { Transaction, TransactionType } from '../../features/finance/types';
import { SystemSettings } from '../../features/settings/types';
import StatCard from '../../components/StatCard';
import LeaderboardWidget from '../../components/LeaderboardWidget';
import { BanknotesIcon, CalendarDaysIcon, CurrencyDollarIcon, ExclamationTriangleIcon, SparklesIcon, UserGroupIcon, ArrowTrendingUpIcon, TrophyIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, UserPlusIcon, LifebuoyIcon, ClipboardDocumentIcon, CheckIcon, LinkIcon, ChevronRightIcon } from '../../components/Icons';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../features/auth/useAuth';
import { useFinance } from '../../features/finance/useFinance';
import { useSettings } from '../../features/settings/useSettings';
import { useUser } from '../../features/users/useUser';
import RankProgressWidget from '../../components/RankProgressWidget';
import EventProgressWidget from '../../components/EventProgressWidget';
import { useActions } from '../../features/actions/useActions';
import { useToast } from '../../components/ToastProvider';

const RECENT_ACTIVITY_COUNT = 5;

const ReferralQuickCopy: React.FC<{ userId: string }> = ({ userId }) => {
    const { addToast } = useToast();
    const [linkCopied, setLinkCopied] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);
    const referralLink = `${window.location.origin}?ref=${userId}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(referralLink);
        setLinkCopied(true);
        addToast('Đã sao chép link giới thiệu!', 'success');
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(userId);
        setCodeCopied(true);
        addToast('Đã sao chép mã giới thiệu!', 'success');
        setTimeout(() => setCodeCopied(false), 2000);
    };

    return (
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 rounded-2xl p-6 shadow-xl text-white mb-6 relative overflow-hidden group border border-white/10">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-indigo-400 opacity-10 rounded-full blur-xl animate-pulse"></div>
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-2">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <SparklesIcon className="h-6 w-6 text-yellow-300 animate-bounce" /> Lan tỏa giá trị, Nhận hoa hồng khủng
                    </h3>
                    <p className="text-indigo-100 text-sm leading-relaxed max-w-lg">
                        Chia sẻ dự án tuyệt vời này cho bạn bè qua Mã giới thiệu hoặc Link trực tiếp để nhận hoa hồng thụ động lên tới 10 tầng.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* referral code */}
                    <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl p-4 border border-white/20 flex flex-col justify-between hover:bg-white/20 transition-all">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Mã giới thiệu</span>
                            <UserGroupIcon className="h-4 w-4 text-indigo-300" />
                        </div>
                        <div className="flex items-center justify-between gap-2 bg-black/30 rounded-lg p-2 border border-white/10">
                            <span className="font-mono font-bold tracking-widest text-white">{userId}</span>
                            <button 
                                onClick={handleCopyCode}
                                className="p-1.5 bg-white text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors shadow-sm"
                                title="Sao chép mã"
                            >
                                {codeCopied ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {/* referral link */}
                    <div className="bg-white/10 dark:bg-black/20 backdrop-blur-md rounded-xl p-4 border border-white/20 flex flex-col justify-between hover:bg-white/20 transition-all">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Link trực tiếp</span>
                            <LinkIcon className="h-4 w-4 text-indigo-300" />
                        </div>
                        <div className="flex items-center justify-between gap-2 bg-black/30 rounded-lg p-2 border border-white/10 overflow-hidden">
                            <span className="font-mono text-xs text-indigo-100 truncate flex-1">{referralLink}</span>
                            <button 
                                onClick={handleCopyLink}
                                className="p-1.5 bg-white text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors shadow-sm"
                                title="Sao chép link"
                            >
                                {linkCopied ? <CheckIcon className="h-4 w-4" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DuesBanner: React.FC<{ user: AdminManagedUser, systemSettings: SystemSettings, onPay: () => void, onNavigate: (page: string) => void }> = ({ user, systemSettings, onPay, onNavigate }) => {
    const { missedMaintenanceMonths, membershipTier } = user;
    if (missedMaintenanceMonths === 0) return null;

    let maintenanceFee = 0;
    if (membershipTier === MembershipTier.Pro) maintenanceFee = systemSettings.proMaintenanceFee;
    else if (membershipTier === MembershipTier.Master) maintenanceFee = systemSettings.masterMaintenanceFee;
    else maintenanceFee = systemSettings.maintenanceFee;

    const baseDue = maintenanceFee * missedMaintenanceMonths;
    const penaltyAmount = baseDue * (systemSettings.penaltyFeeRate / 100);
    const totalDue = baseDue + penaltyAmount;
    
    const canPay = user.balance >= totalDue;

    return (
        <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500 flex-shrink-0" />
                <div>
                    <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Tài khoản bị hạn chế nhưng vẫn nhận hoa hồng!</h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Bạn có khoản phí quá hạn là <span className="font-bold">{totalDue.toLocaleString('vi-VN')}đ</span>. 
                        Thanh toán ngay để kích hoạt lại và truy cập toàn bộ số dư <span className="font-bold">{user.balance.toLocaleString('vi-VN')}đ</span> của bạn.
                    </p>
                </div>
            </div>
            <button
                onClick={canPay ? onPay : () => onNavigate('Ví Của Tôi')}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 w-full md:w-auto flex-shrink-0"
            >
                {canPay ? 'Thanh toán ngay' : 'Nạp tiền ngay'}
            </button>
        </div>
    );
};

const INCOME_COLORS: Record<string, string> = {
    'Hoa hồng (Tham gia)': '#10b981', 
    'Hoa hồng (Duy trì)': '#84cc16', 
    'Hỗ trợ từ Quỹ': '#f97316', 
};

const QuickActionsWidget: React.FC<{ user: AdminManagedUser, onNavigate: (page: string) => void }> = ({ user, onNavigate }) => {
    // Logic kiểm tra tài khoản bị hạn chế rút tiền tương tự như Sidebar
    const isOverdue = !!(user.nextMaintenanceDate && new Date() > new Date(user.nextMaintenanceDate));
    const isStatusRestricted = user.status !== UserStatus.Active;
    const isWithdrawalDisabled = isStatusRestricted || isOverdue;

    const actions = [
        { label: 'Nạp tiền', icon: ArrowDownCircleIcon, page: 'Nạp tiền', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400', disabled: false },
        { label: 'Rút tiền', icon: ArrowUpCircleIcon, page: 'Rút tiền', color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400', disabled: isWithdrawalDisabled },
        { label: 'Tuyển F1', icon: UserPlusIcon, page: 'Công Cụ Tuyển Dụng', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400', disabled: false },
        { label: 'Hỗ trợ', icon: LifebuoyIcon, page: 'Hỗ trợ', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400', disabled: false },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
            {actions.map((action) => (
                <button
                    key={action.label}
                    onClick={() => !action.disabled && onNavigate(action.page)}
                    disabled={action.disabled}
                    title={action.disabled ? "Tài khoản đang bị hạn chế rút tiền" : ""}
                    className={`flex flex-row items-center justify-between px-4 py-3 sm:py-4 gap-3 rounded-2xl border transition-all duration-200 group relative overflow-hidden ${
                        action.disabled 
                        ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700 opacity-60 cursor-not-allowed grayscale' 
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-500/50 shadow-sm hover:shadow-md active:scale-[0.98] active:shadow-sm'
                    }`}
                >
                    <div className="flex items-center gap-3 relative z-10 w-full">
                        <div className={`p-2.5 rounded-xl shrink-0 ${action.disabled ? 'bg-slate-200 text-slate-500' : action.color} transition-colors duration-200 group-hover:scale-110`}>
                            <action.icon className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <span className={`text-sm md:text-base font-bold text-left whitespace-nowrap ${action.disabled ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-400'}`}>{action.label}</span>
                    </div>
                    {!action.disabled && (
                         <div className="shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transform group-hover:translate-x-1 transition-all duration-200">
                             <ChevronRightIcon className="h-5 w-5" />
                         </div>
                    )}
                </button>
            ))}
        </div>
    );
};

const DashboardPage: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
    const { loggedInUser: user } = useAuth();
    const { financeState: { allTransactions } } = useFinance();
    const { settingsState: { systemSettings } } = useSettings();
    const { handlePayDues } = useActions();
    
    const transactions = useMemo(() => {
        if (!user) return [];
        return allTransactions.filter(t => t.userId === user.id);
    }, [allTransactions, user]);

    const recentTransactions = useMemo(() => 
        [...transactions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, RECENT_ACTIVITY_COUNT), 
        [transactions]
    );

    const { data: incomeSourceData, total: totalIncome } = useMemo(() => {
        const sources: Record<string, {name: string, value: number, color: string}> = {
            [TransactionType.CommissionParticipation]: { name: 'Hoa hồng (Tham gia)', value: 0, color: INCOME_COLORS['Hoa hồng (Tham gia)'] },
            [TransactionType.CommissionMaintenance]: { name: 'Hoa hồng (Duy trì)', value: 0, color: INCOME_COLORS['Hoa hồng (Duy trì)'] },
            [TransactionType.SupportFundPayout]: { name: 'Hỗ trợ từ Quỹ', value: 0, color: INCOME_COLORS['Hỗ trợ từ Quỹ'] },
        };
        let total = 0;
        transactions.forEach(tx => {
            const source = sources[tx.type];
            if (source && tx.amount > 0) {
                source.value += tx.amount;
                total += tx.amount;
            }
        });
        const data = Object.values(sources).filter(s => s.value > 0).map(s => ({
            ...s,
            percentage: total > 0 ? (s.value / total) * 100 : 0,
        }));
        return { data, total };
    }, [transactions]);

    const trendData = useMemo(() => {
        if (!user) return { wallet: [], commission: [], f1: [], network: [], credit: [] };
        
        const today = new Date();
        const dataPoints = 30;
        const trendResult = {
            wallet: [] as { name: string, value: number }[],
            commission: [] as { name: string, value: number }[],
            f1: [] as { name: string, value: number }[],
            network: [] as { name: string, value: number }[],
            credit: [] as { name: string, value: number }[],
        };

        const flatten = (users: AdminManagedUser[]): AdminManagedUser[] => {
            return users.flatMap(u => [u, ...(u.children ? flatten(u.children) : [])]);
        };
        const allChildren = user.children ? flatten(user.children) : [];
        
        const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        for (let i = 0; i < dataPoints; i++) {
            const date = new Date(today);
            date.setHours(23, 59, 59, 999); 
            date.setDate(today.getDate() - i);
            const dateString = date.toISOString().split('T')[0];
            const dayName = `Day ${dataPoints - i}`;

            let balanceAtDate = user.balance;
            for (const tx of sortedTransactions) {
                if (tx.date > dateString) {
                    balanceAtDate -= tx.amount;
                } else {
                    break;
                }
            }
            trendResult.wallet.unshift({ name: dayName, value: balanceAtDate });
            
            let commissionAtDate = user.totalEarnings;
            const commissionTypes = [TransactionType.CommissionParticipation, TransactionType.CommissionMaintenance, TransactionType.SupportFundPayout];
            for (const tx of sortedTransactions) {
                if (tx.date > dateString) {
                    if (commissionTypes.includes(tx.type) && tx.amount > 0) {
                         commissionAtDate -= tx.amount;
                    }
                } else {
                    break;
                }
            }
            trendResult.commission.unshift({ name: dayName, value: commissionAtDate });
            
            const f1AtDate = (user.children || []).filter(child => child.joinDate <= dateString).length;
            trendResult.f1.unshift({ name: dayName, value: f1AtDate });

            const networkAtDate = allChildren.filter(child => child.joinDate <= dateString).length;
            trendResult.network.unshift({ name: dayName, value: networkAtDate });
            
            trendResult.credit.unshift({ name: dayName, value: Number(user.creditBalance) });
        }

        return trendResult;
    }, [user, transactions]);
    
    const daysRemaining = useMemo(() => {
        if (!user?.nextMaintenanceDate) return null;
        const now = new Date();
        const dueDate = new Date(user.nextMaintenanceDate);
        now.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        const diffTime = dueDate.getTime() - now.getTime();
        return Math.round(diffTime / (1000 * 60 * 60 * 24));
    }, [user?.nextMaintenanceDate]);
    
    const renderTopBanner = () => {
        if (!user) return null;

        if (user.membershipTier === MembershipTier.None) {
            return (
                <div className="p-4 mb-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <SparklesIcon className="h-6 w-6 text-blue-500 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold text-blue-800 dark:text-blue-200">Kích hoạt tài khoản của bạn!</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                               Để bắt đầu xây dựng hệ thống và nhận hoa hồng, bạn cần kích hoạt gói thành viên đầu tiên.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => onNavigate('Nâng Cấp Gói')}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 w-full md:w-auto flex-shrink-0 shadow-md transition-transform active:scale-95"
                    >
                        Kích hoạt ngay
                    </button>
                </div>
            );
        }
        
        if (user.status !== UserStatus.Active) {
            return <DuesBanner user={user} systemSettings={systemSettings} onPay={handlePayDues} onNavigate={onNavigate} />;
        }
        
        if (daysRemaining === null || !user.nextMaintenanceDate) {
            return null; 
        }
        
        const formattedDueDate = new Date(user.nextMaintenanceDate!).toLocaleDateString('vi-VN');
        
        if (daysRemaining < 0) {
            return (
                <div className="p-4 mb-6 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-500 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold text-red-800 dark:text-red-200">Phí duy trì quá hạn!</h4>
                            <p className="text-sm text-red-700 dark:text-red-300">Hạn thanh toán của bạn là ngày <span className="font-bold">{formattedDueDate}</span>. Chức năng Rút tiền đã bị tạm khóa. Vui lòng thanh toán để mở lại và tránh bị khóa tài khoản.</p>
                        </div>
                    </div>
                    <button
                        onClick={handlePayDues}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 w-full md:w-auto flex-shrink-0 shadow-md transition-transform active:scale-95"
                    >
                        Thanh toán ngay
                    </button>
                </div>
            );
        }

        const isWarning = daysRemaining <= 3;
        const bannerClasses = isWarning
            ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200"
            : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200";
        const iconColorClass = isWarning ? "text-yellow-500" : "text-blue-500";
        
        let message = '';

        if (daysRemaining === 0) {
            message = `Hôm nay là hạn duy trì (${formattedDueDate}). Vui lòng đảm bảo đủ số dư.`;
        } else if (isWarning) {
            message = `Sắp hết hạn duy trì (còn ${daysRemaining} ngày). Hạn chót: ${formattedDueDate}.`;
        } else {
             return null; 
        }

        return (
            <div className={`p-3 mb-6 rounded-lg border text-center text-sm shadow-sm transition-all ${bannerClasses}`}>
                <p className="flex items-center justify-center gap-2">
                    {isWarning ? <ExclamationTriangleIcon className={`h-5 w-5 ${iconColorClass}`} /> : <CalendarDaysIcon className={`h-5 w-5 ${iconColorClass}`} />}
                    <span className="font-semibold">{message}</span>
                </p>
            </div>
        );
    };
    
    if (!user) {
        return null;
    }

    return (
    <div className="space-y-6 lg:space-y-8">
        <EventProgressWidget />

        <div className="flex flex-col gap-1">
             <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Bảng điều khiển</h2>
             <p className="text-sm text-slate-500 dark:text-slate-400">Tổng quan về thu nhập, hoạt động và tiến trình của bạn.</p>
        </div>
        
        {renderTopBanner()}
        
        <QuickActionsWidget user={user} onNavigate={onNavigate} />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-2">
                <StatCard title="Số dư Ví" value={user.balance.toLocaleString('vi-VN') + 'đ'} icon={<BanknotesIcon />} trendData={trendData.wallet} isCurrency />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-2">
                <StatCard title="Tổng Hoa Hồng" value={user.totalEarnings.toLocaleString('vi-VN') + 'đ'} icon={<CurrencyDollarIcon />} trendData={trendData.commission} isCurrency />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-2">
                <StatCard title="Số người F1" value={user.f1Count.toLocaleString('vi-VN')} icon={<UserGroupIcon />} trendData={trendData.f1} />
            </div>
            <div className="sm:col-span-1 lg:col-span-1 xl:col-span-2">
                <StatCard title="Ví Hỗ Trợ" value={(user.supportWalletBalance || 0).toLocaleString('vi-VN') + 'đ'} icon={<LifebuoyIcon />} trendData={[]} isCurrency />
            </div>
            <div className="sm:col-span-1 lg:col-span-1 xl:col-span-2">
                <StatCard title="Đã Nhận Hỗ Trợ" value={(user.totalSupportReceived || 0).toLocaleString('vi-VN') + 'đ'} icon={<CheckIcon />} trendData={[]} isCurrency />
            </div>
            <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                <StatCard title="Ví Credit" value={user.creditBalance.toLocaleString('vi-VN')} icon={<SparklesIcon />} trendData={trendData.credit} />
            </div>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
             <div className="xl:col-span-2 space-y-6">
                <RankProgressWidget />

                {user.membershipTier !== MembershipTier.None && user.status === UserStatus.Active && (
                     <ReferralQuickCopy userId={user.id} />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6">Phân tích Nguồn Thu nhập</h3>
                        <div className="flex-1 flex flex-col relative min-h-[250px]">
                            {totalIncome === 0 ? (
                                 <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic">Chưa có dữ liệu</div>
                            ) : (
                                <>
                                    <div className="h-48 relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={incomeSourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="65%" outerRadius="100%" paddingAngle={5} cornerRadius={6}>
                                                    {incomeSourceData.map((entry) => (
                                                        <Cell key={`cell-${entry.name}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    formatter={(value: number) => `${value.toLocaleString('vi-VN')}đ`} 
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tổng thu</span>
                                            <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
                                                {totalIncome > 1000000 ? `${(totalIncome/1000000).toFixed(1)}tr` : `${(totalIncome/1000).toFixed(0)}k`}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-6 space-y-3">
                                        {incomeSourceData.map(entry => (
                                            <div key={entry.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }}></div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-none">{entry.name}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{entry.value.toLocaleString('vi-VN')}đ</p>
                                                    <p className="text-[10px] text-slate-500 font-medium">{entry.percentage.toFixed(1)}%</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Giao dịch Gần đây</h3>
                            <button onClick={() => onNavigate('Lịch Sử Dòng Tiền')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">Xem tất cả</button>
                        </div>
                        
                        <div className="flex-1">
                            {recentTransactions.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic min-h-[200px]">Chưa có giao dịch</div>
                            ) : (
                                <ul className="space-y-4">
                                    {recentTransactions.map(tx => (
                                        <li key={tx.id} className="flex items-start justify-between min-w-0">
                                            <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                                                <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${tx.amount > 0 ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'}`}>
                                                    {tx.amount > 0 ? <ArrowUpCircleIcon className="h-5 w-5"/> : <ArrowDownCircleIcon className="h-5 w-5"/>}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{tx.description}</p>
                                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{tx.date}</p>
                                                </div>
                                            </div>
                                            <p className={`font-bold text-sm whitespace-nowrap mt-1 ${tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('vi-VN')}đ
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
             </div>
            
            <div className="xl:col-span-1 space-y-6">
                 <LeaderboardWidget />
            </div>
        </div>
    </div>
    );
};

export default DashboardPage;
