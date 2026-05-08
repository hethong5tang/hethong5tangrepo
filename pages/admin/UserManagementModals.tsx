
import React, { useState, useMemo, useEffect } from 'react';
import { AdminManagedUser, UserStatus, MembershipTier } from '../../features/users/types';
import { Transaction, TransactionStatus } from '../../features/finance/types';
import { Permission } from '../../features/roles/types';
import { MagnifyingGlassIcon, PencilSquareIcon, PlusIcon, TrashIcon, NoSymbolIcon, ChevronRightIcon, EnvelopeIcon, ArrowPathIcon, CrownIcon, CurrencyDollarIcon, XCircleIcon, BanknotesIcon, EyeIcon, EyeSlashIcon, DocumentMagnifyingGlassIcon, UsersIcon, ArrowUpCircleIcon, ArrowDownCircleIcon, DocumentArrowDownIcon, ShieldCheckIcon, UserGroupIcon, SparklesIcon, InformationCircleIcon } from '../../components/Icons';
import Pagination from '../../components/Pagination';
import Modal from '../../components/Modal';
import { useRoles } from '../../features/roles/useRoles';
import { useSettings } from '../../features/settings/useSettings';
import { useAuth } from '../../features/auth/useAuth';
import { TransactionStatusBadge } from '../../components/Badges';
import FormattedNumberInput from '../../components/FormattedNumberInput';

const TRANSACTIONS_PER_PAGE_MODAL = 5;

type FormErrors = {
    name?: string;
    email?: string;
    password?: string;
}

export const UserHistoryModal: React.FC<{ isOpen: boolean; onClose: () => void; user: AdminManagedUser; transactions: Transaction[] }> = ({ isOpen, onClose, user, transactions }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(transactions.length / TRANSACTIONS_PER_PAGE_MODAL);
    const paginatedTransactions = transactions.slice(
        (currentPage - 1) * TRANSACTIONS_PER_PAGE_MODAL,
        currentPage * TRANSACTIONS_PER_PAGE_MODAL
    );

    useEffect(() => {
        if(isOpen) setCurrentPage(1);
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Lịch sử Giao dịch ${user.name}`} hideFooter size="5xl">
            <div className="max-h-[60vh] flex flex-col">
                <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                    <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                        {paginatedTransactions.length > 0 ? paginatedTransactions.map(tx => (
                            <li key={tx.id} className="py-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${tx.amount >= 0 ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-300' : 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-300'}`}>
                                        {(tx.amount >= 0 && (tx.creditAmount || 0) >= 0) ? <ArrowUpCircleIcon className="h-6 w-6"/> : <ArrowDownCircleIcon className="h-6 w-6"/>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{tx.description}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{tx.date}</p>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="flex flex-col items-end">
                                        {tx.amount !== 0 && (
                                            <p className={`font-bold text-sm ${tx.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString('vi-VN')}đ
                                            </p>
                                        )}
                                        {tx.creditAmount !== undefined && tx.creditAmount !== 0 && (
                                            <p className={`font-black text-xs flex items-center gap-1 ${tx.creditAmount >= 0 ? 'text-indigo-500' : 'text-amber-500'}`}>
                                                <SparklesIcon className="h-3 w-3" />
                                                {tx.creditAmount >= 0 ? '+' : ''}{tx.creditAmount.toLocaleString('vi-VN')} P
                                            </p>
                                        )}
                                    </div>
                                    <div className="mt-1"><TransactionStatusBadge status={tx.status} /></div>
                                </div>
                            </li>
                        )) : (
                            <div className="text-center py-12 text-slate-500">
                                <DocumentMagnifyingGlassIcon className="h-12 w-12 mx-auto text-slate-400 mb-2" />
                                <p>Không có giao dịch nào.</p>
                            </div>
                        )}
                    </ul>
                </div>
                 {totalPages > 1 && (
                    <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                )}
            </div>
        </Modal>
    );
}

const InputField: React.FC<{
    label: string;
    name: keyof AdminManagedUser;
    type?: string;
    value: string;
    error?: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClear: (name: keyof AdminManagedUser) => void;
}> = ({ label, name, type = 'text', value, error, onChange, onClear }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <div className="relative mt-1">
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                className={`block w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 dark:text-white pr-8 ${error ? 'border-red-500' : 'border-gray-200 dark:border-slate-600'}`}
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onClear(name)}
                    className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600"
                >
                    <XCircleIcon className="h-5 w-5" />
                </button>
            )}
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
);

export const AddEditUserModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (user: AdminManagedUser) => void; user: AdminManagedUser | null; }> = ({ isOpen, onClose, onSave, user }) => {
    const { roleState } = useRoles();
    const { settingsState } = useSettings();
    const { tierSettings } = settingsState.systemSettings;
    const { hasPermission } = useAuth();
    const canManageRoles = hasPermission(Permission.USER_MANAGE_ROLES);
    const [formData, setFormData] = useState<Partial<AdminManagedUser>>({});
    const [errors, setErrors] = useState<FormErrors>({});
    const [showPassword, setShowPassword] = useState(false);
    const [originalTier, setOriginalTier] = useState<MembershipTier | null>(null);
    
    useEffect(() => {
        if (isOpen) {
            const initialData = user ? { ...user } : { name: '', email: '', status: UserStatus.Active, password: '', membershipTier: MembershipTier.Starter, roleId: '' };
            setFormData(initialData);
            setOriginalTier(user ? user.membershipTier : MembershipTier.Starter);
            setErrors({});
        }
    }, [user, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        
        setFormData(prev => {
            const newState = { ...prev, [name]: value };

            if (name === 'roleId') {
                if (value) {
                    newState.membershipTier = MembershipTier.None;
                } else {
                    newState.membershipTier = originalTier || MembershipTier.Starter;
                }
            }
            return newState;
        });

        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleClear = (name: keyof AdminManagedUser) => {
        setFormData(prev => ({ ...prev, [name]: '' }));
    };

    const validate = () => {
        const newErrors: FormErrors = {};
        if (!formData.name?.trim()) newErrors.name = "Họ và tên là bắt buộc.";
        if (!formData.email?.trim()) {
            newErrors.email = "Email là bắt buộc.";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Địa chỉ email không hợp lệ.";
        }
        if (!user && !formData.password?.trim()) { // Only for new users
             newErrors.password = "Mật khẩu là bắt buộc.";
        } else if (!user && formData.password && formData.password.length < 6) {
             newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự.";
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }
    
    const handleConfirm = () => {
        if (validate()) {
            const dataToSave = { ...formData };
            if (dataToSave.roleId === '') {
                delete dataToSave.roleId;
            } else {
                dataToSave.membershipTier = MembershipTier.None;
            }
            onSave(dataToSave as AdminManagedUser);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={user ? `Chỉnh sửa: ${user.name}` : 'Thêm người dùng mới'}
            confirmText="Lưu thay đổi"
            onConfirm={handleConfirm}
        >
            <div className="space-y-4">
                 <InputField
                    label="Họ và tên"
                    name="name"
                    value={formData.name || ''}
                    error={errors.name}
                    onChange={handleChange}
                    onClear={handleClear}
                 />
                 <InputField
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email || ''}
                    error={errors.email}
                    onChange={handleChange}
                    onClear={handleClear}
                 />
                 {!user && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Mật khẩu</label>
                        <div className="relative mt-1">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password || ''}
                                onChange={handleChange}
                                className={`block w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 dark:text-white ${errors.password ? 'border-red-500' : 'border-gray-200 dark:border-slate-600'}`}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-500">
                                {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                            </button>
                        </div>
                        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                    </div>
                 )}
                 {(!formData.roleId) && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Gói Thành viên</label>
                        <select name="membershipTier" value={formData.membershipTier} onChange={handleChange} disabled={!!user} className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed">
                            <option value={MembershipTier.Starter}>{tierSettings.starter.name}</option>
                            <option value={MembershipTier.Pro}>{tierSettings.pro.name}</option>
                            <option value={MembershipTier.Master}>{tierSettings.master.name}</option>
                        </select>
                         {!!user && <p className="text-xs text-slate-500 mt-1">Gói thành viên chỉ có thể được nâng cấp bởi người dùng.</p>}
                    </div>
                 )}
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Trạng thái</label>
                    <select name="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                        <option value={UserStatus.Active}>Hoạt động</option>
                        <option value={UserStatus.PendingFee}>Chờ đóng phí</option>
                        <option value={UserStatus.Dead}>Tài khoản chết (1 năm)</option>
                        <option value={UserStatus.Suspended}>Bị khóa</option>
                    </select>
                </div>
                 {canManageRoles && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Vai trò</label>
                        <select name="roleId" value={formData.roleId || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                            <option value="">Thành viên thường</option>
                            {roleState.roles.map(role => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                        </select>
                    </div>
                 )}
            </div>
        </Modal>
    );
};

export const DeleteUserModal: React.FC<{isOpen: boolean, onClose: () => void, onConfirm: () => void, userName: string}> = ({ isOpen, onClose, onConfirm, userName }) => (
     <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Xác nhận xóa người dùng"
        confirmText="Xác nhận xóa"
        onConfirm={onConfirm}
        confirmButtonVariant="danger"
    >
        <p className="text-sm text-slate-500 dark:text-slate-400">
            Bạn có chắc chắn muốn xóa người dùng <span className="font-bold text-slate-800 dark:text-slate-200">{userName}</span>? Hành động này không thể được hoàn tác.
        </p>
    </Modal>
)

export const NotificationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSend: (title: string, message: string) => void;
    recipientCount: number;
}> = ({ isOpen, onClose, onSend, recipientCount }) => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleConfirm = async () => {
        if (!title || !message) return;
        setIsSending(true);
        await new Promise(res => setTimeout(res, 1000)); // Simulate API call
        onSend(title, message);
        setIsSending(false);
        setTitle('');
        setMessage('');
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Gửi thông báo tới ${recipientCount} người dùng`}
            confirmText={isSending ? 'Đang gửi...' : 'Gửi ngay'}
            onConfirm={handleConfirm}
            isConfirmDisabled={isSending || !title || !message}
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Tiêu đề</label>
                    <div className="relative mt-1">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white pr-8"
                            placeholder="Ví dụ: Cập nhật hệ thống"
                        />
                        {title && (
                            <button
                                type="button"
                                onClick={() => setTitle('')}
                                className="absolute inset-y-0 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600"
                            >
                                <XCircleIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nội dung</label>
                    <div className="relative mt-1">
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                            className="block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white pr-8"
                            placeholder="Nội dung thông báo..."
                        />
                        {message && (
                            <button
                                type="button"
                                onClick={() => setMessage('')}
                                className="absolute top-2 right-0 flex items-center pr-2 text-slate-400 hover:text-slate-600"
                            >
                                <XCircleIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

// --- NEW MODAL: ADJUST FUNDS ---
export const AdjustFundsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (balance: number, credits: number, reason: string) => void;
    user: AdminManagedUser;
}> = ({ isOpen, onClose, onConfirm, user }) => {
    const [balanceDelta, setBalanceDelta] = useState(0);
    const [creditDelta, setCreditDelta] = useState(0);
    const [reason, setReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleConfirm = async () => {
        if (!reason.trim()) {
            return;
        }
        setIsProcessing(true);
        await new Promise(r => setTimeout(r, 500));
        onConfirm(balanceDelta, creditDelta, reason);
        setIsProcessing(false);
        onClose();
    };

    useEffect(() => {
        if (isOpen) {
            setBalanceDelta(0);
            setCreditDelta(0);
            setReason('');
        }
    }, [isOpen]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Điều chỉnh tài khoản: ${user.name}`}
            confirmText={isProcessing ? 'Đang xử lý...' : 'Xác nhận thay đổi'}
            onConfirm={handleConfirm}
            isConfirmDisabled={isProcessing || !reason.trim() || (balanceDelta === 0 && creditDelta === 0)}
        >
            <div className="space-y-5">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Số dư hiện tại</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{user.balance.toLocaleString()}đ</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Credit hiện tại</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{user.creditBalance.toLocaleString()}P</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Thay đổi Số dư (VNĐ)</label>
                        <p className="text-[10px] text-slate-500 mb-1 italic">Nhập số âm để trừ tiền</p>
                        <div className="relative mt-1">
                            <FormattedNumberInput 
                                value={balanceDelta} 
                                onChange={setBalanceDelta}
                                className="block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Thay đổi Credit (P)</label>
                        <p className="text-[10px] text-slate-500 mb-1 italic">Nhập số âm để trừ credit</p>
                        <div className="relative mt-1">
                            <FormattedNumberInput 
                                value={creditDelta} 
                                onChange={setCreditDelta}
                                className="block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Lý do điều chỉnh (Bắt buộc)</label>
                    <textarea 
                        value={reason} 
                        onChange={e => setReason(e.target.value)}
                        rows={2}
                        placeholder="Nạp thưởng sự kiện, Hoàn trả phí, Xử lý sai sót..."
                        className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                </div>

                <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${balanceDelta >= 0 && creditDelta >= 0 ? 'bg-blue-50 text-blue-800' : 'bg-orange-50 text-orange-800'}`}>
                    <InformationCircleIcon className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Sau khi xác nhận, người dùng sẽ nhận được thông báo về biến động tài khoản. Các giao dịch này sẽ được ghi nhận vào lịch sử của người dùng.</span>
                </div>
            </div>
        </Modal>
    );
};
