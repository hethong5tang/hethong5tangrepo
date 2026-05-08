import React, { useState, useMemo } from 'react';
import { AdminManagedUser, MembershipTier, UpgradeResult } from '../../features/users/types';
import { SystemSettings } from '../../features/settings/types';
import Modal from '../../components/Modal';
import IncomeEstimator from '../../components/IncomeEstimator';
import { CheckIcon, CheckCircleFillIcon } from '../../components/Icons';
import { useLandingPageContent } from '../../features/landing/useLandingPageContent';
import { useAuth } from '../../features/auth/useAuth';
import { useSettings } from '../../features/settings/useSettings';
import { useActions } from '../../features/actions/useActions';

const UpgradePlanPage: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
    const { loggedInUser: user } = useAuth();
    const { settingsState: { systemSettings } } = useSettings();
    const { handleUpgradeTier } = useActions();
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isInsufficientFundsModalOpen, setIsInsufficientFundsModalOpen] = useState(false);
    const [neededAmount, setNeededAmount] = useState(0);
    const [selectedPlan, setSelectedPlan] = useState<{name: string, tier: MembershipTier, price: number} | null>(null);
    const { state: { content: landingPageContent } } = useLandingPageContent();
    const { pricing: pricingContent } = landingPageContent;

    if (!user) {
        return null;
    }

    const TIER_ORDER: Record<MembershipTier, number> = {
        [MembershipTier.None]: 0,
        [MembershipTier.Starter]: 1,
        [MembershipTier.Pro]: 2,
        [MembershipTier.Master]: 3,
    };
    const currentTierOrder = TIER_ORDER[user.membershipTier];
    
    const formatPriceText = (price: number) => {
        if (price >= 1000000) return `${price / 1000000} Triệu`;
        return `${price / 1000}k`;
    };

    const formatMaintenanceFee = (price: number) => {
        if (price >= 1000000) return `${price / 1000000}M/tháng`;
        return `${price / 1000}k/tháng`;
    };

    const plans = useMemo(() => {
        return pricingContent.plans.map(plan => ({
            ...plan,
            priceText: formatPriceText(plan.price),
            maintenance: formatMaintenanceFee(plan.maintenanceFee),
        }));
    }, [pricingContent.plans]);
    
    const handleUpgradeClick = (plan: typeof plans[0]) => {
        setSelectedPlan({name: plan.name, tier: plan.tier, price: plan.price});
        setIsConfirmModalOpen(true);
    };

    const handleConfirmUpgrade = () => {
        if(selectedPlan) {
            const result = handleUpgradeTier(selectedPlan.tier);
            if (!result.success) {
                setNeededAmount(result.needed || 0);
                setIsInsufficientFundsModalOpen(true);
            }
        }
        setIsConfirmModalOpen(false);
    };

    return (
        <div className="space-y-6">
            <Modal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                title={`Xác nhận ${user.membershipTier === MembershipTier.None ? 'Kích hoạt' : 'Nâng cấp'} Gói`}
                confirmText="Xác nhận & Thanh toán"
                onConfirm={handleConfirmUpgrade}
            >
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Bạn có chắc chắn muốn {user.membershipTier === MembershipTier.None ? 'kích hoạt' : 'nâng cấp lên'} gói <span className="font-bold">{selectedPlan?.name}</span>? 
                    Số tiền <span className="font-bold">{selectedPlan?.price.toLocaleString('vi-VN')}đ</span> sẽ được trừ từ số dư ví của bạn.
                </p>
            </Modal>
             <Modal
                isOpen={isInsufficientFundsModalOpen}
                onClose={() => setIsInsufficientFundsModalOpen(false)}
                title="Không đủ số dư"
                confirmText="Nạp tiền ngay"
                onConfirm={() => {
                    setIsInsufficientFundsModalOpen(false);
                    setSelectedPlan(null);
                    onNavigate('Ví Của Tôi');
                }}
                cancelText="Để sau"
            >
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Số dư của bạn không đủ để {user.membershipTier === MembershipTier.None ? 'kích hoạt' : 'nâng cấp lên'} gói <span className="font-bold">{selectedPlan?.name}</span>. 
                    Vui lòng nạp thêm ít nhất <span className="font-bold text-red-500">{neededAmount.toLocaleString('vi-VN')}đ</span> để tiếp tục.
                </p>
            </Modal>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                {user.membershipTier === MembershipTier.None ? 'Kích hoạt Gói Thành Viên' : 'Nâng Cấp Gói Thành Viên'}
            </h2>
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                    {user.membershipTier === MembershipTier.None ? 'Hãy chọn gói đầu tiên để bắt đầu hành trình của bạn.' : 'Mở khóa tiềm năng thu nhập cao hơn bằng cách nâng cấp gói của bạn.'}
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {plans.map(plan => {
                        const planTierOrder = TIER_ORDER[plan.tier];
                        const isCurrent = plan.tier === user.membershipTier;
                        const isUpgrade = planTierOrder > currentTierOrder;
                        const isDowngrade = planTierOrder < currentTierOrder;
                        const isActivation = user.membershipTier === MembershipTier.None && plan.tier === MembershipTier.Starter;

                        let buttonContent;
                        if (isCurrent) {
                            buttonContent = (
                                <button 
                                    disabled 
                                    className="mt-6 w-full py-2.5 rounded-lg font-semibold transition-colors disabled:opacity-100 cursor-default inline-flex items-center justify-center gap-2 bg-emerald-600 text-white"
                                >
                                    <CheckIcon className="h-5 w-5" />
                                    Gói hiện tại
                                </button>
                            );
                        } else if (isUpgrade || isActivation) {
                            buttonContent = (
                                <button 
                                    onClick={() => handleUpgradeClick(plan)} 
                                    className="mt-6 w-full py-2.5 rounded-lg font-semibold transition-transform transform hover:scale-105 bg-gradient-to-r from-indigo-500 to-emerald-500 text-white"
                                >
                                    {isActivation ? 'Kích hoạt Gói' : 'Nâng cấp'}
                                </button>
                            );
                        } else { // isDowngrade, button is not rendered
                            buttonContent = null;
                        }

                        return (
                            <div key={plan.name} className={`p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col transition-all duration-300 ${isCurrent ? 'ring-2 ring-emerald-500' : ''} ${isActivation ? 'ring-2 ring-indigo-500 shadow-2xl shadow-indigo-500/30' : 'hover:ring-indigo-500'}`}>
                                {isCurrent && <div className="text-xs font-bold uppercase text-slate-500 mb-2">Gói hiện tại</div>}
                                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{plan.name}</h3>
                                <p className="text-3xl font-bold my-2 text-slate-900 dark:text-white">{plan.priceText} <span className="text-base font-medium text-slate-500">/ lần duy nhất</span></p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Phí duy trì: {plan.maintenance}</p>
                                <ul className="space-y-3 text-slate-600 dark:text-slate-400 flex-grow">
                                    {plan.features.map(f => <li key={f} className="flex items-start"><CheckCircleFillIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" /><span dangerouslySetInnerHTML={{ __html: f }}></span></li>)}
                                </ul>
                                {buttonContent}
                            </div>
                        )
                    })}
                </div>
            </div>
            <IncomeEstimator systemSettings={systemSettings} />
        </div>
    );
};

export default UpgradePlanPage;