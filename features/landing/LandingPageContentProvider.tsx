
import React, { useReducer, ReactNode, useEffect, useRef } from 'react';
import { LandingPageContentContext } from './useLandingPageContent';
import { landingPageContentReducer } from './landingPageContentReducer';
import { initialLandingPageState } from './mockData';
import { useSettings } from '../settings/useSettings';
import { MembershipTier, AdminManagedUser, UserStatus } from '../users/types';
import { useUser } from '../users/useUser';
import { useFinance } from '../finance/useFinance';
import { TransactionType } from '../finance/types';
import { LeaderboardMetric } from '../settings/types';

const STORAGE_KEY = 'app_landing_page_v2';

const init = (defaultState: any) => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                ...defaultState,
                ...parsed,
                content: { ...defaultState.content, ...parsed.content }
            };
        }
    } catch (e) {
        console.error("Failed to load landing page content", e);
    }
    return defaultState;
};

export const LandingPageContentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(landingPageContentReducer, initialLandingPageState, init);
    const { settingsState: { systemSettings, fundSettings } } = useSettings();
    const { userState } = useUser();
    const { financeState } = useFinance();
    
    // Lưu vào LocalStorage mỗi khi state thay đổi
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, [state]);

    // Ref để theo dõi giá trị settings cũ
    const prevSettingsRef = useRef(JSON.stringify({ systemSettings, fundSettings }));

    useEffect(() => {
        const currentSettingsStr = JSON.stringify({ systemSettings, fundSettings });
        const settingsChanged = prevSettingsRef.current !== currentSettingsStr;
        
        const { participationFee, maintenanceFee, proParticipationFee, proMaintenanceFee, masterParticipationFee, masterMaintenanceFee, tierSettings, commissionSettings } = systemSettings;
        const { supportFundSettings } = fundSettings;
        
        const formatPriceText = (price: number) => price >= 1000000 ? `${price / 1000000} Triệu` : `${price / 1000}k`;

        // 1. Cập nhật Bảng giá
        const newPlans = state.content.pricing.plans
            .filter(plan => tierSettings[plan.tier as keyof typeof tierSettings]?.visible)
            .map(plan => {
                let price = 0;
                let maintenanceFeeValue = 0;
                const tier = plan.tier as keyof typeof tierSettings;
                switch (tier) {
                    case MembershipTier.Starter: price = participationFee; maintenanceFeeValue = maintenanceFee; break;
                    case MembershipTier.Pro: price = proParticipationFee; maintenanceFeeValue = proMaintenanceFee; break;
                    case MembershipTier.Master: price = masterParticipationFee; maintenanceFeeValue = masterMaintenanceFee; break;
                }
                // Cập nhật text đặc điểm tầng
                const updatedFeatures = plan.features.map(f => 
                    f.includes('hoa hồng') ? `Mở khóa hoa hồng ${commissionSettings.participationCommissions.length} tầng` : f
                );
                return { ...plan, name: tierSettings[tier].name, price, maintenanceFee: maintenanceFeeValue, features: updatedFeatures };
            });

        // 2. Cập nhật Subtitle (Số tầng động)
        const currentFLevel = commissionSettings.participationCommissions.length;
        const updatedSubtitle = `Chỉ với ${formatPriceText(participationFee)} tham gia, nhận hoa hồng đến F${currentFLevel}, thưởng Leader và Quỹ Hỗ Trợ.`;
        
        // 3. Cập nhật Quỹ hỗ trợ
        const supportFundPayoutLimit = supportFundSettings[MembershipTier.Starter].totalPayoutLimit;
        const updatedSupportFundDescription = `Chia cho người chưa có F1, tối đa ${formatPriceText(supportFundPayoutLimit)}/người.`;
        
        const updatedFeaturesItems = state.content.features.items.map(item => {
            if (item.id === 'f1') return { ...item, title: `💰 Hoa hồng F1–F${currentFLevel}`, description: `Nhận hoa hồng đến tầng ${currentFLevel} từ phí tham gia & duy trì.` };
            if (item.id === 'f3') return { ...item, description: updatedSupportFundDescription };
            return item;
        });

        // DISPATCH CÁC THAY ĐỔI NẾU CÓ
        if (JSON.stringify(newPlans) !== JSON.stringify(state.content.pricing.plans)) {
            dispatch({ type: 'SET_SECTION_CONTENT', payload: { sectionId: 'pricing', content: { ...state.content.pricing, plans: newPlans } } });
        }
        
        if (settingsChanged && updatedSubtitle !== state.content.hero.subtitle) {
            dispatch({ type: 'SET_SECTION_CONTENT', payload: { sectionId: 'hero', content: { ...state.content.hero, subtitle: updatedSubtitle } } });
        }
        
        if (settingsChanged && JSON.stringify(updatedFeaturesItems) !== JSON.stringify(state.content.features.items)) {
             dispatch({ type: 'SET_SECTION_CONTENT', payload: { sectionId: 'features', content: { ...state.content.features, items: updatedFeaturesItems } } });
        }
        
        // 4. Bảng xếp hạng
        const { leaderboardSettings, useLeaderboardMockData, leaderboardMockData } = systemSettings;
        let newLeaderboardContent;
        if (useLeaderboardMockData) {
            newLeaderboardContent = {
                title: leaderboardMockData.title,
                description: leaderboardMockData.description,
                leaders: leaderboardMockData.leaders.slice(0, 3),
                metric: leaderboardMockData.metric,
            };
        } else {
            const { title, description, metric, timeframe } = leaderboardSettings;
            const now = new Date();
            let startDate: Date;

            switch (timeframe) {
                case 'monthly': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
                case 'quarterly': const q = Math.floor(now.getMonth() / 3); startDate = new Date(now.getFullYear(), q * 3, 1); break;
                case 'yearly': startDate = new Date(now.getFullYear(), 0, 1); break;
                default: startDate = new Date(0); break;
            }
            startDate.setHours(0, 0, 0, 0);
            
            const flattenUsers = (users: AdminManagedUser[]): AdminManagedUser[] => users.flatMap(u => [u, ...(u.children ? flattenUsers(u.children) : [])]);
            const allFlatUsers = flattenUsers(userState.allUsers);

            const leadersWithScores = allFlatUsers
                .filter(user => user.status === UserStatus.Active)
                .map(user => {
                    let score = 0;
                    switch (metric) {
                        case LeaderboardMetric.F1Count: score = (user.children || []).filter(f1 => new Date(f1.joinDate) >= startDate).length; break;
                        case LeaderboardMetric.Network_size: const allDescendants = user.children ? flattenUsers(user.children) : []; score = allDescendants.filter(u => new Date(u.joinDate) >= startDate).length; break;
                        case LeaderboardMetric.TotalEarnings: const commissionTypes = [TransactionType.CommissionParticipation, TransactionType.CommissionMaintenance, TransactionType.LeaderBonus, TransactionType.SupportFundPayout]; score = financeState.allTransactions.filter(t => t.userId === user.id && t.amount > 0 && commissionTypes.includes(t.type) && new Date(t.date) >= startDate).reduce((sum, t) => sum + t.amount, 0); break;
                    }
                    return { id: user.id, name: user.name, avatar: user.avatar, score };
                })
                .filter(leader => leader.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);
            
            newLeaderboardContent = { title, description, leaders: leadersWithScores, metric };
        }

        if (JSON.stringify(newLeaderboardContent) !== JSON.stringify(state.content.leaderboard)) {
            dispatch({ type: 'SET_SECTION_CONTENT', payload: { sectionId: 'leaderboard', content: newLeaderboardContent } });
        }

        prevSettingsRef.current = currentSettingsStr;
        
    }, [
        systemSettings, 
        fundSettings,
        userState.allUsers,
        financeState.allTransactions,
        dispatch
    ]);

    return (
        <LandingPageContentContext.Provider value={{ state, dispatch }}>
            {children}
        </LandingPageContentContext.Provider>
    );
};
