
import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { AdminManagedUser, MembershipTier, UserStatus } from '../../features/users/types';
import { Transaction, TransactionType, TRANSACTION_TYPE_LABELS, TransactionStatus, WithdrawalRequest } from '../../features/finance/types';
import { useActions } from '../../features/actions/useActions';
import Pagination from '../../components/Pagination';
import { TierBadge, TransactionStatusBadge } from '../../components/Badges';
import { 
    ArrowDownCircleIcon, ArrowUpCircleIcon, ArrowsRightLeftIcon, 
    DocumentMagnifyingGlassIcon, CalendarDaysIcon, ArrowPathIcon, 
    SparklesIcon, MagnifyingGlassIcon, XCircleIcon, ClockIcon, CheckCircleIcon,
    BuildingLibraryIcon, DevicePhoneMobileIcon, QrCodeIcon
} from '../../components/Icons';
import RowsPerPageSelector from '../../components/RowsPerPageSelector';
import FormattedNumberInput from '../../components/FormattedNumberInput';
import { useAuth } from '../../features/auth/useAuth';
import { useFinance } from '../../features/finance/useFinance';

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
                 <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 pt-1 border-t border-slate-200 dark:border-slate-700">
                    Tổng: {payload.reduce((acc: number, p: any) => acc + p.value, 0).toLocaleString('vi-VN')}đ
                </div>
            </div>
        );
    }
    return null;
};

const TransactionTypeBadge: React.FC<{ type: TransactionType }> = ({ type }) => {
    const typeClasses: Record<string, string> = {
        [TransactionType.ParticipationFee]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        [TransactionType.MaintenanceFee]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
        [TransactionType.Payout]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        [TransactionType.PenaltyFee]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        [TransactionType.LeaderBonus]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        [TransactionType.SupportFund]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
        [TransactionType.CommissionParticipation]: 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300',
        [TransactionType.CommissionMaintenance]: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/50 dark:text-fuchsia-300',
        [TransactionType.Withdrawal]: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
        [TransactionType.Deposit]: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300',
        [TransactionType.SystemProfit]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        [TransactionType.FundAllocation]: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300',
        [TransactionType.SupportFundPayout]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
        [TransactionType.CommissionDifference]: 'bg-lime-100 text-lime-800 dark:bg-lime-900/50 dark:text-lime-300',
        [TransactionType.CreditConversion]: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
        [TransactionType.AdminAdjustment]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
    };
    const label = TRANSACTION_TYPE_LABELS[type] || type;
    const className = typeClasses[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    return <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${className}`}>{label}</span>;
};

const RequestStatusBadge: React.FC<{ status: string }> = ({ status }) => {
    let color = 'bg-gray-100 text-gray-800';
    let label = status;
    let Icon = ClockIcon;

    if (status === 'pending') {
        color = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
        label = 'Chờ duyệt';
    } else if (status === 'approved' || status === 'completed') {
        color = 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
        label = 'Thành công';
        Icon = CheckCircleIcon;
    } else if (status === 'rejected' || status === 'failed') {
        color = 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
        label = 'Thất bại/Hủy';
        Icon = XCircleIcon;
    }

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase rounded-full ${color}`}>
            <Icon className="h-3 w-3" /> {label}
        </span>
    );
};

const WalletPage: React.FC<{ onNavigate: (page: string) => void; }> = ({ onNavigate }) => {
    const { loggedInUser: user } = useAuth();
    const { financeState: { allTransactions, depositRequests, withdrawalRequests } } = useFinance();
    const { handleConvertVndToCredits } = useActions();

    // Transactions Data (Biến động số dư)
    const transactions = useMemo(() => {
        if (!user) return [];
        return allTransactions.filter(t => t.userId === user.id);
    }, [allTransactions, user]);
    
    // Requests Data (Yêu cầu thanh toán)
    const myDepositRequests = useMemo(() => depositRequests.filter(r => r.userId === user?.id).sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()), [depositRequests, user]);
    const myWithdrawalRequests = useMemo(() => withdrawalRequests.filter(r => r.userId === user?.id).sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()), [withdrawalRequests, user]);

    // States for "Yêu cầu thanh toán" (Requests)
    const [requestTab, setRequestTab] = useState<'deposit' | 'withdrawal'>('deposit');
    const [requestCurrentPage, setRequestCurrentPage] = useState(1);
    // Updated default to 10 items
    const [requestItemsPerPage, setRequestItemsPerPage] = useState(10);

    // States for "Biến động số dư" (Transactions)
    const [convertAmount, setConvertAmount] = useState(0);
    const [convertError, setConvertError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    // Detailed Filters for Transactions
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
    const [flowFilter, setFlowFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    const handleResetFilters = () => {
        setSearchTerm('');
        setTypeFilter('all');
        setFlowFilter('all');
        setStatusFilter('all');
        setStartDate('');
        setEndDate('');
    };

    const isFilterActive = searchTerm !== '' || typeFilter !== 'all' || flowFilter !== 'all' || statusFilter !== 'all' || startDate !== '';

    const CREDIT_TO_VND_RATE = 1000;

    // Chart state
    const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | string>('30d');
    const isYearSelected = useMemo(() => !['7d', '30d', '90d'].includes(timeframe), [timeframe]);

    // Reset pagination when request tab changes
    useEffect(() => {
        setRequestCurrentPage(1);
    }, [requestTab]);

    // Reset pagination when transaction filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, typeFilter, flowFilter, statusFilter, startDate, endDate, itemsPerPage]);

    // --- CALCULATION FOR REQUESTS PAGINATION ---
    const currentRequestList = requestTab === 'deposit' ? myDepositRequests : myWithdrawalRequests;
    const totalRequestPages = Math.ceil(currentRequestList.length / requestItemsPerPage);
    const paginatedRequests = currentRequestList.slice(
        (requestCurrentPage - 1) * requestItemsPerPage,
        requestCurrentPage * requestItemsPerPage
    );


    // --- CALCULATION FOR TRANSACTIONS & CHART ---
    const { chartData, availableYears } = useMemo(() => {
        const now = new Date();
        const allYears = new Set<number>();
        transactions.forEach(t => {
            if (t.amount > 0) allYears.add(new Date(t.date).getFullYear());
        });
        allYears.add(now.getFullYear());
        const sortedYears = Array.from(allYears).sort((a, b) => b - a);
        
        let chartStart = new Date();
        let groupBy: 'day' | 'month' = 'day';

        if(isYearSelected) {
            const selectedYear = parseInt(timeframe, 10);
            chartStart = new Date(selectedYear, 0, 1);
            groupBy = 'month';
        } else {
             const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
             chartStart = new Date();
             chartStart.setDate(now.getDate() - (days - 1));
             groupBy = 'day';
        }
        chartStart.setHours(0, 0, 0, 0);

        const relevantTransactions = transactions.filter(t => {
            const txDate = new Date(t.date);
            return txDate >= chartStart && txDate <= now && t.amount > 0;
        });

        const data: { name: string; 'Hoa hồng': number; 'Thưởng & Hỗ trợ': number }[] = [];
        const commissionTypes = [TransactionType.CommissionParticipation, TransactionType.CommissionMaintenance];
        const bonusTypes = [TransactionType.LeaderBonus, TransactionType.SupportFundPayout];

        if (groupBy === 'day') {
             const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
             for (let i = 0; i < days; i++) {
                const date = new Date(chartStart);
                date.setDate(chartStart.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];
                const dailyTxs = relevantTransactions.filter(t => t.date === dateStr);
                
                const dailyCommission = dailyTxs.filter(t => commissionTypes.includes(t.type)).reduce((sum, t) => sum + t.amount, 0);
                const dailyBonus = dailyTxs.filter(t => bonusTypes.includes(t.type)).reduce((sum, t) => sum + t.amount, 0);
                
                data.push({
                    name: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
                    'Hoa hồng': dailyCommission,
                    'Thưởng & Hỗ trợ': dailyBonus,
                });
            }
        } else { // month
            for (let i = 0; i < 12; i++) {
                const monthlyTxs = relevantTransactions.filter(t => new Date(t.date).getMonth() === i);
                const monthlyCommission = monthlyTxs.filter(t => commissionTypes.includes(t.type)).reduce((sum, t) => sum + t.amount, 0);
                const monthlyBonus = monthlyTxs.filter(t => bonusTypes.includes(t.type)).reduce((sum, t) => sum + t.amount, 0);
                
                data.push({
                    name: `T${i + 1}`,
                    'Hoa hồng': monthlyCommission,
                    'Thưởng & Hỗ trợ': monthlyBonus,
                });
            }
        }
        
        return { chartData: data, availableYears: sortedYears };
    }, [transactions, timeframe, isYearSelected]);

    const filteredTransactions = useMemo(() => {
        return [...transactions]
            .filter(tx => {
                const searchLower = searchTerm.toLowerCase();
                return !searchTerm || tx.description.toLowerCase().includes(searchLower);
            })
            .filter(tx => typeFilter === 'all' || tx.type === typeFilter)
            .filter(tx => statusFilter === 'all' || tx.status === statusFilter)
            .filter(tx => {
                if (flowFilter === 'all') return true;
                if (flowFilter === 'income') return tx.amount > 0 || (tx.amount === 0 && (tx.creditAmount || 0) > 0);
                return tx.amount < 0 || (tx.amount === 0 && (tx.creditAmount || 0) < 0);
            })
            .filter(tx => !startDate || tx.date >= startDate)
            .filter(tx => !endDate || tx.date <= endDate)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [transactions, searchTerm, typeFilter, flowFilter, statusFilter, startDate, endDate]);

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = filteredTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleVndAmountChange = (value: number) => {
        if (!user) return;
        if (value > user.balance) {
            setConvertError(`Số dư không đủ.`);
            setConvertAmount(user.balance);
        } else {
            setConvertError('');
            setConvertAmount(value);
        }
    };

    const handleConvertVndToCreditsClick = () => {
        if (!user) return;
        if (convertAmount <= 0 || convertAmount > user.balance) {
            setConvertError('Số tiền không hợp lệ.');
            return;
        }
        handleConvertVndToCredits(user.id, user.balance, user.creditBalance, user.name, user.avatar, convertAmount);
        setConvertAmount(0);
        setConvertError('');
    };
    
    const isOverdue = !!(user?.nextMaintenanceDate && new Date() > new Date(user.nextMaintenanceDate));
    const isRestricted = user?.status !== UserStatus.Active || isOverdue;
    
    // Helper to format Bank Info for Withdrawal Table
    const getWithdrawalDestination = (req: WithdrawalRequest) => {
        if (req.paymentMethod === 'bank') {
            return (
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{user?.bankName}</span>
                    <span className="text-[10px] text-slate-500">{user?.bankAccountNumber}</span>
                    <span className="text-[10px] text-slate-400 uppercase">{user?.bankAccountName}</span>
                </div>
            );
        }
        return (
            <div className="flex flex-col">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Ví Momo</span>
                <span className="text-[10px] text-slate-500">{user?.momoPhoneNumber}</span>
            </div>
        );
    };

    if (!user) return null;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Ví Của Tôi</h2>
            
            {/* Balance Overview */}
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6 flex flex-wrap gap-6 items-center justify-between">
                <div className="flex gap-8 flex-wrap">
                    <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Số dư (Ví Chính)</p>
                        <p className="text-4xl font-bold text-slate-800 dark:text-slate-200">{user.balance.toLocaleString('vi-VN')}đ</p>
                    </div>
                    {(user.supportWalletBalance || 0) > 0 && (
                       <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Số dư (Ví Hỗ Trợ)</p>
                            <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{(user.supportWalletBalance || 0).toLocaleString('vi-VN')}đ</p>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => onNavigate('Nạp tiền')} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                       <ArrowDownCircleIcon className="h-5 w-5" /> Nạp tiền
                    </button>
                    <button 
                        onClick={() => onNavigate('Rút tiền')} 
                        disabled={isRestricted && !(user.supportWalletBalance && user.supportWalletBalance > 0)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed"
                    >
                        <ArrowUpCircleIcon className="h-5 w-5" /> Rút tiền
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Credit Wallet */}
                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">Ví Credit</h3>
                    <div className="space-y-6">
                        <div className="p-6 bg-yellow-50 dark:bg-yellow-500/10 rounded-xl border border-yellow-300 dark:border-yellow-600/30 flex flex-col justify-center text-center">
                             <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Số dư Credit</p>
                            <p className="text-5xl font-bold text-yellow-600 dark:text-yellow-400 my-2">
                                {user.creditBalance.toLocaleString('vi-VN')}
                            </p>
                            <p className="text-base text-slate-500 dark:text-slate-400">≈ {(user.creditBalance * CREDIT_TO_VND_RATE).toLocaleString('vi-VN')}đ</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 pb-3 border-b border-gray-200 dark:border-slate-700 mb-4">Chuyển VNĐ sang Credit</h4>
                            <div className="space-y-4">
                                <p className="text-sm text-slate-500 dark:text-slate-400">Tỷ giá: <span className="font-semibold text-slate-700 dark:text-slate-300">{CREDIT_TO_VND_RATE.toLocaleString('vi-VN')}đ = 1 Credit</span></p>
                                <div>
                                    <div className="relative">
                                        <FormattedNumberInput
                                            value={convertAmount}
                                            onChange={handleVndAmountChange}
                                            placeholder="Nhập số tiền VNĐ"
                                            className="block w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-transparent focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>
                                    {convertError && <p className="text-xs text-red-500 mt-1">{convertError}</p>}
                                </div>
                                <div className="text-center text-base font-semibold text-slate-700 dark:text-slate-300">
                                    Bạn sẽ nhận: <span className="text-xl text-yellow-500 ml-2">{(convertAmount / CREDIT_TO_VND_RATE).toLocaleString('vi-VN')} Credit</span>
                                </div>
                                <button onClick={handleConvertVndToCreditsClick} disabled={convertAmount <= 0 || !!convertError} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-slate-900 bg-yellow-400 rounded-lg hover:bg-yellow-500 disabled:bg-yellow-300/50 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors">
                                    <ArrowsRightLeftIcon className="h-5 w-5" /> Chuyển đổi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Income Analytics */}
                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6 flex flex-col">
                    <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                         <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Phân tích Thu nhập</h3>
                         <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                            <button onClick={() => setTimeframe('7d')} className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${timeframe === '7d' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-500 dark:text-slate-400'}`}>7 ngày</button>
                            <button onClick={() => setTimeframe('30d')} className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${timeframe === '30d' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-500 dark:text-slate-400'}`}>30 ngày</button>
                            <button onClick={() => setTimeframe('90d')} className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${timeframe === '90d' ? 'bg-white dark:bg-slate-600 shadow' : 'text-slate-500 dark:text-slate-400'}`}>90 ngày</button>
                             <select
                                value={isYearSelected ? timeframe : 'placeholder'}
                                onChange={e => setTimeframe(e.target.value)}
                                className={`pl-3 pr-8 py-1 text-xs font-semibold rounded-md appearance-none bg-transparent border-none focus:ring-0 transition-colors ${isYearSelected ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}
                            >
                                <option value="placeholder" disabled>Năm</option>
                                {availableYears.map(year => ( <option key={year} value={String(year)}>{year}</option> ))}
                            </select>
                        </div>
                    </div>
                     <div className="flex-grow flex items-center justify-center min-h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorBonus" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.7}/>
                                        <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100, 116, 139, 0.2)" />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="#94a3b8" />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="#94a3b8" tickFormatter={(value) => new Intl.NumberFormat('vi-VN', { notation: 'compact', compactDisplay: 'short' }).format(value as number)} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend wrapperStyle={{fontSize: '12px'}} iconSize={10} />
                                <Area type="monotone" dataKey="Hoa hồng" stackId="1" stroke="#818cf8" fill="url(#colorCommission)" strokeWidth={2} />
                                <Area type="monotone" dataKey="Thưởng & Hỗ trợ" stackId="1" stroke="#34d399" fill="url(#colorBonus)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            
            {/* NEW SECTION: REQUEST HISTORY - REDESIGNED AS TABS */}
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                <div className="mb-6">
                     <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">Lịch sử Yêu cầu Thanh toán</h3>
                     
                     <div className="border-b border-slate-200 dark:border-slate-700">
                        <nav className="-mb-px flex space-x-6">
                            <button
                                onClick={() => setRequestTab('deposit')}
                                className={`
                                    whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all outline-none focus:outline-none
                                    ${requestTab === 'deposit'
                                        ? 'border-green-500 text-green-600 dark:text-green-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300'}
                                `}
                            >
                                <ArrowDownCircleIcon className={`h-5 w-5 ${requestTab === 'deposit' ? 'text-green-500' : 'text-slate-400'}`} />
                                Yêu cầu Nạp tiền
                            </button>

                            <button
                                onClick={() => setRequestTab('withdrawal')}
                                className={`
                                    whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all outline-none focus:outline-none
                                    ${requestTab === 'withdrawal'
                                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:text-slate-300'}
                                `}
                            >
                                <ArrowUpCircleIcon className={`h-5 w-5 ${requestTab === 'withdrawal' ? 'text-indigo-500' : 'text-slate-400'}`} />
                                Yêu cầu Rút tiền
                            </button>
                        </nav>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                         <thead className="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50 dark:text-slate-400 font-bold">
                            <tr>
                                <th scope="col" className="px-6 py-3">Mã phiếu</th>
                                <th scope="col" className="px-6 py-3">Thời gian</th>
                                <th scope="col" className="px-6 py-3">Phương thức</th>
                                <th scope="col" className="px-6 py-3">
                                    {requestTab === 'deposit' ? 'Nội dung CK' : 'Tài khoản nhận'}
                                </th>
                                <th scope="col" className="px-6 py-3 text-right">Số tiền</th>
                                <th scope="col" className="px-6 py-3 text-center">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {requestTab === 'deposit' ? (
                                paginatedRequests.length > 0 ? paginatedRequests.map((req: any) => (
                                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">#{req.id.slice(-6)}</td>
                                        <td className="px-6 py-4">{req.requestDate}</td>
                                        <td className="px-6 py-4 flex items-center gap-2">
                                            {req.paymentMethod === 'bank_transfer' ? <BuildingLibraryIcon className="h-4 w-4 text-slate-400"/> : <QrCodeIcon className="h-4 w-4 text-pink-400"/>}
                                            {req.paymentMethod === 'bank_transfer' ? 'Chuyển khoản' : 'Momo QR'}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded w-fit">{req.transferCode}</td>
                                        <td className="px-6 py-4 text-right font-bold text-green-600">+{req.amount.toLocaleString('vi-VN')}đ</td>
                                        <td className="px-6 py-4 text-center"><RequestStatusBadge status={req.status} /></td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={6} className="text-center py-8 text-slate-400">Chưa có yêu cầu nạp tiền nào.</td></tr>
                                )
                            ) : (
                                paginatedRequests.length > 0 ? paginatedRequests.map((req: any) => (
                                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">#{req.id.slice(-6)}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span>{req.requestDate}</span>
                                                <span className="text-[10px] text-slate-400">{req.updatedAt !== req.requestDate ? `Cập nhật: ${req.updatedAt}` : ''}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 flex items-center gap-2">
                                            {req.paymentMethod === 'bank' ? <BuildingLibraryIcon className="h-4 w-4 text-slate-400"/> : <DevicePhoneMobileIcon className="h-4 w-4 text-pink-400"/>}
                                            {req.paymentMethod === 'bank' ? 'Ngân hàng' : 'Ví Momo'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getWithdrawalDestination(req)}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-red-500">-{req.amount.toLocaleString('vi-VN')}đ</td>
                                        <td className="px-6 py-4 text-center"><RequestStatusBadge status={req.status} /></td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={6} className="text-center py-8 text-slate-400">Chưa có yêu cầu rút tiền nào.</td></tr>
                                )
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION FOR REQUESTS */}
                {currentRequestList.length > 0 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-4">
                            <RowsPerPageSelector value={requestItemsPerPage} onChange={setRequestItemsPerPage} options={[10, 20, 50]} />
                            <div className="text-xs font-bold text-slate-400 uppercase">
                                Hiển thị {paginatedRequests.length > 0 ? (requestCurrentPage - 1) * requestItemsPerPage + 1 : 0} đến {Math.min(requestCurrentPage * requestItemsPerPage, currentRequestList.length)} / {currentRequestList.length} mục
                            </div>
                        </div>
                        {totalRequestPages > 1 && <Pagination currentPage={requestCurrentPage} totalPages={totalRequestPages} onPageChange={setRequestCurrentPage} />}
                    </div>
                )}
            </div>

            {/* TRANSACTION HISTORY SECTION */}
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Biến động Số dư (Chi tiết)</h3>
                    {isFilterActive && <button onClick={handleResetFilters} className="text-xs font-bold text-red-500 hover:text-red-600 uppercase tracking-wider border-b border-red-500">Xóa tất cả bộ lọc</button>}
                </div>

                {/* Advanced Filter Bar */}
                <div className="flex flex-wrap items-center gap-3 mb-6 bg-slate-50/50 dark:bg-slate-900/20 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                    {/* Search */}
                    <div className="relative flex-grow min-w-[200px]">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Tìm nội dung giao dịch..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 text-xs border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:ring-1 focus:ring-indigo-500"
                        />
                        {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-3.5 w-3.5"/></button>}
                    </div>

                    {/* Type Filter (Loại hình) */}
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as any)}
                        className="px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="all">Tất cả Loại giao dịch</option>
                        <option value={TransactionType.CommissionParticipation}>Hoa hồng (Tham gia)</option>
                        <option value={TransactionType.CommissionMaintenance}>Hoa hồng (Duy trì)</option>
                        <option value={TransactionType.Withdrawal}>Rút tiền</option>
                        <option value={TransactionType.Deposit}>Nạp tiền</option>
                        <option value={TransactionType.PenaltyFee}>Phí phạt</option>
                        <option value={TransactionType.CreditConversion}>Đổi Credit</option>
                    </select>

                    {/* Flow Filter */}
                    <select
                        value={flowFilter}
                        onChange={(e) => setFlowFilter(e.target.value as any)}
                        className="px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="all">Tất cả Dòng tiền</option>
                        <option value="income">Giao dịch Thu (+)</option>
                        <option value="expense">Giao dịch Chi (-)</option>
                    </select>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-xs focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="all">Tất cả Trạng thái</option>
                        <option value={TransactionStatus.Completed}>Hoàn thành</option>
                        <option value={TransactionStatus.Pending}>Đang chờ</option>
                        <option value={TransactionStatus.Failed}>Thất bại</option>
                    </select>

                    {/* Date Picker */}
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)} 
                                className="pl-3 pr-2 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-xs" 
                            />
                        </div>
                        <span className="text-slate-400">-</span>
                        <div className="relative">
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)} 
                                className="pl-3 pr-2 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-xs" 
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                         <thead className="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50 dark:text-slate-400 font-bold">
                            <tr>
                                <th scope="col" className="px-6 py-4">Mô tả</th>
                                <th scope="col" className="px-6 py-4">Ngày</th>
                                <th scope="col" className="px-6 py-4">Loại hình</th>
                                <th scope="col" className="px-6 py-4 text-center">Phân loại</th>
                                <th scope="col" className="px-6 py-4">Gói</th>
                                <th scope="col" className="px-6 py-4">Trạng thái</th>
                                <th scope="col" className="px-6 py-4 text-right">Biến động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {paginatedTransactions.map(tx => {
                                // Logic: Ưu tiên số tiền VNĐ. Nếu VNĐ != 0 thì dùng dấu của VNĐ để xác định Thu/Chi.
                                // Nếu VNĐ == 0 (ví dụ đổi Credit hoặc dùng tool), thì dùng dấu của Credit.
                                const isIncome = tx.amount !== 0 ? tx.amount > 0 : (tx.creditAmount || 0) > 0;
                                return (
                                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">{tx.description}</p>
                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{tx.id}</p>
                                    </td>
                                    <td className="px-6 py-4 text-xs whitespace-nowrap">{tx.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap"><TransactionTypeBadge type={tx.type} /></td>
                                    <td className="px-6 py-4 text-center">
                                        {isIncome ? (
                                            <span className="px-2 py-1 text-[10px] font-black rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">THU (+)</span>
                                        ) : (
                                            <span className="px-2 py-1 text-[10px] font-black rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800">CHI (-)</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {tx.sourceTier && tx.sourceTier !== MembershipTier.None ? (
                                            <TierBadge tier={tx.sourceTier} />
                                        ) : (
                                            '--'
                                        )}
                                    </td>
                                    <td className="px-6 py-4"><TransactionStatusBadge status={tx.status} /></td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex flex-col items-end gap-1">
                                            {tx.amount !== 0 && (
                                                <span className={`font-bold text-sm ${tx.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('vi-VN')}đ
                                                </span>
                                            )}
                                            {tx.creditAmount !== undefined && tx.creditAmount !== 0 && (
                                                <span className={`flex items-center gap-1 font-black text-xs ${tx.creditAmount > 0 ? 'text-indigo-600' : 'text-amber-600'}`}>
                                                    <SparklesIcon className="h-3 w-3" />
                                                    {tx.creditAmount > 0 ? '+' : ''}{tx.creditAmount.toLocaleString('vi-VN')} P
                                                </span>
                                            )}
                                            {tx.amount === 0 && (tx.creditAmount === undefined || tx.creditAmount === 0) && (
                                                <span className="text-slate-400">--</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
                {filteredTransactions.length === 0 && 
                    <div className="text-center py-16 text-slate-500">
                        <DocumentMagnifyingGlassIcon className="h-12 w-12 mx-auto text-slate-400 mb-2" />
                        <p className="font-semibold">Không tìm thấy giao dịch nào.</p>
                        <p className="text-sm mt-1">Hãy thử thay đổi bộ lọc để tìm kiếm kết quả khác.</p>
                    </div>
                }
                {filteredTransactions.length > 0 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                        <div className="flex items-center gap-4">
                            <RowsPerPageSelector value={itemsPerPage} onChange={setItemsPerPage} options={[10, 20, 50]} />
                            <div className="text-xs font-bold text-slate-400 uppercase">
                                Hiển thị {filteredTransactions.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} đến {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} / {filteredTransactions.length} mục
                            </div>
                        </div>
                        {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WalletPage;
