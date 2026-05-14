
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Action, ActionType } from '../../types';
import { AdminManagedUser, UserStatus, MembershipTier } from '../../features/users/types';
import { Transaction, TransactionStatus } from '../../features/finance/types';
import { Permission } from '../../features/roles/types';
import { MagnifyingGlassIcon, PencilSquareIcon, PlusIcon, TrashIcon, NoSymbolIcon, ChevronRightIcon, EnvelopeIcon, ArrowPathIcon, CrownIcon, CurrencyDollarIcon, XCircleIcon, BanknotesIcon, EyeIcon, EyeSlashIcon, DocumentMagnifyingGlassIcon, UsersIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, DocumentArrowDownIcon, ShieldCheckIcon, UserGroupIcon, LockOpenIcon } from '../../components/Icons';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import { useToast } from '../../components/ToastProvider';
import { exportToCsv } from '../../utils/exportUtils';
import { useRoles } from '../../features/roles/useRoles';
import { useAuth } from '../../features/auth/useAuth';
import { TierBadge, UserStatusBadge, RankLevelBadge } from '../../components/Badges';
import RowsPerPageSelector from '../../components/RowsPerPageSelector';
import { ADMIN_CREDENTIALS } from '../../config';
import { useSettings } from '../../features/settings/useSettings';
import { useUser } from '../../features/users/useUser';
import { useFinance } from '../../features/finance/useFinance';
import { UserHistoryModal, AddEditUserModal, DeleteUserModal, NotificationModal, AdjustFundsModal } from './UserManagementModals';
import { useActions } from '../../features/actions/useActions';


const findUserPath = (users: AdminManagedUser[], userId: string, path: AdminManagedUser[] = []): AdminManagedUser[] | null => {
    for (const user of users) {
        if (user.id === userId) {
            return [...path, user];
        }
        if (user.children) {
            const foundPath = findUserPath(user.children, userId, [...path, user]);
            if (foundPath) return foundPath;
        }
    }
    return null;
}

const countTotalUsers = (users: AdminManagedUser[]): number => {
    let count = 0;
    for (const user of users) {
        count++; 
        if (user.children && user.children.length > 0) {
            count += countTotalUsers(user.children); 
        }
    }
    return count;
};


interface UserManagementPageProps {
    action: Action | null;
    onActionConsumed: () => void;
}

const UserManagementPage: React.FC<UserManagementPageProps> = ({ action, onActionConsumed }) => {
    const { addToast } = useToast();
    const { roleState } = useRoles();
    const { settingsState } = useSettings();
    const { userState: { allUsers: users } } = useUser();
    const { financeState: { allTransactions: transactions } } = useFinance();
    const { handleFullAddUser: onAddUser, handleUpdateUser, handleDeleteUser, handleAdjustUserFunds } = useActions();
    
    // Stubs for actions
    const handleBulkDeleteUsers = (ids: string[]) => addToast(`Đã xóa ${ids.length} người dùng`, 'info');
    const handleSendBulkNotifications = (ids: string[], msg: string) => addToast(`Đã gửi thông báo cho ${ids.length} người dùng`, 'success');
    const handleBulkSuspendUsers = (ids: string[]) => addToast(`Đã khóa ${ids.length} người dùng`, 'info');
    const handleBulkActivateUsers = (ids: string[]) => addToast(`Đã kích hoạt ${ids.length} người dùng`, 'success');
    const { tierSettings } = settingsState.systemSettings;
    const { loggedInUser } = useAuth();
    const rolesMap = useMemo(() => new Map(roleState.roles.map(r => [r.id, r.name])), [roleState.roles]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
    const [tierFilter, setTierFilter] = useState<MembershipTier | 'all'>('all');
    const [rankFilter, setRankFilter] = useState<number | 'all'>('all');
    const [minIncome, setMinIncome] = useState<string>('');
    const [maxIncome, setMaxIncome] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    
    const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminManagedUser | null>(null);
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingUser, setDeletingUser] = useState<AdminManagedUser | null>(null);
    
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    
    const [networkViewStack, setNetworkViewStack] = useState<AdminManagedUser[]>([]);
    const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);

    const [historyModalUser, setHistoryModalUser] = useState<AdminManagedUser | null>(null);
    const [adjustingUser, setAdjustingUser] = useState<AdminManagedUser | null>(null);

    const totalUserCount = useMemo(() => countTotalUsers(users), [users]);

    const isTopLevelView = networkViewStack.length === 0;
    const currentNetworkViewUser = isTopLevelView ? null : networkViewStack[networkViewStack.length - 1];

    const handleResetFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setTierFilter('all');
        setRankFilter('all');
        setMinIncome('');
        setMaxIncome('');
    };
    const isAnyFilterActive = useMemo(() => 
        searchTerm !== '' || 
        statusFilter !== 'all' || 
        tierFilter !== 'all' || 
        rankFilter !== 'all' ||
        minIncome !== '' ||
        maxIncome !== '', 
    [searchTerm, statusFilter, tierFilter, rankFilter, minIncome, maxIncome]);

    useEffect(() => {
        if (!isTopLevelView && currentNetworkViewUser) {
            const newPath = findUserPath(users, currentNetworkViewUser.id);
            if (newPath) {
                if (JSON.stringify(newPath) !== JSON.stringify(networkViewStack)) {
                    setNetworkViewStack(newPath);
                }
            } else {
                setNetworkViewStack([]);
            }
        }
      }, [users, networkViewStack, isTopLevelView, currentNetworkViewUser]);

    useEffect(() => {
        if (action) {
            if (action.type === ActionType.VIEW_USER) {
                const userId = action.payload as string;
                const path = findUserPath(users, userId);
                if(path) {
                    setNetworkViewStack(path.slice(0, -1));
                }
            }
            onActionConsumed();
        }
    }, [action, onActionConsumed, users]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage]);


    const sourceUsers = useMemo(() => {
        const baseUsers = isTopLevelView ? users : (currentNetworkViewUser?.children || []);
        
        if (isTopLevelView && loggedInUser) {
            return baseUsers.filter(user => user.id !== loggedInUser.id);
        }

        return baseUsers;
    }, [isTopLevelView, users, currentNetworkViewUser, loggedInUser]);

    const isDeadAccount = (user: AdminManagedUser) => {
        if (!user.lastActiveDate) return false;
        const lastActive = new Date(user.lastActiveDate);
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        return lastActive < oneYearAgo;
    };

    const filteredUsers = useMemo(() => {
        return sourceUsers
            .filter(user => {
                const searchLower = searchTerm.toLowerCase();
                return (
                    user.name.toLowerCase().includes(searchLower) ||
                    user.email.toLowerCase().includes(searchLower) ||
                    user.id.toLowerCase().includes(searchLower)
                );
            })
            .filter(user => {
                if (statusFilter === 'all') return true;
                if (statusFilter === UserStatus.Dead) return isDeadAccount(user);
                // Nếu lọc các status khác, thì không bao gồm tài khoản chết (để lọc riêng)
                if (isDeadAccount(user)) return false; 
                return user.status === statusFilter;
            })
            .filter(user => tierFilter === 'all' || user.membershipTier === tierFilter)
            .filter(user => rankFilter === 'all' || user.rankLevel === Number(rankFilter))
            .filter(user => {
                const min = minIncome ? Number(minIncome.replace(/[^0-9]/g, '')) : -Infinity;
                const max = maxIncome ? Number(maxIncome.replace(/[^0-9]/g, '')) : Infinity;
                return user.totalEarnings >= min && user.totalEarnings <= max;
            })
            .sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime());
    }, [sourceUsers, searchTerm, statusFilter, tierFilter, rankFilter, minIncome, maxIncome]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = useMemo(() => filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    ), [filteredUsers, currentPage, itemsPerPage]);

    const paginatedIds = useMemo(() => paginatedUsers.map(u => u.id), [paginatedUsers]);
    const selectedOnPageCount = useMemo(() => paginatedIds.filter(id => selectedUsers.includes(id)).length, [paginatedIds, selectedUsers]);
    
    const allOnPageSelected = paginatedIds.length > 0 && selectedOnPageCount === paginatedIds.length;
    const someOnPageSelected = selectedOnPageCount > 0 && selectedOnPageCount < paginatedIds.length;

    const handleSelectUser = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const handleSelectAllOnPage = () => {
        const anyOnPageSelected = selectedOnPageCount > 0;
        if (anyOnPageSelected) {
            setSelectedUsers(prev => prev.filter(id => !paginatedIds.includes(id)));
        } else {
            setSelectedUsers(prev => [...new Set([...prev, ...paginatedIds])]);
        }
    };
    
    useEffect(() => {
        setSelectedUsers([]);
        setCurrentPage(1);
    }, [statusFilter, tierFilter, searchTerm, networkViewStack]);

    const handleDrillDown = (user: AdminManagedUser) => {
        setNetworkViewStack(prev => [...prev, user]);
    };

    const handleBreadcrumbClick = (index: number) => {
        setNetworkViewStack(prev => prev.slice(0, index + 1));
    };
    
    const openAddModal = () => {
        setEditingUser(null);
        setIsAddEditModalOpen(true);
    };
    
    const openEditModal = (user: AdminManagedUser) => {
        setEditingUser(user);
        setIsAddEditModalOpen(true);
    };
    
    const openDeleteModal = (user: AdminManagedUser) => {
        setDeletingUser(user);
        setIsDeleteModalOpen(true);
    }

    const handleSaveUser = (userToSave: AdminManagedUser) => {
        if (editingUser) { 
            const result = handleUpdateUser(userToSave);
            if (result.success) {
                setIsAddEditModalOpen(false);
            }
        } else { 
            const newUser = {
                ...userToSave,
                id: `usr_${Date.now()}`,
                joinDate: new Date().toISOString().split('T')[0],
                avatar: `https://picsum.photos/id/${Math.floor(Math.random() * 500)}/100`,
                f1Count: 0, networkSize: 0, totalEarnings: 0, children: [], balance: 0, creditBalance: 0,
                level: (currentNetworkViewUser?.level || -1) + 1,
                phone: '', bankName: '', bankAccountNumber: '', bankAccountName: '',
                totalSupportReceived: 0, missedMaintenanceMonths: 0, accumulatedPenalty: 0
            };
            const result = onAddUser(newUser, currentNetworkViewUser?.id);
            if (result.success) {
                setIsAddEditModalOpen(false);
            } else {
                addToast(result.message || 'Không thể thêm người dùng.', 'error');
            }
        }
    };

    const handleDeleteUserConfirm = () => {
        if (!deletingUser) return;
        handleDeleteUser(deletingUser.id);
        setIsDeleteModalOpen(false);
        setDeletingUser(null);
    };
    
    const handleBulkSuspend = () => {
        handleBulkSuspendUsers(selectedUsers);
        setSelectedUsers([]);
    }

    const handleBulkActivate = () => {
        handleBulkActivateUsers(selectedUsers);
        setSelectedUsers([]);
    }

    const handleConfirmBulkDelete = () => {
        handleBulkDeleteUsers(selectedUsers);
        setSelectedUsers([]);
        setIsBulkDeleteModalOpen(false);
    };
    
    const handleSendNotification = (title: string, message: string) => {
        handleSendBulkNotifications(selectedUsers, `${title}: ${message}`);
        setIsNotificationModalOpen(false);
        setSelectedUsers([]);
    };

    const handleExportUsers = () => {
        if (filteredUsers.length === 0) {
            addToast("Không có dữ liệu người dùng để xuất.", "info");
            return;
        }

        const statusText: Record<UserStatus, string> = {
            [UserStatus.Active]: "Hoạt động",
            [UserStatus.PendingFee]: "Chờ đóng phí",
            [UserStatus.Suspended]: "Bị khóa",
            [UserStatus.Dead]: "Đã dừng",
        };

        const dataToExport = filteredUsers.map(u => ({
            'ID': u.id,
            'Họ và tên': u.name,
            'Email': u.email,
            'Ngày tham gia': u.joinDate,
            'Gói': u.membershipTier === MembershipTier.None ? 'Chưa kích hoạt' : tierSettings[u.membershipTier as keyof typeof tierSettings].name,
            'Trạng thái': statusText[u.status],
            'Số F1': u.f1Count,
            'Mạng lưới': u.networkSize,
            'Tổng thu nhập': u.totalEarnings,
            'Số dư': u.balance,
        }));
        exportToCsv(`danh_sach_nguoi_dung_${new Date().toISOString().split('T')[0]}.csv`, dataToExport);
        addToast("Đã bắt đầu tải xuống tệp người dùng!", "success");
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                Quản lý Người dùng
                <span className="ml-2 text-base font-medium text-slate-500 dark:text-slate-400">
                    (Tổng: {totalUserCount.toLocaleString('vi-VN')})
                </span>
            </h2>

            {historyModalUser && (
                <UserHistoryModal 
                    isOpen={!!historyModalUser} 
                    onClose={() => setHistoryModalUser(null)} 
                    user={historyModalUser}
                    transactions={transactions.filter(t => t.userId === historyModalUser.id)} 
                />
            )}
            
            {adjustingUser && (
                <AdjustFundsModal 
                    isOpen={!!adjustingUser} 
                    onClose={() => setAdjustingUser(null)} 
                    user={adjustingUser}
                    onConfirm={(bal, cred, reason) => handleAdjustUserFunds(adjustingUser.id, bal, cred, reason)}
                />
            )}
            
            {isAddEditModalOpen && <AddEditUserModal isOpen={isAddEditModalOpen} onClose={() => setIsAddEditModalOpen(false)} onSave={handleSaveUser} user={editingUser} />}
            {isDeleteModalOpen && deletingUser && <DeleteUserModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={handleDeleteUserConfirm} userName={deletingUser.name} />}
            {isNotificationModalOpen && <NotificationModal isOpen={isNotificationModalOpen} onClose={() => setIsNotificationModalOpen(false)} onSend={handleSendNotification} recipientCount={selectedUsers.length} />}
            
            <Modal
                isOpen={isBulkDeleteModalOpen}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                title={`Xóa ${selectedUsers.length} người dùng?`}
                confirmText="Xác nhận Xóa"
                onConfirm={handleConfirmBulkDelete}
                confirmButtonVariant="danger"
            >
                <p>Bạn có chắc muốn xóa vĩnh viễn {selectedUsers.length} người dùng đã chọn? Hành động này không thể hoàn tác.</p>
            </Modal>
            
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                {!isTopLevelView && (
                    <nav className="flex items-center text-sm font-medium text-slate-500 dark:text-slate-400 mb-4" aria-label="Breadcrumb">
                        <button onClick={() => setNetworkViewStack([])} className="hover:text-indigo-600 dark:hover:text-indigo-400">Gốc</button>
                        {networkViewStack.map((u, index) => (
                            <React.Fragment key={u.id}>
                                <ChevronRightIcon className="h-5 w-5 mx-1 flex-shrink-0" />
                                <button
                                    onClick={() => handleBreadcrumbClick(index)}
                                    className={`truncate max-w-[150px] transition-colors ${index === networkViewStack.length - 1 ? 'text-slate-800 dark:text-slate-200 font-semibold cursor-default' : 'hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                                >
                                    {u.name}
                                </button>
                            </React.Fragment>
                        ))}
                    </nav>
                )}

                <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                    <div className="flex flex-wrap items-center gap-4 flex-grow">
                        <div className="relative flex-grow min-w-[250px] sm:min-w-[300px]">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MagnifyingGlassIcon className="h-5 w-5 text-gray-400" /></div>
                            <input type="text" placeholder="Tìm theo tên, email, ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 dark:text-white" />
                            {searchTerm && <button type="button" onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>}
                        </div>
                         <select value={tierFilter} onChange={e => setTierFilter(e.target.value as MembershipTier | 'all')} className="w-full sm:w-auto px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 dark:text-white sm:text-sm">
                            <option value="all">Tất cả Gói</option>
                            <option value={MembershipTier.None}>Chưa kích hoạt</option>
                            <option value={MembershipTier.Starter}>{tierSettings.starter.name}</option>
                            <option value={MembershipTier.Pro}>{tierSettings.pro.name}</option>
                            <option value={MembershipTier.Master}>{tierSettings.master.name}</option>
                        </select>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as UserStatus | 'all')} className="w-full sm:w-auto px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 dark:text-white sm:text-sm">
                            <option value="all">Tất cả trạng thái</option>
                            <option value={UserStatus.Active}>Hoạt động</option>
                            <option value={UserStatus.PendingFee}>Chờ đóng phí</option>
                            <option value={UserStatus.Dead}>Tài khoản chết (1 năm)</option>
                            <option value={UserStatus.Suspended}>Bị khóa</option>
                        </select>
                        <select value={rankFilter} onChange={e => setRankFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="w-full sm:w-auto px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 dark:text-white sm:text-sm">
                            <option value="all">Tất cả Cấp bậc</option>
                            {Array.from({ length: 10 }, (_, i) => (
                                <option key={i} value={i}>Cấp {i}</option>
                            ))}
                        </select>
                        <div className="flex items-center gap-2">
                             <input 
                                type="text" 
                                placeholder="Thu nhập từ..." 
                                value={minIncome} 
                                onChange={e => setMinIncome(e.target.value)} 
                                className="w-full sm:w-32 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 dark:text-white text-sm" 
                            />
                             <span className="text-slate-400">-</span>
                             <input 
                                type="text" 
                                placeholder="..." 
                                value={maxIncome} 
                                onChange={e => setMaxIncome(e.target.value)} 
                                className="w-full sm:w-32 px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 dark:text-white text-sm" 
                            />
                        </div>
                        {isAnyFilterActive && <button onClick={handleResetFilters} className="p-2 text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600"><ArrowPathIcon className="h-5 w-5" /></button>}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={openAddModal} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">
                            <PlusIcon className="h-5 w-5" /> Thêm người dùng
                        </button>
                         <button onClick={handleExportUsers} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/50 rounded-lg hover:bg-green-200 dark:hover:bg-green-900">
                            <DocumentArrowDownIcon className="h-5 w-5" /> Xuất Excel
                        </button>
                    </div>
                </div>

                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50">
                            <tr>
                                <th scope="col" className="p-4">
                                    <input 
                                        type="checkbox" 
                                        checked={allOnPageSelected}
                                        ref={el => { if(el) el.indeterminate = someOnPageSelected; }}
                                        onChange={handleSelectAllOnPage}
                                        className="rounded border-gray-200 dark:bg-slate-900 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </th>
                                <th scope="col" className="px-6 py-3 text-left">Thành viên</th><th scope="col" className="px-6 py-3 text-left">Trạng thái</th><th scope="col" className="px-6 py-3 text-left">Gói</th><th scope="col" className="px-6 py-3 text-left">Cấp bậc</th><th scope="col" className="px-6 py-3 text-left">Mạng lưới</th><th scope="col" className="px-6 py-3 text-left">Thu nhập</th><th scope="col" className="px-6 py-3 text-left">Vai trò</th><th scope="col" className="px-6 py-3 text-left">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedUsers.length > 0 && (
                                <tr className="bg-indigo-50 dark:bg-indigo-900/20">
                                    <td colSpan={9} className="px-4 py-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-200">{selectedUsers.length} người dùng được chọn</span>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setIsNotificationModalOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 dark:bg-blue-900/50 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900"><EnvelopeIcon className="h-4 w-4"/>Gửi T.báo</button>
                                                <button onClick={handleBulkActivate} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900/50 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900"><LockOpenIcon className="h-4 w-4"/>Mở khóa</button>
                                                <button onClick={handleBulkSuspend} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-yellow-700 bg-yellow-100 dark:bg-yellow-900/50 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-900"><NoSymbolIcon className="h-4 w-4"/>Khóa</button>
                                                <button onClick={() => setIsBulkDeleteModalOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-100 dark:bg-red-900/50 rounded-full hover:bg-red-200 dark:hover:bg-red-900"><TrashIcon className="h-4 w-4"/>Xóa</button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {paginatedUsers.map(user => {
                                const isSuperAdminRow = user.email === ADMIN_CREDENTIALS.email;
                                const isSelf = loggedInUser?.id === user.id;
                                const isSubAdminEditingSuperAdmin = loggedInUser?.email !== ADMIN_CREDENTIALS.email && isSuperAdminRow;

                                const canEdit = !isSubAdminEditingSuperAdmin;
                                const editTitle = canEdit ? "Chỉnh sửa người dùng" : "Không có quyền chỉnh sửa";
                                
                                const canDelete = !isSuperAdminRow && !isSelf && user.f1Count === 0;
                                const deleteTitle = isSuperAdminRow ? "Không thể xóa Super Admin" : isSelf ? "Không thể tự xóa tài khoản" : user.f1Count > 0 ? "Không thể xóa người dùng có F1" : "Xóa người dùng";


                                return (
                                <tr key={user.id} className="border-b border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                                    <td className="w-4 p-4"><input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={() => handleSelectUser(user.id)} className="rounded border-gray-200 dark:bg-slate-900 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"/></td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <img className="w-10 h-10 rounded-full" src={user.avatar} alt={user.name} />
                                            <div className="pl-3">
                                                <button onClick={() => handleDrillDown(user)} className="font-semibold text-left text-indigo-600 dark:text-indigo-400 hover:underline">
                                                    {user.name}
                                                </button>
                                                <div className="font-normal text-slate-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <UserStatusBadge 
                                            status={user.status} 
                                            missedMonths={user.missedMaintenanceMonths} 
                                            previousStatus={user.previousStatus}
                                        />
                                    </td>
                                    <td className="px-6 py-4"><TierBadge tier={user.membershipTier} /></td>
                                    <td className="px-6 py-4"><RankLevelBadge level={user.rankLevel} /></td>
                                    <td className="px-6 py-4">{user.f1Count} F1 / {user.networkSize} TV</td>
                                    <td className="px-6 py-4 font-semibold text-green-500">{user.totalEarnings.toLocaleString('vi-VN')}đ</td>
                                    <td className="px-6 py-4">
                                        {user.roleId ? (
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300">
                                                <ShieldCheckIcon className="h-3 w-3" />
                                                {rolesMap.get(user.roleId) || 'Admin'}
                                            </span>
                                        ) : 'Thành viên'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => openEditModal(user)} disabled={!canEdit} title={editTitle} className="p-1.5 rounded-full transition-colors text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-900/50 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                                                <PencilSquareIcon className="h-5 w-5"/>
                                            </button>
                                            <button onClick={() => setAdjustingUser(user)} title="Điều chỉnh quỹ (Nạp/Trừ tiền)" className="p-1.5 rounded-full transition-colors text-emerald-500 hover:text-emerald-700 hover:bg-emerald-100 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-indigo-900/50">
                                                <CurrencyDollarIcon className="h-5 w-5"/>
                                            </button>
                                            <button onClick={() => setHistoryModalUser(user)} title="Xem lịch sử giao dịch" className="p-1.5 rounded-full transition-colors text-sky-500 hover:text-sky-700 hover:bg-sky-100 dark:text-sky-400 dark:hover:text-sky-300 dark:hover:bg-sky-900/50">
                                                <DocumentMagnifyingGlassIcon className="h-5 w-5"/>
                                            </button>
                                            <button onClick={() => openDeleteModal(user)} disabled={!canDelete} title={deleteTitle} className="p-1.5 rounded-full transition-colors text-red-500 hover:text-red-700 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/50 disabled:text-slate-300 dark:disabled:text-slate-600 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                                                <TrashIcon className="h-5 w-5"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                     {filteredUsers.length === 0 && <p className="text-center py-16 text-slate-500">Không có người dùng nào khớp bộ lọc.</p>}
                </div>
                 <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                    <div className="flex items-center gap-4">
                         <RowsPerPageSelector value={itemsPerPage} onChange={setItemsPerPage} />
                         <div className="text-sm text-slate-600 dark:text-slate-400">Hiển thị {filteredUsers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} đến {Math.min(currentPage * itemsPerPage, filteredUsers.length)} trên {filteredUsers.length} người dùng</div>
                    </div>
                    {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
                </div>
            </div>
        </div>
    );
};

export default UserManagementPage;
