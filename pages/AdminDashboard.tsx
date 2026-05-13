
import React, { useState, Suspense, lazy, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { SparklesIcon, XMarkIcon, ExclamationTriangleIcon, TrophyIcon, DocumentMagnifyingGlassIcon } from '../components/Icons';
import { Action, ActionType } from '../types';
import { WithdrawalRequest } from '../features/finance/types';
import { Permission } from '../features/roles/types';
import GeminiAiAssistant from '../components/GeminiAiAssistant';
import { useAuth } from '../features/auth/useAuth';
import { useUser } from '../features/users/useUser';
import { useFinance } from '../features/finance/useFinance';
import { useSettings } from '../features/settings/useSettings';
import PageLoader from '../components/PageLoader';
import { useActions } from '../features/actions/useActions';

// Lazy load all page components
const DashboardPage = lazy(() => import('./admin/DashboardPage'));
const UserManagementPage = lazy(() => import('./admin/UserManagementPage'));
const FinancePage = lazy(() => import('./admin/FinancePage'));
const FundManagementPage = lazy(() => import('./admin/FundManagementPage'));
const SettingsPage = lazy(() => import('./admin/SettingsPage'));
const RoleManagementPage = lazy(() => import('./admin/RoleManagementPage'));
const FeesAndCommissionsPage = lazy(() => import('./admin/FeesAndCommissionsPage'));
const SupportManagementPage = lazy(() => import('./admin/SupportManagementPage'));
const LandingPageManagementPage = lazy(() => import('./admin/LandingPageManagementPage'));
const NotificationHistoryPage = lazy(() => import('../pages/notifications/NotificationHistoryPage'));
const AchievementManagementPage = lazy(() => import('./admin/AchievementManagementPage'));
const ReferralContentManagementPage = lazy(() => import('./admin/ReferralContentManagementPage'));
const LeaderboardManagementPage = lazy(() => import('./admin/LeaderboardManagementPage'));
const LevelManagementPage = lazy(() => import('./admin/LevelManagementPage'));
const ActivityLogPage = lazy(() => import('./admin/ActivityLogPage'));
const IntegrationsManagementPage = lazy(() => import('./admin/IntegrationsManagementPage'));
const ApiConsumptionPage = lazy(() => import('./admin/ApiConsumptionPage'));
const GitHubSyncPage = lazy(() => import('./admin/GitHubSyncPage'));


const AccessDenied: React.FC = () => (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-red-500">Truy cập bị từ chối</h3>
        <p className="text-slate-500 mt-2">Bạn không có quyền hạn cần thiết để xem trang này.</p>
    </div>
);

const getPageFromHash = () => {
    try {
        return decodeURIComponent(window.location.hash.substring(1));
    } catch (e) {
        return '';
    }
};

const AdminDashboard: React.FC = () => {
    const { hasPermission } = useAuth();
    const actions = useActions();
    
    const { userState: { allUsers: users } } = useUser();
    const { financeState } = useFinance();
    const { allTransactions: transactions, withdrawalRequests, fundTransactions, fundStatus } = financeState;
    const { settingsState: { systemSettings } } = useSettings();

    const [currentPage, setCurrentPage] = useState(() => getPageFromHash() || 'Bảng điều khiển');
    const [action, setAction] = useState<Action | null>(null);
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);

    useEffect(() => {
        const handleHashChange = () => {
            setCurrentPage(getPageFromHash() || 'Bảng điều khiển');
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, []);

    const handleNavigate = (page: string) => {
        window.location.hash = page;
    };

    const onAction = (action: Action) => {
        setAction(action);
        if (action.type === ActionType.NAVIGATE) {
            handleNavigate(action.payload);
            setIsAssistantOpen(false);
        }
    };

    const onActionConsumed = () => setAction(null);

    const pageConfig = {
        'Bảng điều khiển': {
            component: DashboardPage,
            permissions: [],
            props: {}
        },
        'Quản lý người dùng': {
            component: UserManagementPage,
            permissions: [Permission.USER_VIEW],
            props: { 
                action, 
                onActionConsumed,
            }
        },
        'Tài chính': {
            component: FinancePage,
            permissions: [Permission.FINANCE_VIEW_ALL, Permission.FINANCE_MANAGE_WITHDRAWALS], 
            props: { 
                action, 
                onActionConsumed,
            }
        },
        'Thống kê API': {
            component: ApiConsumptionPage,
            permissions: [Permission.SETTINGS_SYSTEM_VIEW],
            props: {}
        },
        'Yêu cầu Hỗ trợ': {
            component: SupportManagementPage,
            permissions: [Permission.SUPPORT_VIEW],
            props: {}
        },
        'Quản lý Quỹ': {
            component: FundManagementPage,
            permissions: [Permission.FUNDS_VIEW, Permission.FUNDS_MANAGE_PAYOUTS, Permission.FUNDS_MANAGE_SETTINGS], 
            props: {}
        },
        'Quản lý Vai trò': {
            component: RoleManagementPage,
            permissions: [Permission.USER_MANAGE_ROLES],
            props: {}
        },
        'Phí & Chiết khấu': {
            component: FeesAndCommissionsPage,
            permissions: [Permission.SETTINGS_FEES_COMMISSIONS_VIEW],
            props: {}
        },
        'Quản lý Cấp bậc': {
            component: LevelManagementPage,
            permissions: [Permission.SETTINGS_ACHIEVEMENTS_MANAGE],
            props: {}
        },
        'Quản lý Thành tích': {
            component: AchievementManagementPage,
            permissions: [Permission.SETTINGS_ACHIEVEMENTS_MANAGE],
            props: {}
        },
        'Quản lý Bảng xếp hạng': {
            component: LeaderboardManagementPage,
            permissions: [Permission.SETTINGS_ACHIEVEMENTS_MANAGE],
            props: {}
        },
        'Quản lý Trang chủ': {
            component: LandingPageManagementPage,
            permissions: [Permission.SETTINGS_SYSTEM_EDIT],
            props: {}
        },
        'Nội dung Tuyển dụng': {
            component: ReferralContentManagementPage,
            permissions: [Permission.SETTINGS_SYSTEM_EDIT],
            props: {}
        },
        'Quản lý Tiện ích': {
            component: IntegrationsManagementPage,
            permissions: [Permission.SETTINGS_SYSTEM_EDIT],
            props: {}
        },
        'Nhật ký Hoạt động': {
            component: ActivityLogPage,
            permissions: [Permission.USER_VIEW], 
            props: {}
        },
        'Lịch sử Thông báo': {
            component: NotificationHistoryPage,
            permissions: [],
            props: { onNavigate: handleNavigate }
        },
        'Đồng bộ GitHub': {
            component: GitHubSyncPage,
            permissions: [Permission.SETTINGS_SYSTEM_EDIT],
            props: {}
        },
        'Cài đặt': {
            component: SettingsPage,
            permissions: [Permission.SETTINGS_SYSTEM_VIEW],
            props: {}
        }
    };


    const renderContent = () => {
        // Chuẩn hóa tên trang để lookup (loại bỏ hoa thường và khoảng trắng thừa)
        const normalizedCurrentPage = (currentPage || '').trim().toLowerCase().normalize('NFC');
        
        const configKey = Object.keys(pageConfig).find(k => 
            k.trim().toLowerCase().normalize('NFC') === normalizedCurrentPage
        ) as keyof typeof pageConfig;

        const config = pageConfig[configKey] || pageConfig['Bảng điều khiển'];
        
        const isProductionDeployed = !window.location.hostname.includes('run.app') && !window.location.hostname.includes('localhost');
        if (currentPage === 'Đồng bộ GitHub' && isProductionDeployed) {
            return <AccessDenied />;
        }
        
        if (config.permissions.length > 0 && !config.permissions.some(p => hasPermission(p))) {
            return <AccessDenied />;
        }
        
        const PageComponent = config.component;

        return (
            <div className="page-enter-active">
                <Suspense fallback={<PageLoader />}>
                    <PageComponent {...config.props} />
                </Suspense>
            </div>
        );
    };

    return (
        <DashboardLayout
            role="admin"
            currentPage={currentPage}
            onNavigate={handleNavigate}
        >
            {renderContent()}

            <button
                onClick={() => setIsAssistantOpen(prev => !prev)}
                className="fixed bottom-8 right-8 z-[60] p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500"
                aria-label={isAssistantOpen ? "Đóng Trợ lý AI" : "Mở Trợ lý AI"}
            >
                {isAssistantOpen ? <XMarkIcon className="h-6 w-6" /> : <SparklesIcon className="h-6 w-6" />}
            </button>

             <GeminiAiAssistant
                isOpen={isAssistantOpen}
                onClose={() => setIsAssistantOpen(false)}
                onAction={onAction}
                users={users}
                transactions={transactions}
                fundStatus={fundStatus}
                withdrawalRequests={withdrawalRequests as WithdrawalRequest[]}
                systemSettings={systemSettings}
            />
        </DashboardLayout>
    );
};

export default AdminDashboard;
