
import React, { useState, useMemo, useEffect } from 'react';
import { AdminManagedUser, UserStatus, MembershipTier } from '../../features/users/types';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { MagnifyingGlassIcon, XCircleIcon, CheckIcon, ClipboardDocumentIcon, ChevronRightIcon, EyeIcon, UserGroupIcon, UserCircleIcon, DevicePhoneMobileIcon, EnvelopeIcon, ArrowPathIcon } from '../../components/Icons';
import { TierBadge, UserStatusBadge, RankLevelBadge } from '../../components/Badges';
import RowsPerPageSelector from '../../components/RowsPerPageSelector';
import { findParent } from '../../services/userService';
import { useAuth } from '../../features/auth/useAuth';
import { useUser } from '../../features/users/useUser';

const MyNetworkPage: React.FC = () => {
    const { loggedInUser: user } = useAuth();
    const { userState: { allUsers } } = useUser();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
    const [tierFilter, setTierFilter] = useState<MembershipTier | 'all'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [viewingUser, setViewingUser] = useState<AdminManagedUser | null>(null);
    const [copyStatus, setCopyStatus] = useState<Record<string, boolean>>({});
    
    const [networkViewStack, setNetworkViewStack] = useState<AdminManagedUser[]>([]);
    
    const handleResetFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setTierFilter('all');
    };
    const isFilterActive = searchTerm !== '' || statusFilter !== 'all' || tierFilter !== 'all';

    const parentUser = useMemo(() => user ? findParent(allUsers, user.id) : null, [allUsers, user]);

    const isTopLevelView = networkViewStack.length === 0;
    const currentNetworkViewUser = isTopLevelView ? user : networkViewStack[networkViewStack.length - 1];

    const handleCopy = (text: string, id: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopyStatus(prev => ({ ...prev, [id]: true }));
        setTimeout(() => setCopyStatus(prev => ({ ...prev, [id]: false })), 2000);
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, tierFilter, searchTerm, networkViewStack, itemsPerPage]);

    const sourceUsers = useMemo(() => {
        return currentNetworkViewUser?.children || [];
    }, [currentNetworkViewUser]);

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
            .filter(user => statusFilter === 'all' || user.status === statusFilter)
            .filter(user => tierFilter === 'all' || user.membershipTier === tierFilter)
            .sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime());
    }, [sourceUsers, searchTerm, statusFilter, tierFilter]);

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const paginatedUsers = useMemo(() => filteredUsers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    ), [filteredUsers, currentPage, itemsPerPage]);
    
    const handleDrillDown = (userToDrill: AdminManagedUser) => {
        if (userToDrill.children && userToDrill.children.length > 0) {
            setNetworkViewStack(prev => [...prev, userToDrill]);
        }
    };

    const handleBreadcrumbClick = (index: number) => {
        setNetworkViewStack(prev => prev.slice(0, index + 1));
    };

    if (!user) {
        return null;
    }

    return (
        <div className="space-y-6">
            {viewingUser && (
                <Modal isOpen={!!viewingUser} onClose={() => setViewingUser(null)} title="Thông tin Thành viên" hideFooter>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <img src={viewingUser.avatar} alt={viewingUser.name} className="h-20 w-20 rounded-full" />
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{viewingUser.name}</h3>
                                <p className="text-sm text-slate-500 font-mono">{viewingUser.id}</p>
                            </div>
                        </div>
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                            <dl className="space-y-3">
                                <div className="flex justify-between items-center"><dt className="font-medium text-slate-500">Email</dt>
                                    <dd className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <span>{viewingUser.email}</span>
                                        <button onClick={() => handleCopy(viewingUser.email, 'email_view')} className="text-slate-400 hover:text-slate-600 p-1">
                                            {copyStatus['email_view'] ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                                        </button>
                                    </dd>
                                </div>
                                <div className="flex justify-between items-center"><dt className="font-medium text-slate-500">Số điện thoại</dt>
                                    <dd className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <span>{viewingUser.phone || 'Chưa có'}</span>
                                        <button onClick={() => handleCopy(viewingUser.phone, 'phone_view')} disabled={!viewingUser.phone} className="text-slate-400 hover:text-slate-600 p-1 disabled:opacity-50 disabled:cursor-not-allowed">
                                             {copyStatus['phone_view'] ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                                        </button>
                                    </dd>
                                </div>
                                <div className="flex justify-between items-center"><dt className="font-medium text-slate-500">Ngày tham gia</dt><dd className="text-slate-700 dark:text-slate-300">{viewingUser.joinDate}</dd></div>
                                <div className="flex justify-between items-center"><dt className="font-medium text-slate-500">Gói</dt><dd className="text-slate-700 dark:text-slate-300"><TierBadge tier={viewingUser.membershipTier} /></dd></div>
                                <div className="flex justify-between items-center"><dt className="font-medium text-slate-500">Trạng thái</dt><dd className="text-slate-700 dark:text-slate-300"><UserStatusBadge status={viewingUser.status} previousStatus={viewingUser.previousStatus} /></dd></div>
                            </dl>
                        </div>
                    </div>
                </Modal>
            )}

            {parentUser && isTopLevelView && (
                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                        <UserCircleIcon className="h-5 w-5 text-indigo-500" />
                        Tuyến trên của bạn
                    </h3>
                    <div className="flex items-center gap-4">
                        <img src={parentUser.avatar} alt={parentUser.name} className="h-16 w-16 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <p className="font-bold text-xl text-slate-900 dark:text-white">{parentUser.name}</p>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 text-sm text-slate-600 dark:text-slate-400">
                                <div className="flex items-center gap-2">
                                    <EnvelopeIcon className="h-4 w-4" />
                                    <span>{parentUser.email}</span>
                                    <button onClick={() => handleCopy(parentUser.email, 'parent_email')} className="text-slate-400 hover:text-slate-600 p-1">
                                        {copyStatus['parent_email'] ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                                    </button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <DevicePhoneMobileIcon className="h-4 w-4" />
                                    <span>{parentUser.phone || 'Chưa có SĐT'}</span>
                                    <button onClick={() => handleCopy(parentUser.phone, 'parent_phone')} disabled={!parentUser.phone} className="text-slate-400 hover:text-slate-600 p-1 disabled:opacity-50">
                                        {copyStatus['parent_phone'] ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                {isTopLevelView ? 'Mạng Lưới Của Tôi' : `Mạng lưới của ${currentNetworkViewUser?.name}`}
            </h2>

            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                {!isTopLevelView && (
                    <nav className="flex items-center text-sm font-medium text-slate-500 dark:text-slate-400 mb-4" aria-label="Breadcrumb">
                        <button onClick={() => setNetworkViewStack([])} className="hover:text-indigo-600 dark:hover:text-indigo-400">F1 của tôi</button>
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


                <div className="flex flex-col md:flex-row items-center gap-4 mb-4">
                    <div className="relative w-full md:w-2/5">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MagnifyingGlassIcon className="h-5 w-5 text-gray-400" /></div>
                        <input type="text" placeholder="Tìm theo tên, email, ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 dark:text-white" />
                        {searchTerm && <button type="button" onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"><XCircleIcon className="h-5 w-5" /></button>}
                    </div>
                     <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value as MembershipTier | 'all')} className="w-full md:w-auto px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 dark:text-white sm:text-sm">
                        <option value="all">Tất cả Gói</option>
                        <option value={MembershipTier.Starter}>Starter</option>
                        <option value={MembershipTier.Pro}>Pro</option>
                        <option value={MembershipTier.Master}>Master</option>
                    </select>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as UserStatus | 'all')} className="w-full md:w-auto px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 dark:text-white sm:text-sm">
                        <option value="all">Tất cả trạng thái</option>
                        <option value={UserStatus.Active}>Hoạt động</option>
                        <option value={UserStatus.PendingFee}>Chờ đóng phí</option>
                        <option value={UserStatus.Suspended}>Bị khóa</option>
                    </select>
                    {isFilterActive && <button onClick={handleResetFilters} className="p-2 text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600"><ArrowPathIcon className="h-5 w-5" /></button>}
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50/50 dark:bg-slate-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left">Thành viên</th>
                                <th scope="col" className="px-6 py-3 text-left">Tầng</th>
                                <th scope="col" className="px-6 py-3 text-left">Trạng thái</th>
                                <th scope="col" className="px-6 py-3 text-left">Gói</th>
                                <th scope="col" className="px-6 py-3 text-left">Cấp bậc</th>
                                <th scope="col" className="px-6 py-3 text-left">Ngày tham gia</th>
                                <th scope="col" className="px-6 py-3 text-left">F1 / Mạng lưới</th>
                                <th scope="col" className="px-6 py-3 text-left">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedUsers.length > 0 ? (
                                paginatedUsers.map(u => {
                                    const isDrillable = u.children && u.children.length > 0;
                                    return (
                                    <tr key={u.id} className="border-b border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                                        <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                                            <div className="flex items-center">
                                                <img className="w-10 h-10 rounded-full" src={u.avatar} alt={u.name} />
                                                <div className="pl-3">
                                                    <button
                                                        onClick={() => isDrillable && handleDrillDown(u)}
                                                        className={`font-semibold text-left ${isDrillable ? 'text-indigo-600 dark:text-indigo-400 hover:underline' : 'text-slate-900 dark:text-white cursor-text'}`}
                                                        disabled={!isDrillable}
                                                    >
                                                        {u.name}
                                                    </button>
                                                    <div className="font-normal text-slate-500">{u.email}</div>
                                                </div>
                                            </div>
                                        </th>
                                        <td className="px-6 py-4 font-bold text-lg text-slate-700 dark:text-slate-300">F{u.level}</td>
                                        <td className="px-6 py-4"><UserStatusBadge status={u.status} previousStatus={u.previousStatus} /></td>
                                        <td className="px-6 py-4"><TierBadge tier={u.membershipTier} /></td>
                                        <td className="px-6 py-4"><RankLevelBadge level={u.rankLevel} /></td>
                                        <td className="px-6 py-4">{u.joinDate}</td>
                                        <td className="px-6 py-4">{u.f1Count} / {u.networkSize}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                 <button onClick={() => setViewingUser(u)} className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" title="Xem chi tiết"><EyeIcon className="h-5 w-5"/></button>
                                                {isDrillable && (
                                                    <button onClick={() => handleDrillDown(u)} className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" title="Xem mạng lưới con">
                                                        <ChevronRightIcon className="h-5 w-5"/>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )})
                            ) : (
                                <tr>
                                    <td colSpan={8} className="text-center py-16 text-slate-500">
                                        <UserGroupIcon className="h-12 w-12 mx-auto text-slate-400 mb-2" />
                                        <p className="font-semibold">
                                            {isTopLevelView ? 'Bạn chưa có thành viên F1 nào.' : `${currentNetworkViewUser?.name} chưa có thành viên F1.`}
                                        </p>
                                        <p className="text-sm mt-1">
                                            {isTopLevelView ? 'Hãy sử dụng công cụ tuyển dụng để chia sẻ link giới thiệu!' : 'Không có dữ liệu để hiển thị.'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                    <div className="flex items-center gap-4">
                        <RowsPerPageSelector value={itemsPerPage} onChange={setItemsPerPage} />
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                            Hiển thị {filteredUsers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} đến {Math.min(currentPage * itemsPerPage, filteredUsers.length)} trên {filteredUsers.length} thành viên
                        </div>
                    </div>
                    {totalPages > 1 && (
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyNetworkPage;
