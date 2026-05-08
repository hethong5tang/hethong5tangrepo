
import React, { useState, lazy, Suspense, useEffect } from 'react';
import { useAuth } from '../features/auth/useAuth';
import { DashboardLayout } from '../components/DashboardLayout';
import PageLoader from '../components/PageLoader';
import { useSettings } from '../features/settings/useSettings';
import OnboardingTour, { TourStep } from '../components/OnboardingTour';
import { storageService } from '../services/storageService';

// Lazy load all page components
const DashboardPage = lazy(() => import('./user/DashboardPage'));
const MyNetworkPage = lazy(() => import('./user/MyNetworkPage'));
const WalletPage = lazy(() => import('./user/WalletPage'));
const AchievementsPage = lazy(() => import('./user/AchievementsPage'));
const ReferralToolsPage = lazy(() => import('./user/ReferralToolsPage'));
const UpgradePlanPage = lazy(() => import('./user/UpgradePlanPage'));
const SupportPage = lazy(() => import('./user/SupportPage'));
const ProfilePage = lazy(() => import('./user/ProfilePage'));
const SettingsPage = lazy(() => import('./user/SettingsPage'));
const NotificationHistoryPage = lazy(() => import('../pages/notifications/NotificationHistoryPage'));
const AddFundsPage = lazy(() => import('./user/AddFundsPage'));
const WithdrawPage = lazy(() => import('./user/WithdrawPage'));
const IntegrationsPage = lazy(() => import('./user/IntegrationsPage'));
const ToolRunnerPage = lazy(() => import('./user/ToolRunnerPage'));

const getPageFromHash = () => {
    try {
        return decodeURIComponent(window.location.hash.substring(1));
    } catch (e) {
        return '';
    }
};

const tourSteps: TourStep[] = [
    {
        targetId: 'nav-dashboard',
        title: 'Chào mừng bạn!',
        content: 'Đây là Bảng điều khiển trung tâm, nơi bạn có thể xem tổng quan về thu nhập và hoạt động của mình.',
    },
    {
        targetId: 'nav-wallet',
        title: 'Ví Của Tôi',
        content: 'Quản lý số dư, nạp tiền để sử dụng dịch vụ và rút tiền hoa hồng tại đây.',
    },
    {
        targetId: 'nav-tools',
        title: 'Kho Tiện Ích AI',
        content: 'Khám phá các công cụ AI mạnh mẽ như tạo ảnh, viết content, chỉnh sửa video để hỗ trợ công việc của bạn.',
    },
    {
        targetId: 'nav-referral',
        title: 'Mở rộng Mạng lưới',
        content: 'Lấy link giới thiệu và các công cụ hỗ trợ tuyển dụng để xây dựng hệ thống thu nhập thụ động.',
    },
    {
        targetId: 'header-credit',
        title: 'Ví Credit',
        content: 'Sử dụng Credit để chạy các công cụ AI cao cấp. Bạn có thể đổi từ số dư VNĐ sang Credit.',
    }
];

const UserDashboard: React.FC = () => {
  const { loggedInUser: user } = useAuth();
  const { settingsState: { systemSettings } } = useSettings();
  const [currentPage, setCurrentPage] = useState(() => getPageFromHash() || 'Bảng điều khiển');
  const [isTourOpen, setIsTourOpen] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
        setCurrentPage(getPageFromHash() || 'Bảng điều khiển');
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
        window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);
  
  useEffect(() => {
      // Check if user has seen the tour
      const checkTour = async () => {
          if (user) {
              const hasSeenTour = await storageService.getAsync(`hasSeenTour_${user.id}`, null);
              if (!hasSeenTour) {
                  // Small delay to ensure UI is rendered
                  setTimeout(() => setIsTourOpen(true), 1000);
              }
          }
      };
      checkTour();
  }, [user]);

  const handleTourComplete = () => {
      setIsTourOpen(false);
      if (user) {
          storageService.setAsync(`hasSeenTour_${user.id}`, 'true');
      }
  };

  const handleNavigate = (page: string) => {
    window.location.hash = page;
  };

  if (!user) {
    return null; // Safeguard: Should not happen if App.tsx logic is correct
  }
  
  const pageConfig = {
    'Bảng điều khiển': { component: DashboardPage, props: { onNavigate: handleNavigate } },
    'Mạng Lưới Của Tôi': { component: MyNetworkPage, props: {} },
    'Ví Của Tôi': { component: WalletPage, props: { onNavigate: handleNavigate } },
    'Nạp tiền': { component: AddFundsPage, props: { onNavigate: handleNavigate } },
    'Rút tiền': { component: WithdrawPage, props: { onNavigate: handleNavigate } },
    'Thành Tích': { component: AchievementsPage, props: {} },
    'Công Cụ Tuyển Dụng': { component: ReferralToolsPage, props: {} },
    'Kho Tiện Ích': { component: IntegrationsPage, props: { onNavigate: handleNavigate } },
    'Nâng Cấp Gói': { component: UpgradePlanPage, props: { onNavigate: handleNavigate } },
    'Hỗ trợ': { component: SupportPage, props: {} },
    'Lịch sử Thông báo': { component: NotificationHistoryPage, props: { onNavigate: handleNavigate } },
    'Thông tin cá nhân': { component: ProfilePage, props: {} },
    'Cài đặt': { component: SettingsPage, props: {} }
  };


  const renderContent = () => {
    const hashParts = currentPage.split('/');
    const isToolRunnerPage = hashParts[0] === 'Kho Tiện Ích' && hashParts.length > 1;
    
    // Handle Tool Runner page routing
    if (isToolRunnerPage) {
        const toolId = hashParts[1];
        const tool = systemSettings.integrationTools.find(t => t.id === toolId);

        if (tool) {
            return (
                <Suspense fallback={<PageLoader />}>
                    <ToolRunnerPage tool={tool} onNavigate={handleNavigate} />
                </Suspense>
            );
        }
    }

    // Default page rendering
    const pageName = hashParts[0];
    const config = pageConfig[pageName as keyof typeof pageConfig] || pageConfig['Bảng điều khiển'];
    const PageComponent = config.component;

    return (
        <div className="page-enter-active">
            <Suspense fallback={<PageLoader />}>
                <PageComponent {...config.props} />
            </Suspense>
        </div>
    );
  };
  
  const mainPageForSidebar = currentPage.split('/')[0];
  const isToolRunnerPage = mainPageForSidebar === 'Kho Tiện Ích' && currentPage.split('/').length > 1;

  return (
    <DashboardLayout 
        role="user" 
        currentPage={mainPageForSidebar} 
        onNavigate={handleNavigate} 
        user={user} 
        fullWidth={isToolRunnerPage}
        hideSidebar={isToolRunnerPage}
    >
        {renderContent()}
        <OnboardingTour 
            steps={tourSteps} 
            isOpen={isTourOpen} 
            onClose={handleTourComplete} 
            onComplete={handleTourComplete} 
        />
    </DashboardLayout>
  );
};

export default UserDashboard;
