
import React, { useState, useMemo, useEffect } from 'react';
import { 
    CurrencyDollarIcon, DocumentArrowDownIcon, 
    MagnifyingGlassIcon, ClockIcon,
    ArrowTrendingUpIcon, ArrowTrendingDownIcon,
    CalendarDaysIcon, BanknotesIcon, DevicePhoneMobileIcon,
    ArrowPathIcon, CheckCircleIcon, XCircleIcon,
    ArrowDownCircleIcon, ArrowUpCircleIcon
} from '../../components/Icons';
import { Action } from '../../types';
import { 
    TransactionStatus, TransactionType, WithdrawalRequest, 
    FundType, TRANSACTION_TYPE_LABELS, TRANSACTION_STATUS_LABELS, WithdrawalStatus, DepositRequest 
} from '../../features/finance/types';
import { AdminManagedUser } from '../../features/users/types';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import { exportToCsv } from '../../utils/exportUtils';
import { useToast } from '../../components/ToastProvider';
import FinanceStatCard from '../../components/admin/FinanceStatCard';
import { TransactionStatusBadge } from '../../components/Badges';
import RowsPerPageSelector from '../../components/RowsPerPageSelector';
import { useFinance } from '../../features/finance/useFinance';
import { useUser } from '../../features/users/useUser';
import { useActions } from '../../features/actions/useActions';

const flattenUsers = (users: AdminManagedUser[]): AdminManagedUser[] => {
    return users.flatMap(u => [u, ...(u.children ? flattenUsers(u.children) : [])]);
};

interface FinancePageProps {
    action: Action | null;
    onActionConsumed: () => void;
}

const getAdminTransactionLabel = (displayAmount: number) => {
    if (displayAmount < 0) {
        return <span className="px-2 py-1 text-[10px] font-semibold rounded-full uppercase bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">THỰC CHI (-)</span>;
    }
    return <span className="px-2 py-1 text-[10px] font-semibold rounded-full uppercase bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">THỰC THU (+)</span>;
};

const FinancePage: React.FC<FinancePageProps> = () => {
    const { financeState } = useFinance();
    const { allTransactions, withdrawalRequests, depositRequests, fundStatus } = financeState;
    const { userState: { allUsers: users } } = useUser();
    const { handleProcessWithdrawal, handleProcessDeposit } = useActions();
    const { addToast } = useToast();
    
    const usersMap = useMemo(() => {
        const flatUsers = flattenUsers(users);
        return new Map(flatUsers.map(u => [u.id, u]));
    }, [users]);

    // Bộ lọc Biến động ví Admin
    const [globalFilters, setGlobalFilters] = useState({
        startDate: '',
        endDate: new Date().toISOString().split('T')[0],
        search: ''
    });

    const handleResetGlobalFilters = () => setGlobalFilters({ startDate: '', endDate: new Date().toISOString().split('T')[0], search: '' });
    const isGlobalFilterActive = globalFilters.startDate !== '' || globalFilters.search !== '';

    // --- REQUESTS TAB STATE ---
    const [activeRequestTab, setActiveRequestTab] = useState<'withdrawal' | 'deposit'>('withdrawal');

    // Filters for Requests
    const [requestStatusFilter, setRequestStatusFilter] = useState<'pending' | 'completed' | 'rejected' | 'failed'>('pending');
    const [requestFilters, setRequestFilters] = useState({
        startDate: '',
        endDate: new Date().toISOString().split('T')[0],
        search: ''
    });

    const [activeMainTab, setActiveMainTab] = useState<'requests' | 'history' | 'reconciliation'>('requests');

    // Handle Deep Linking / Navigation
    useEffect(() => {
        const handleHashChange = () => {
             // Only react if the main page is Finance
             if (window.location.hash.startsWith('#Tài chính')) {
                 if (window.location.hash.includes('/deposit')) {
                    setActiveMainTab('requests');
                    setActiveRequestTab('deposit');
                    setRequestStatusFilter('pending');
                }
             }
        };

        // Run once on mount to handle initial load
        handleHashChange();

        // Listen for changes
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const handleResetRequestFilters = () => setRequestFilters({ startDate: '', endDate: new Date().toISOString().split('T')[0], search: '' });
    const isRequestFilterActive = requestFilters.startDate !== '' || requestFilters.search !== '';
    
    const [requestPage, setRequestPage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);
    const itemsPerPage = 10;
    
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{ type: 'approve' | 'reject', request: WithdrawalRequest | DepositRequest, kind: 'withdrawal' | 'deposit' } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const stats = useMemo(() => {
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

        // CẬP NHẬT QUAN TRỌNG: Chỉ tính Lợi nhuận thực tế (SystemProfit), KHÔNG tính tổng phí người dùng đóng
        const profitTypes = [
            TransactionType.SystemProfit,          // Lợi nhuận Admin (sau khi trừ HH & Quỹ)
            TransactionType.CommissionDifference,  // Hoa hồng trôi nổi (về Admin)
            TransactionType.PenaltyFee             // Phí phạt (về Admin)
        ];
        
        const payoutTypes = [TransactionType.Payout, TransactionType.LeaderBonus, TransactionType.SupportFundPayout];

        // Lợi nhuận
        const totalProfit = allTransactions
            .filter(t => profitTypes.includes(t.type) && t.status === TransactionStatus.Completed)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const currentMonthProfit = allTransactions
            .filter(t => profitTypes.includes(t.type) && t.status === TransactionStatus.Completed && t.date >= startOfCurrentMonth)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);
            
        const prevMonthProfit = allTransactions
            .filter(t => profitTypes.includes(t.type) && t.status === TransactionStatus.Completed && t.date >= startOfPrevMonth && t.date <= endOfPrevMonth)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        // Chi trả
        const totalPayout = allTransactions
            .filter(t => payoutTypes.includes(t.type) && t.status === TransactionStatus.Completed)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const currentMonthPayout = allTransactions
            .filter(t => payoutTypes.includes(t.type) && t.status === TransactionStatus.Completed && t.date >= startOfCurrentMonth)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const prevMonthPayout = allTransactions
            .filter(t => payoutTypes.includes(t.type) && t.status === TransactionStatus.Completed && t.date >= startOfPrevMonth && t.date <= endOfPrevMonth)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0);

        const calculateChange = (curr: number, prev: number) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return ((curr - prev) / prev) * 100;
        };

        return {
            adminWallet: fundStatus[FundType.Admin]?.balance || 0,
            vat: fundStatus[FundType.VAT]?.balance || 0,
            corporateTax: fundStatus[FundType.CorporateTax]?.balance || 0,
            leaderBonus: fundStatus[FundType.LeaderBonus]?.balance || 0,
            supportFund: fundStatus[FundType.Support]?.balance || 0,
            profit: totalProfit,
            profitChange: calculateChange(currentMonthProfit, prevMonthProfit),
            payout: totalPayout,
            payoutChange: calculateChange(currentMonthPayout, prevMonthPayout)
        };
    }, [allTransactions, fundStatus]);

    // Combined filtered requests based on active tab
    const filteredRequests = useMemo(() => {
        let list: any[] = [];
        
        if (activeRequestTab === 'withdrawal') {
            list = withdrawalRequests.map(req => {
                const u = usersMap.get(req.userId);
                const info = req.paymentMethod === 'bank' 
                    ? `${u?.bankAccountNumber || 'N/A'} (${u?.bankName || '?'})`
                    : u?.momoPhoneNumber || 'N/A';
                return { ...req, info, userName: u?.name || req.user.name, kind: 'withdrawal' };
            });
        } else {
            list = depositRequests.map(req => {
                 const u = usersMap.get(req.userId);
                 const info = req.transferCode || 'N/A';
                 return { ...req, info, userName: u?.name || req.user.name, kind: 'deposit' };
            });
        }

        return list
            .filter(r => {
                // Map frontend status filter to actual data status
                if (requestStatusFilter === 'pending') return r.status === 'pending';
                if (requestStatusFilter === 'completed') return r.status === 'approved' || r.status === 'completed';
                if (requestStatusFilter === 'rejected') return r.status === 'rejected' || r.status === 'failed';
                return true;
            })
            .filter(r => {
                const searchMatch = !requestFilters.search || 
                                  r.userName.toLowerCase().includes(requestFilters.search.toLowerCase()) ||
                                  r.info.toLowerCase().includes(requestFilters.search.toLowerCase());
                const dateMatch = (!requestFilters.startDate || r.requestDate >= requestFilters.startDate) && 
                                 (!requestFilters.endDate || r.requestDate <= requestFilters.endDate);
                return searchMatch && dateMatch;
            })
            .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
    }, [withdrawalRequests, depositRequests, activeRequestTab, requestStatusFilter, requestFilters, usersMap]);


    // Lịch sử thực tế (Chỉ giao dịch đã Hoàn thành)
    const [historyTypeFilter, setHistoryTypeFilter] = useState<string>('all');
    
    const adminWalletHistory = useMemo(() => {
        // CẬP NHẬT: Loại bỏ ParticipationFee và MaintenanceFee khỏi danh sách hiển thị
        // Vì đây là số tiền User chi ra, không phải doanh thu ròng của Admin.
        const adminRelevantTypes = [
            TransactionType.SystemProfit,          // Doanh thu thực
            TransactionType.CommissionDifference,  // Hoa hồng thừa
            TransactionType.PenaltyFee,            // Phí phạt
            TransactionType.Payout,                // Chi trả rút tiền
            TransactionType.SupportFundPayout,     // Chi quỹ hỗ trợ (nếu cấu hình admin quản lý)
            TransactionType.AdminAdjustment,       // Admin tự điều chỉnh
            TransactionType.TaxDeduction           // Thuế
        ];

        return allTransactions
            .filter(t => adminRelevantTypes.includes(t.type) && t.status === TransactionStatus.Completed)
            .map(t => {
                const user = usersMap.get(t.userId);
                const targetName = user?.name || (t.userId === 'system' ? 'Hệ thống' : 'N/A');
                
                // Logic dòng tiền Admin:
                let displayAmount = t.amount;
                
                // Nếu là Adjustment: Nạp cho user (t.amount > 0) -> Admin mất tiền (âm)
                if (t.type === TransactionType.AdminAdjustment) {
                    displayAmount = -t.amount;
                } else if (t.type === TransactionType.TaxDeduction) {
                    displayAmount = Math.abs(t.amount); // Ghi nhận thu vào quỹ thuế
                } else {
                    const inTypes = [TransactionType.SystemProfit, TransactionType.CommissionDifference, TransactionType.PenaltyFee];
                    // Nếu là loại Thu -> Số dương. Nếu loại Chi -> Số âm.
                    displayAmount = inTypes.includes(t.type) ? Math.abs(t.amount) : -Math.abs(t.amount);
                }

                return { ...t, displayAmount, targetName };
            })
            .filter(t => {
                const searchMatch = !globalFilters.search || 
                                  t.targetName.toLowerCase().includes(globalFilters.search.toLowerCase()) || 
                                  t.description.toLowerCase().includes(globalFilters.search.toLowerCase());
                const dateMatch = (!globalFilters.startDate || t.date >= globalFilters.startDate) && 
                                 (!globalFilters.endDate || t.date <= globalFilters.endDate);
                const typeMatch = historyTypeFilter === 'all' || 
                                 (historyTypeFilter === 'inflow' && t.displayAmount > 0) || 
                                 (historyTypeFilter === 'outflow' && t.displayAmount < 0) ||
                                 (historyTypeFilter === 'tax' && t.type === TransactionType.TaxDeduction);
                return searchMatch && dateMatch && typeMatch;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allTransactions, globalFilters, usersMap, historyTypeFilter]);

    const handleRequestAction = (decision: 'approve' | 'reject', request: any, kind: 'withdrawal' | 'deposit') => {
        setConfirmAction({ type: decision, request, kind });
        setIsConfirmModalOpen(true);
    };

    // Đối soát theo tháng/năm
    const [reconYear, setReconYear] = useState(new Date().getFullYear());
    const monthlyReconciliation = useMemo(() => {
        const months = Array.from({ length: 12 }, (_, i) => i + 1);
        return months.map(month => {
            const monthStr = month.toString().padStart(2, '0');
            const yearStr = reconYear.toString();
            
            // Tìm các giao dịch trong tháng này
            const monthTransactions = allTransactions.filter(t => {
                const parts = t.date.split('-'); // YYYY-MM-DD
                if (parts.length === 3) {
                    return parts[0] === yearStr && parts[1] === monthStr;
                }
                const partsSlash = t.date.split('/'); // DD/MM/YYYY
                if (partsSlash.length === 3) {
                    return partsSlash[2] === yearStr && partsSlash[1] === monthStr;
                }
                return false;
            });

            const totalIn = monthTransactions
                .filter(t => [TransactionType.Deposit, TransactionType.ParticipationFee, TransactionType.MaintenanceFee].includes(t.type))
                .filter(t => t.amount > 0)
                .reduce((sum, t) => sum + t.amount, 0);
                
            const totalOut = monthTransactions
                .filter(t => t.type === TransactionType.Withdrawal)
                .reduce((sum, t) => sum + Math.abs(t.amount), 0);

            return {
                month: `Tháng ${month}/${reconYear}`,
                inflow: totalIn,
                outflow: totalOut,
                balance: totalIn - totalOut
            };
        });
    }, [allTransactions, reconYear]);

    const handleConfirmProcess = async () => {
        if (!confirmAction) return;
        setIsProcessing(true);
        
        if (confirmAction.kind === 'withdrawal') {
            handleProcessWithdrawal(confirmAction.request.id, confirmAction.type);
        } else {
             handleProcessDeposit(confirmAction.request.id, confirmAction.type);
        }
        
        setIsProcessing(false);
        setIsConfirmModalOpen(false);
    };

    const handleExportRequests = () => {
        if (filteredRequests.length === 0) {
            addToast("Không có dữ liệu để xuất.", "info");
            return;
        }

        const exportData = filteredRequests.map(req => ({
            "Mã yêu cầu": req.id,
            "Ngày yêu cầu": req.requestDate,
            "Thành viên": req.userName,
            "Loại yêu cầu": req.kind === 'withdrawal' ? 'Rút tiền' : 'Nạp tiền',
            "Số tiền": req.amount,
            "Trạng thái": req.status === 'pending' ? 'Chờ xử lý' : (req.status === 'completed' || req.status === 'approved' ? 'Thành công' : 'Thất bại/Từ chối'),
            "Phương thức": req.paymentMethod,
            "Thông tin chi tiết": req.info
        }));

        const typeName = activeRequestTab === 'withdrawal' ? 'rut_tien' : 'nap_tien';
        const fileName = `bao_cao_${typeName}_${new Date().toISOString().split('T')[0]}.csv`;
        exportToCsv(fileName, exportData);
        addToast("Đã bắt đầu tải xuống tệp báo cáo!", "success");
    };

    return (
        <div className="space-y-8 pb-10">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">Kiểm soát Tài chính</h2>

            <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Xác nhận" confirmText="Xác nhận" onConfirm={handleConfirmProcess} isConfirmDisabled={isProcessing}>
                {confirmAction && (
                    <p>
                        Xác nhận {confirmAction.type === 'approve' ? 'duyệt' : 'từ chối'} yêu cầu {confirmAction.kind === 'withdrawal' ? 'rút' : 'nạp'} 
                        <span className={`font-bold ml-1 ${confirmAction.kind === 'withdrawal' ? 'text-red-500' : 'text-green-500'}`}>
                             {confirmAction.request.amount.toLocaleString()}đ
                        </span> của {confirmAction.request.user.name}?
                    </p>
                )}
            </Modal>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                 <FinanceStatCard title="Ví Admin" value={stats.adminWallet} icon={<CurrencyDollarIcon className="h-6 w-6"/>} color="green" />
                 <FinanceStatCard title="Lợi nhuận ròng" value={stats.profit} change={stats.profitChange} icon={<ArrowTrendingUpIcon className="h-6 w-6"/>} color="blue" />
                 <FinanceStatCard title="Chi trả" value={stats.payout} change={stats.payoutChange} icon={<ArrowTrendingDownIcon className="h-6 w-6"/>} color="orange" />
                 <FinanceStatCard title="Quỹ Thuế VAT" value={stats.vat} icon={<BanknotesIcon className="h-6 w-6"/>} color="blue" />
                 <FinanceStatCard title="Quỹ Thuế TNDN" value={stats.corporateTax} icon={<BanknotesIcon className="h-6 w-6"/>} color="blue" />
                 <FinanceStatCard title="Quỹ Thưởng Leader" value={stats.leaderBonus} icon={<ArrowTrendingUpIcon className="h-6 w-6"/>} color="purple" />
                 <FinanceStatCard title="Quỹ Hỗ Trợ" value={stats.supportFund} icon={<BanknotesIcon className="h-6 w-6"/>} color="blue" />
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 mt-8 mb-6 overflow-x-auto">
                <button 
                    onClick={() => setActiveMainTab('requests')}
                    className={`px-6 py-3 text-sm font-bold uppercase transition-all border-b-2 whitespace-nowrap ${activeMainTab === 'requests' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    <div className="flex items-center gap-2">
                        <BanknotesIcon className="h-4 w-4" />
                        Quản lý Yêu cầu Thanh toán
                    </div>
                </button>
                <button 
                    onClick={() => setActiveMainTab('history')}
                    className={`px-6 py-3 text-sm font-bold uppercase transition-all border-b-2 whitespace-nowrap ${activeMainTab === 'history' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    <div className="flex items-center gap-2">
                        <ClockIcon className="h-4 w-4" />
                        Biến động Ví Admin
                    </div>
                </button>
                <button 
                    onClick={() => setActiveMainTab('reconciliation')}
                    className={`px-6 py-3 text-sm font-bold uppercase transition-all border-b-2 whitespace-nowrap ${activeMainTab === 'reconciliation' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    <div className="flex items-center gap-2">
                        <ArrowPathIcon className="h-4 w-4" />
                        Bảng đối soát Thu - Chi
                    </div>
                </button>
            </div>

            {activeMainTab === 'requests' && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wide">Quản lý Yêu cầu Thanh toán</h3>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <CalendarDaysIcon className="h-4 w-4 text-slate-400" />
                            <input type="date" value={requestFilters.startDate} onChange={e => setRequestFilters(p => ({...p, startDate: e.target.value}))} className="bg-transparent text-xs font-medium text-slate-600 outline-none" />
                            <span className="text-slate-300">/</span>
                            <input type="date" value={requestFilters.endDate} onChange={e => setRequestFilters(p => ({...p, endDate: e.target.value}))} className="bg-transparent text-xs font-medium text-slate-600 outline-none" />
                        </div>
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input type="text" placeholder="Tìm tên/mã GD..." value={requestFilters.search} onChange={e => setRequestFilters(p => ({...p, search: e.target.value}))} className="pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none w-48 focus:ring-1 focus:ring-indigo-500" />
                        </div>
                        {isRequestFilterActive && <button onClick={handleResetRequestFilters} className="p-2 text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600"><ArrowPathIcon className="h-4 w-4"/></button>}
                        <button onClick={handleExportRequests} className="p-2 text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-md hover:bg-green-200 dark:hover:bg-green-900" title="Xuất Excel">
                            <DocumentArrowDownIcon className="h-4 w-4"/>
                        </button>
                    </div>
                </div>

                {/* Main Tabs (Withdraw vs Deposit) */}
                <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 mb-4">
                     <button 
                        onClick={() => { setActiveRequestTab('withdrawal'); setRequestStatusFilter('pending'); setRequestPage(1); }} 
                        className={`flex items-center gap-2 pb-3 px-2 text-sm font-bold transition-all relative ${activeRequestTab === 'withdrawal' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ArrowUpCircleIcon className="h-5 w-5"/> Yêu cầu Rút tiền
                        {activeRequestTab === 'withdrawal' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 dark:bg-indigo-400"></div>}
                    </button>
                    <button 
                        onClick={() => { setActiveRequestTab('deposit'); setRequestStatusFilter('pending'); setRequestPage(1); }} 
                        className={`flex items-center gap-2 pb-3 px-2 text-sm font-bold transition-all relative ${activeRequestTab === 'deposit' ? 'text-green-600 dark:text-green-400' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ArrowDownCircleIcon className="h-5 w-5"/> Yêu cầu Nạp tiền
                        {activeRequestTab === 'deposit' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-green-600 dark:bg-green-400"></div>}
                    </button>
                </div>
                
                {/* Sub Tabs (Status) */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    <button onClick={() => setRequestStatusFilter('pending')} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${requestStatusFilter === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>Chờ xử lý</button>
                    <button onClick={() => setRequestStatusFilter('completed')} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${requestStatusFilter === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>Đã duyệt</button>
                    <button onClick={() => setRequestStatusFilter('rejected')} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${requestStatusFilter === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>Đã từ chối</button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 font-bold">
                            <tr>
                                <th className="px-4 py-3">Ngày yêu cầu</th>
                                <th className="px-4 py-3">Thành viên</th>
                                <th className="px-4 py-3">
                                    {activeRequestTab === 'withdrawal' ? 'Thông tin nhận tiền' : 'Mã giao dịch / Nội dung'}
                                </th>
                                <th className="px-4 py-3">Phương thức</th>
                                <th className="px-4 py-3 text-right">Số tiền</th>
                                <th className="px-4 py-3 text-center">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {filteredRequests.slice((requestPage - 1) * itemsPerPage, requestPage * itemsPerPage).map((req: any) => (
                                <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-4 py-4 text-xs text-slate-500">{req.requestDate}</td>
                                    <td className="px-4 py-4 font-semibold text-slate-800 dark:text-slate-200">{req.userName}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded w-fit max-w-[200px] truncate">
                                            {activeRequestTab === 'withdrawal' && (req.paymentMethod === 'bank' ? <BanknotesIcon className="h-3 w-3"/> : <DevicePhoneMobileIcon className="h-3 w-3"/>)}
                                            {req.info}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-[10px] font-bold uppercase text-slate-400">{req.paymentMethod}</td>
                                    <td className={`px-4 py-4 text-right font-bold ${activeRequestTab === 'withdrawal' ? 'text-red-500' : 'text-green-500'}`}>
                                        {activeRequestTab === 'withdrawal' ? '-' : '+'}{req.amount.toLocaleString()}đ
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        {req.status === 'pending' ? (
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleRequestAction('reject', req, activeRequestTab)} className="px-3 py-1 bg-red-50 text-red-600 rounded text-[11px] font-bold hover:bg-red-100">Từ chối</button>
                                                <button onClick={() => handleRequestAction('approve', req, activeRequestTab)} className="px-3 py-1 bg-indigo-600 text-white rounded text-[11px] font-bold hover:bg-indigo-700">Duyệt</button>
                                            </div>
                                        ) : (
                                            <span className={`px-3 py-1 rounded text-[11px] font-bold uppercase ${req.status === 'completed' || req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {req.status === 'completed' || req.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredRequests.length === 0 && <div className="text-center py-10 text-slate-400 italic text-sm">Không tìm thấy yêu cầu nào.</div>}

                <div className="flex justify-between items-center mt-4">
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Hiển thị {itemsPerPage} mục / trang</p>
                    <Pagination currentPage={requestPage} totalPages={Math.ceil(filteredRequests.length / itemsPerPage)} onPageChange={setRequestPage} />
                </div>
            </div>
            )}

            {activeMainTab === 'history' && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white uppercase tracking-wide">Biến động Ví Admin thực tế (Lợi nhuận & Chi phí)</h3>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={historyTypeFilter}
                            onChange={(e) => setHistoryTypeFilter(e.target.value)}
                            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="all">Tất cả giao dịch</option>
                            <option value="inflow">Thực Thu (+)</option>
                            <option value="outflow">Thực Chi (-)</option>
                            <option value="tax">Thuế (VAT, TNDN...)</option>
                        </select>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <input type="date" value={globalFilters.startDate} onChange={e => setGlobalFilters(p => ({...p, startDate: e.target.value}))} className="bg-transparent text-xs font-medium text-slate-600 outline-none" />
                            <span className="text-slate-300">-</span>
                            <input type="date" value={globalFilters.endDate} onChange={e => setGlobalFilters(p => ({...p, endDate: e.target.value}))} className="bg-transparent text-xs font-medium text-slate-600 outline-none" />
                        </div>
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input type="text" placeholder="Tìm nội dung..." value={globalFilters.search} onChange={e => setGlobalFilters(p => ({...p, search: e.target.value}))} className="pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none w-48 focus:ring-1 focus:ring-indigo-500" />
                        </div>
                        {isGlobalFilterActive && <button onClick={handleResetGlobalFilters} className="p-2 text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600"><ArrowPathIcon className="h-4 w-4" /></button>}
                        <button onClick={() => exportToCsv(`admin_history_${Date.now()}.csv`, adminWalletHistory)} className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200">
                            <DocumentArrowDownIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900/50 font-bold">
                            <tr>
                                <th className="px-4 py-3">Ngày</th>
                                <th className="px-4 py-3">Đối tượng</th>
                                <th className="px-4 py-3">Dòng tiền</th>
                                <th className="px-4 py-3">Nội dung</th>
                                <th className="px-4 py-3 text-right">Số tiền</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {adminWalletHistory.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage).map(t => (
                                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-4 py-4 text-xs text-slate-500">{t.date}</td>
                                    <td className="px-4 py-4 font-semibold text-slate-800 dark:text-slate-200">{t.targetName}</td>
                                    <td className="px-4 py-4">{getAdminTransactionLabel(t.displayAmount)}</td>
                                    <td className="px-4 py-4 text-xs text-slate-500 italic max-w-[200px] truncate">{t.description}</td>
                                    <td className={`px-4 py-4 text-right font-bold ${t.displayAmount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {t.displayAmount > 0 ? '+' : ''}{t.displayAmount.toLocaleString()}đ
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-between items-center mt-6">
                    <RowsPerPageSelector value={itemsPerPage} onChange={() => {}} options={[10]} />
                    <Pagination currentPage={historyPage} totalPages={Math.ceil(adminWalletHistory.length / itemsPerPage)} onPageChange={setHistoryPage} />
                </div>
            </div>
            )}

            {activeMainTab === 'reconciliation' && (
            <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                    <div>
                        <h3 className="text-lg font-bold">Bảng đối soát Thu - Chi</h3>
                        <p className="text-xs text-slate-500">So sánh dòng tiền thực nhận (Nạp/Phí) vs thực chi (Rút tiền) theo từng tháng trong năm</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <CalendarDaysIcon className="h-5 w-5 text-slate-400" />
                        <select 
                            value={reconYear} 
                            onChange={(e) => setReconYear(Number(e.target.value))}
                            className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>Năm {y}</option>)}
                        </select>
                        <button onClick={() => exportToCsv(`doi_soat_${reconYear}.csv`, monthlyReconciliation)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200">
                            <DocumentArrowDownIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900 uppercase text-xs font-bold text-slate-500">
                            <tr>
                                <th className="px-6 py-4">Khoảng thời gian</th>
                                <th className="px-6 py-4 text-right">Tổng thực Thu (+)</th>
                                <th className="px-6 py-4 text-right">Tổng thực Chi (-)</th>
                                <th className="px-6 py-4 text-right">Số dư kỳ (Bank)</th>
                                <th className="px-6 py-4 text-center">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {monthlyReconciliation.map((m, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{m.month}</td>
                                    <td className="px-6 py-4 text-right text-emerald-600 font-bold font-mono">+{m.inflow.toLocaleString()}đ</td>
                                    <td className="px-6 py-4 text-right text-red-500 font-bold font-mono">-{m.outflow.toLocaleString()}đ</td>
                                    <td className="px-6 py-4 text-right text-indigo-600 dark:text-indigo-400 font-bold font-mono">{m.balance.toLocaleString()}đ</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex justify-center">
                                            {m.balance > 0 ? (
                                                <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded">
                                                    <CheckCircleIcon className="h-3 w-3" /> Cân đối
                                                </span>
                                            ) : m.balance === 0 ? (
                                               <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 rounded">Không GD</span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                                                    <XCircleIcon className="h-3 w-3" /> Âm quỹ
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-indigo-50/50 dark:bg-indigo-900/10 font-bold">
                            <tr>
                                <td className="px-6 py-4 uppercase text-xs">Tổng cả năm {reconYear}</td>
                                <td className="px-6 py-4 text-right text-emerald-600 text-lg">
                                    +{monthlyReconciliation.reduce((sum, m) => sum + m.inflow, 0).toLocaleString()}đ
                                </td>
                                <td className="px-6 py-4 text-right text-red-500 text-lg">
                                    -{monthlyReconciliation.reduce((sum, m) => sum + m.outflow, 0).toLocaleString()}đ
                                </td>
                                <td className="px-6 py-4 text-right text-indigo-700 dark:text-indigo-300 text-2xl font-black">
                                    {monthlyReconciliation.reduce((sum, m) => sum + m.balance, 0).toLocaleString()}đ
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
            )}
        </div>
    );
};

export default FinancePage;
