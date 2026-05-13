
import React, { useState, useMemo } from 'react';
import { AdminManagedUser, UserStatus, MembershipTier } from '../../features/users/types';
import { CheckCircleFillIcon, InformationCircleIcon, ExclamationTriangleIcon, BanknotesIcon, ShieldCheckIcon, CheckIcon, ArrowLeftIcon, ClockIcon } from '../../components/Icons';
import FormattedNumberInput from '../../components/FormattedNumberInput';
import { useAuth } from '../../features/auth/useAuth';
import { useSettings } from '../../features/settings/useSettings';
import { SystemSettings } from '../../features/settings/types';
import { useActions } from '../../features/actions/useActions';
import { useFinance } from '../../features/finance/useFinance';

interface WithdrawPageProps {
    onNavigate: (page: string) => void;
}

const Stepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const steps = [
        { id: 1, name: 'Số tiền', icon: BanknotesIcon },
        { id: 2, name: 'Xác nhận', icon: ShieldCheckIcon },
        { id: 3, name: 'Hoàn thành', icon: CheckCircleFillIcon },
    ];
     return (
        <nav aria-label="Progress">
            <ol role="list" className="flex items-center">
                {steps.map((step, stepIdx) => (
                    <li key={step.name} className="relative flex-1">
                         <div className="flex flex-col items-center gap-2 text-center">
                            {step.id < currentStep ? (
                                <>
                                    {stepIdx > 0 && <div className="absolute left-0 top-4 -translate-x-1/2 w-full h-0.5 bg-indigo-600" />}
                                    <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600">
                                        <CheckIcon className="h-5 w-5 text-white" />
                                    </div>
                                </>
                            ) : step.id === currentStep ? (
                                <>
                                    {stepIdx > 0 && <div className="absolute left-0 top-4 -translate-x-1/2 w-full h-0.5 bg-indigo-600" />}
                                    <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-indigo-600 bg-white dark:bg-slate-900">
                                        <step.icon className="h-5 w-5 text-indigo-600" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    {stepIdx > 0 && <div className="absolute left-0 top-4 -translate-x-1/2 w-full h-0.5 bg-gray-300 dark:bg-gray-700" />}
                                    <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900">
                                        <step.icon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                    </div>
                                </>
                            )}
                             <p className={`text-xs font-medium ${step.id <= currentStep ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                {step.name}
                            </p>
                        </div>
                    </li>
                ))}
            </ol>
        </nav>
    );
};

const WithdrawPage: React.FC<WithdrawPageProps> = ({ onNavigate }) => {
    const { loggedInUser: user } = useAuth();
    const { settingsState: { systemSettings } } = useSettings();
    const { handleNewWithdrawalRequest } = useActions();
    const { financeState: { withdrawalRequests } } = useFinance();

    const [step, setStep] = useState(1);
    const [walletType, setWalletType] = useState<'main' | 'support'>('main');
    const [amount, setAmount] = useState(0);
    const [method, setMethod] = useState<'bank' | 'momo'>('bank');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    
    const quickAmounts = [1000000, 2000000, 5000000, 10000000];

    // RULE: Kiểm tra xem có yêu cầu rút tiền nào đang pending không
    const pendingRequest = useMemo(() => {
        if (!user) return null;
        return withdrawalRequests.find(req => req.userId === user.id && req.status === 'pending');
    }, [withdrawalRequests, user]);

    if (!user) {
        return null;
    }

    // NẾU CÓ YÊU CẦU PENDING -> HIỂN THỊ MÀN HÌNH CHỜ
    if (pendingRequest) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Rút tiền</h2>
                <div className="max-w-2xl mx-auto mt-10">
                    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl ring-1 ring-black ring-opacity-5 p-10 text-center border-t-4 border-yellow-500">
                        <div className="bg-yellow-100 dark:bg-yellow-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                            <ClockIcon className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Đang có lệnh rút tiền chờ xử lý</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-2">
                            Bạn đang có một yêu cầu rút tiền trị giá <span className="font-bold text-red-600 dark:text-red-400">{pendingRequest.amount.toLocaleString('vi-VN')}đ</span> chưa được duyệt.
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-500 mb-8">
                            Để đảm bảo an toàn, bạn chỉ có thể tạo lệnh rút tiền mới khi lệnh cũ đã hoàn tất.
                        </p>
                        <div className="flex flex-col gap-3 max-w-xs mx-auto">
                             <button 
                                onClick={() => onNavigate('Ví Của Tôi')}
                                className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-all flex items-center justify-center gap-2"
                            >
                                <ArrowLeftIcon className="h-5 w-5" /> Quay lại Ví
                            </button>
                            <button 
                                onClick={() => onNavigate('Hỗ trợ')}
                                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all"
                            >
                                Liên hệ Hỗ trợ
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Kiểm tra tài khoản bị hạn chế
    const isOverdue = !!(user.nextMaintenanceDate && new Date() > new Date(user.nextMaintenanceDate));
    const isStatusRestricted = user.status !== UserStatus.Active;
    const isRestricted = isStatusRestricted || isOverdue;

    // React to restriction by forcing walletType to support
    React.useEffect(() => {
        if (isRestricted && walletType === 'main') {
            setWalletType('support');
        }
    }, [isRestricted, walletType]);

    // Bỏ view block page khi bị khoá. Thay vào đó, trong form sẽ vô hiệu ví chính.
    /*
    if (isRestricted) {
        ...
    }
    */

    const getMinWithdrawal = () => {
        if (walletType === 'main') {
            return systemSettings?.minWithdrawal || 0;
        }
        
        // Ví Hỗ Trợ: Tối thiểu 20% giá trị gói
        const packagePrice = (
            user.membershipTier === MembershipTier.Master ? systemSettings?.masterParticipationFee :
            user.membershipTier === MembershipTier.Pro ? systemSettings?.proParticipationFee :
            systemSettings?.participationFee
        ) || 0;
        
        return Math.floor(packagePrice * 0.2);
    };

    const minWithdrawal = getMinWithdrawal();

    const handleNextStep1 = () => {
        setError('');
        if (amount <= 0) { setError('Số tiền rút phải lớn hơn 0.'); return; }
        
        const availableBalance = walletType === 'main' ? (user.balance || 0) : (user.supportWalletBalance || 0);
        
        if (amount < minWithdrawal) { 
            setError(`Số tiền rút tối thiểu là ${minWithdrawal.toLocaleString('vi-VN')}đ.`); 
            return; 
        }
        if (amount > availableBalance) { setError('Số dư không đủ.'); return; }
        setStep(2);
    };

    const handleConfirm = async () => {
        setError('');
        if (!/^\d{4}$/.test(pin)) { setError('Mã PIN phải là 4 chữ số.'); return; }
        const result = handleNewWithdrawalRequest(amount, method, pin, walletType === 'support');
        if (result.success) { setStep(3); } 
        else if (result.message) { setError(result.message); }
    };
    
    const resetProcess = () => {
        setStep(1);
        setAmount(0);
        setMethod('bank');
        setPin('');
        setError('');
    }

    const isBankInfoMissing = method === 'bank' && (!user.bankName || !user.bankAccountNumber || !user.bankAccountName);
    const isMomoInfoMissing = method === 'momo' && !user.momoPhoneNumber;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Rút tiền</h2>
            <div className="max-w-3xl mx-auto">
                 <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6 mb-10">
                    <Stepper currentStep={step} />
                </div>

                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-8">
                    {step === 1 && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex gap-4 mb-6">
                                <button
                                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all text-center ${walletType === 'main' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 opacity-70 hover:opacity-100'} ${isRestricted ? 'opacity-50 cursor-not-allowed hover:opacity-50 grayscale' : ''}`}
                                    onClick={() => { if (!isRestricted) setWalletType('main')} }
                                    disabled={isRestricted}
                                    title={isRestricted ? "Tài khoản đang bị khoá" : ""}
                                >
                                    <p className="text-sm font-semibold mb-1 flex items-center justify-center gap-1">
                                        Ví Chính {isRestricted && <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />}
                                    </p>
                                    <p className="text-xl font-bold">{user.balance.toLocaleString('vi-VN')}đ</p>
                                </button>
                                <button
                                    className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all text-center ${walletType === 'support' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 opacity-70 hover:opacity-100'}`}
                                    onClick={() => setWalletType('support')}
                                >
                                    <p className="text-sm font-semibold mb-1">Ví Hỗ Trợ</p>
                                    <p className="text-xl font-bold">{(user.supportWalletBalance || 0).toLocaleString('vi-VN')}đ</p>
                                </button>
                            </div>
                            
                            <h3 className="text-xl font-bold text-center text-slate-800 dark:text-slate-200">Nhập số tiền cần rút</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {quickAmounts.map(a => (
                                    <button key={a} onClick={() => setAmount(a)} className={`p-4 rounded-lg border-2 text-lg font-semibold transition-all ${amount === a ? 'bg-indigo-50 dark:bg-indigo-900/50 border-indigo-500 text-indigo-600' : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:border-indigo-400'}`}>{a.toLocaleString('vi-VN')}đ</button>
                                ))}
                            </div>
                            <div className="relative">
                                <FormattedNumberInput
                                    value={amount}
                                    onChange={setAmount}
                                    placeholder="Hoặc nhập số tiền khác"
                                    className="block w-full px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-center text-xl font-semibold focus:ring-indigo-500 focus:border-indigo-500"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">VNĐ</span>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                                <InformationCircleIcon className="h-4 w-4" />
                                <span>Số tiền rút tối thiểu là <strong>{minWithdrawal.toLocaleString('vi-VN')}đ</strong>.</span>
                            </div>
                            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                            <button onClick={handleNextStep1} disabled={!amount} className="w-full px-6 py-3 text-base font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors">Tiếp tục</button>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="space-y-6 animate-fadeIn">
                            <h3 className="text-xl font-bold text-center text-slate-800 dark:text-slate-200">Xác nhận thông tin & Bảo mật</h3>
                            <div className="p-6 bg-slate-100 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Số tiền yêu cầu rút</p>
                                    <p className="font-bold text-lg text-slate-800 dark:text-slate-200">{amount.toLocaleString('vi-VN')}đ</p>
                                </div>
                                <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Khấu trừ Thuế TNCN (10%)</p>
                                    <p className="font-semibold text-red-500">-{Math.floor(amount * 0.1).toLocaleString('vi-VN')}đ</p>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Thực nhận về tài khoản</p>
                                    <p className="font-black text-2xl text-green-600 dark:text-green-400">{Math.floor(amount * 0.9).toLocaleString('vi-VN')}đ</p>
                                </div>
                                <div className="pt-4">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Phương thức nhận tiền</label>
                                    <select value={method} onChange={(e) => setMethod(e.target.value as 'bank' | 'momo')} className="mt-1 block w-full px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700">
                                        <option value="bank">Tài khoản Ngân hàng</option>
                                        <option value="momo">Ví Momo</option>
                                    </select>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Thông tin người nhận</p>
                                    {isBankInfoMissing || isMomoInfoMissing ? (
                                        <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-300 dark:border-yellow-700 flex items-start gap-3">
                                            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">Thông tin thanh toán chưa được thiết lập.</p>
                                                <button onClick={() => onNavigate('Cài đặt/payment')} className="text-sm text-yellow-700 dark:text-yellow-300 hover:underline font-medium">Cập nhật ngay</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-slate-500 mt-1 p-3 bg-slate-200 dark:bg-slate-700 rounded-md">
                                            {method === 'bank' ? (
                                                <p><strong className="text-slate-700 dark:text-slate-300">{user.bankAccountName}</strong> - {user.bankName} - {user.bankAccountNumber}</p>
                                            ) : (
                                                <p><strong className="text-slate-700 dark:text-slate-300">{user.name}</strong> - Momo - {user.momoPhoneNumber}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                             <div className="space-y-2">
                                 <label htmlFor="pin-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nhập mã PIN (4 số) để xác thực</label>
                                 <div className="relative">
                                    <input id="pin-input" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))} placeholder="••••" className="block w-full text-center tracking-[1em] px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700" />
                                </div>
                            </div>
                            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <button onClick={() => setStep(1)} className="w-full px-6 py-3 text-base font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Quay lại</button>
                                <button onClick={handleConfirm} disabled={isBankInfoMissing || isMomoInfoMissing} className="w-full px-6 py-3 text-base font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors">Xác nhận Rút tiền</button>
                            </div>
                        </div>
                    )}
                    {step === 3 && (
                        <div className="text-center py-6 animate-fadeIn">
                            <CheckCircleFillIcon className="h-20 w-20 text-green-500 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Đã gửi yêu cầu Rút tiền!</h3>
                            <p className="mt-2 text-slate-500 dark:text-slate-400">Hệ thống sẽ xử lý yêu cầu của bạn trong 24-48 giờ làm việc.</p>
                            <div className="mt-8 flex gap-4 justify-center">
                                {/* Only allow "Create another" if user doesn't have a pending request. But since we just created one, they now DO have a pending request.
                                    So essentially, we redirect them to wallet. */}
                                <button onClick={() => onNavigate('Ví Của Tôi')} className="px-6 py-3 text-base font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">Về trang Ví</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WithdrawPage;
