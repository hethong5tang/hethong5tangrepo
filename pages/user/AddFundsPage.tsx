
import React, { useState, useMemo } from 'react';
import { AdminManagedUser } from '../../features/users/types';
import { CheckCircleFillIcon, QrCodeIcon, BuildingLibraryIcon, ClipboardDocumentIcon, CheckIcon, BanknotesIcon, CreditCardIcon, BoltIcon, ClockIcon, ArrowLeftIcon } from '../../components/Icons';
import { useToast } from '../../components/ToastProvider';
import FormattedNumberInput from '../../components/FormattedNumberInput';
import { useAuth } from '../../features/auth/useAuth';
import { useActions } from '../../features/actions/useActions';
import { useSettings } from '../../features/settings/useSettings';
import { useFinance } from '../../features/finance/useFinance';

interface AddFundsPageProps {
    onNavigate: (page: string) => void;
}

const Stepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const steps = [
        { id: 1, name: 'Số tiền', icon: BanknotesIcon },
        { id: 2, name: 'Phương thức', icon: CreditCardIcon },
        { id: 3, name: 'Thanh toán', icon: QrCodeIcon },
        { id: 4, name: 'Hoàn tất', icon: CheckCircleFillIcon },
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


const AddFundsPage: React.FC<AddFundsPageProps> = ({ onNavigate }) => {
    const { loggedInUser: user } = useAuth();
    const { handleCreateDepositRequest } = useActions();
    const { settingsState } = useSettings();
    const { financeState: { depositRequests } } = useFinance();
    const { adminPayment } = settingsState.systemSettings;
    
    const [step, setStep] = useState(1);
    const [amount, setAmount] = useState(0);
    const [error, setError] = useState('');
    const [selectedMethodType, setSelectedMethodType] = useState<'bank' | 'wallet' | null>(null);
    const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
    
    const { addToast } = useToast();

    // RULE: Kiểm tra xem có yêu cầu nạp tiền nào đang pending không
    const pendingRequest = useMemo(() => {
        if (!user) return null;
        return depositRequests.find(req => req.userId === user.id && req.status === 'pending');
    }, [depositRequests, user]);

    if (!user) {
        return null;
    }

    // NẾU CÓ YÊU CẦU PENDING -> HIỂN THỊ MÀN HÌNH CHỜ
    if (pendingRequest) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nạp tiền</h2>
                <div className="max-w-2xl mx-auto mt-10">
                    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-xl ring-1 ring-black ring-opacity-5 p-10 text-center border-t-4 border-yellow-500">
                        <div className="bg-yellow-100 dark:bg-yellow-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                            <ClockIcon className="h-10 w-10 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Đang có lệnh nạp chờ xử lý</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-2">
                            Bạn đang có một yêu cầu nạp tiền trị giá <span className="font-bold text-indigo-600 dark:text-indigo-400">{pendingRequest.amount.toLocaleString('vi-VN')}đ</span> chưa được duyệt.
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-500 mb-8">
                            Vui lòng đợi Admin xử lý lệnh hiện tại trước khi tạo lệnh mới. Nếu quá lâu, hãy liên hệ bộ phận hỗ trợ.
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

    const quickDepositAmounts = [100000, 500000, 1000000, 2000000];
    
    // Tạo nội dung chuyển khoản ngắn gọn: NAP + 6 ký tự cuối ID user
    const transferContent = `NAP ${user?.id.slice(-6).toUpperCase()}`;

    // Generate URLs
    
    // 1. Bank QR Logic
    const getBankQrUrl = () => {
        // Nếu bật chế độ Custom và có ảnh -> Dùng ảnh Custom
        if (adminPayment.bank.useCustomQr && adminPayment.bank.qrImageUrl) {
            return adminPayment.bank.qrImageUrl;
        }
        // Fallback: VietQR Dynamic
        return `https://img.vietqr.io/image/${adminPayment.bank.bankShortName || adminPayment.bank.bankName}-${adminPayment.bank.accountNumber}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(adminPayment.bank.accountOwner)}`;
    };
    
    const bankQrUrl = getBankQrUrl();
    
    // 2. Wallet QR Logic
    const getWalletQrUrl = (walletId: string) => {
        const wallet = adminPayment.wallets.find(w => w.id === walletId);
        if (!wallet) return '';
        
        // Nếu bật chế độ Custom và có ảnh -> Dùng ảnh Custom
        if (wallet.useCustomQr && wallet.qrImageUrl) {
            return wallet.qrImageUrl;
        }

        // Fallback: Simple text QR
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${wallet.phoneNumber}`;
    }

    const handleNextStep1 = () => {
        setError('');
        if (amount < 10000) {
            setError('Số tiền nạp tối thiểu là 10,000đ.');
            return;
        }
        setStep(2);
    };

    const handleSelectBank = () => {
        if (!adminPayment.bank.enabled) {
            addToast('Chuyển khoản ngân hàng đang bảo trì.', 'info');
            return;
        }
        setSelectedMethodType('bank');
        setStep(3);
    };

    const handleSelectWallet = (walletId: string) => {
        setSelectedMethodType('wallet');
        setSelectedWalletId(walletId);
        setStep(3);
    };

    const handleSendRequest = () => {
        if (user) {
            const method = selectedMethodType === 'bank' ? 'bank_transfer' : 'momo_qr';
            handleCreateDepositRequest(amount, method, transferContent);
        }
        setStep(4);
    };

    const resetProcess = () => {
        setStep(1);
        setAmount(0);
        setError('');
        setSelectedMethodType(null);
        setSelectedWalletId(null);
    };
    
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        addToast('Đã sao chép vào bộ nhớ đệm!', 'success');
    };
    
    const activeWallets = adminPayment.wallets.filter(w => w.enabled);

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nạp tiền</h2>
            <div className="max-w-3xl mx-auto">
                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6 mb-10">
                    <Stepper currentStep={step} />
                </div>

                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-8">
                    {/* BƯỚC 1: CHỌN SỐ TIỀN */}
                    {step === 1 && (
                        <div className="space-y-6 animate-fadeIn">
                            <h3 className="text-xl font-bold text-center text-slate-800 dark:text-slate-200">Chọn hoặc nhập số tiền</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {quickDepositAmounts.map(a => (
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
                            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                            <button onClick={handleNextStep1} disabled={!amount} className="w-full px-6 py-3 text-base font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors">Tiếp tục</button>
                        </div>
                    )}

                    {/* BƯỚC 2: CHỌN PHƯƠNG THỨC */}
                    {step === 2 && (
                        <div className="space-y-6 animate-fadeIn">
                            <h3 className="text-xl font-bold text-center text-slate-800 dark:text-slate-200">Chọn phương thức thanh toán</h3>
                            <div className="space-y-4">
                                {/* Bank Transfer Option */}
                                <button 
                                    onClick={handleSelectBank} 
                                    disabled={!adminPayment.bank.enabled}
                                    className={`w-full text-left p-6 rounded-lg border-2 flex items-center gap-4 transition-colors ${!adminPayment.bank.enabled ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200' : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:border-indigo-500'}`}
                                >
                                    <BuildingLibraryIcon className="h-8 w-8 text-indigo-500" />
                                    <div>
                                        <p className="font-semibold text-lg text-slate-800 dark:text-slate-200">Chuyển khoản Ngân hàng (VietQR)</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Quét mã QR, tự động điền thông tin.</p>
                                    </div>
                                </button>
                                
                                {/* Wallet Options */}
                                {activeWallets.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {activeWallets.map(wallet => (
                                            <button 
                                                key={wallet.id} 
                                                onClick={() => handleSelectWallet(wallet.id)}
                                                className="w-full text-left p-4 rounded-lg border-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 hover:border-pink-500 flex items-center gap-3 transition-colors"
                                            >
                                                <BoltIcon className="h-6 w-6 text-pink-500" />
                                                <div>
                                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{wallet.name}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{wallet.type}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button onClick={() => setStep(1)} className="w-full px-6 py-3 text-base font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Quay lại</button>
                        </div>
                    )}

                    {/* BƯỚC 3: HIỂN THỊ THÔNG TIN & QR */}
                     {step === 3 && (
                        <div className="animate-fadeIn">
                            <div className="text-center mb-6">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Thực hiện Thanh toán</h3>
                                <p className="text-slate-500 dark:text-slate-400 mt-1">Số tiền: <span className="font-bold text-2xl text-indigo-500">{amount.toLocaleString('vi-VN')}đ</span></p>
                            </div>
                            
                            {/* BANK TRANSFER UI */}
                            {selectedMethodType === 'bank' && (
                                <div className="flex flex-col items-center">
                                     <div className="p-2 bg-white rounded-lg inline-block shadow-md mb-4 border-4 border-indigo-500 overflow-hidden relative">
                                         <img src={bankQrUrl} alt="VietQR Code" className="max-w-[250px] mx-auto object-contain" />
                                     </div>
                                     <div className="w-full max-w-md bg-slate-100 dark:bg-slate-700/50 rounded-lg p-4 space-y-3 border border-slate-200 dark:border-slate-600 text-sm">
                                         <div className="flex justify-between">
                                             <span className="text-slate-500">Ngân hàng:</span>
                                             <span className="font-bold text-slate-800 dark:text-slate-200">{adminPayment.bank.bankName}</span>
                                         </div>
                                         <div className="flex justify-between items-center">
                                             <span className="text-slate-500">Số tài khoản:</span>
                                             <div className="flex items-center gap-2">
                                                 <span className="font-bold text-slate-800 dark:text-slate-200">{adminPayment.bank.accountNumber}</span>
                                                 <button onClick={() => handleCopy(adminPayment.bank.accountNumber)} className="text-indigo-500 hover:text-indigo-600"><ClipboardDocumentIcon className="h-4 w-4"/></button>
                                             </div>
                                         </div>
                                         <div className="flex justify-between">
                                             <span className="text-slate-500">Chủ tài khoản:</span>
                                             <span className="font-bold text-slate-800 dark:text-slate-200">{adminPayment.bank.accountOwner}</span>
                                         </div>
                                         <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-600">
                                             <span className="text-slate-500">Nội dung (Bắt buộc):</span>
                                             <div className="flex items-center gap-2">
                                                 <span className="font-bold text-pink-600">{transferContent}</span>
                                                 <button onClick={() => handleCopy(transferContent)} className="text-pink-500 hover:text-pink-600"><ClipboardDocumentIcon className="h-4 w-4"/></button>
                                             </div>
                                         </div>
                                     </div>
                                </div>
                            )}

                            {/* WALLET TRANSFER UI */}
                            {selectedMethodType === 'wallet' && selectedWalletId && (
                                <div className="flex flex-col items-center">
                                    {(() => {
                                        const wallet = adminPayment.wallets.find(w => w.id === selectedWalletId);
                                        if (!wallet) return null;
                                        return (
                                            <>
                                                <div className="p-3 bg-white rounded-lg inline-block my-4 shadow-md overflow-hidden relative">
                                                    <img src={getWalletQrUrl(selectedWalletId)} alt="Wallet QR" className="max-w-[250px] mx-auto object-contain" />
                                                </div>
                                                <div className="w-full max-w-md bg-slate-100 dark:bg-slate-700/50 rounded-lg p-4 space-y-3 border border-slate-200 dark:border-slate-600 text-sm">
                                                     <div className="flex justify-between">
                                                         <span className="text-slate-500">Ví:</span>
                                                         <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{wallet.type}</span>
                                                     </div>
                                                     <div className="flex justify-between items-center">
                                                         <span className="text-slate-500">Số điện thoại/TK:</span>
                                                         <div className="flex items-center gap-2">
                                                             <span className="font-bold text-slate-800 dark:text-slate-200">{wallet.phoneNumber}</span>
                                                             <button onClick={() => handleCopy(wallet.phoneNumber)} className="text-indigo-500 hover:text-indigo-600"><ClipboardDocumentIcon className="h-4 w-4"/></button>
                                                         </div>
                                                     </div>
                                                     <div className="flex justify-between">
                                                         <span className="text-slate-500">Người nhận:</span>
                                                         <span className="font-bold text-slate-800 dark:text-slate-200">{wallet.ownerName}</span>
                                                     </div>
                                                     <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-600">
                                                         <span className="text-slate-500">Nội dung (Bắt buộc):</span>
                                                         <div className="flex items-center gap-2">
                                                             <span className="font-bold text-pink-600">{transferContent}</span>
                                                             <button onClick={() => handleCopy(transferContent)} className="text-pink-500 hover:text-pink-600"><ClipboardDocumentIcon className="h-4 w-4"/></button>
                                                         </div>
                                                     </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            <div className="mt-8">
                                 <button onClick={handleSendRequest} className="w-full px-6 py-3 text-base font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-lg">Tôi đã chuyển khoản xong</button>
                                 <button onClick={() => setStep(2)} className="w-full px-6 py-3 mt-3 text-base font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Quay lại</button>
                            </div>
                        </div>
                    )}

                    {/* BƯỚC 4: HOÀN TẤT / PENDING */}
                    {step === 4 && (
                        <div className="text-center py-6 animate-fadeIn">
                            <ClockIcon className="h-20 w-20 text-blue-500 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Yêu cầu đã được gửi!</h3>
                            <p className="mt-2 text-slate-500 dark:text-slate-400">Lệnh nạp <strong className="text-slate-700 dark:text-slate-300">{amount.toLocaleString('vi-VN')}đ</strong> đang chờ Admin phê duyệt.</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Số dư sẽ được cập nhật ngay sau khi giao dịch được xác nhận.</p>
                            <div className="mt-8 flex gap-4 justify-center">
                                <button onClick={resetProcess} className="px-6 py-3 text-base font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">Tạo lệnh mới</button>
                                <button onClick={() => onNavigate('Ví Của Tôi')} className="px-6 py-3 text-base font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">Về trang Ví</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddFundsPage;
