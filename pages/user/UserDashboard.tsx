
import React, { useState, lazy, Suspense, useEffect } from 'react';
import { useAuth } from '../../features/auth/useAuth';
import { DashboardLayout } from '../../components/DashboardLayout';
import PageLoader from '../../components/PageLoader';
import { useSettings } from '../../features/settings/useSettings';
import OnboardingTour, { TourStep } from '../../components/OnboardingTour';
import { storageService } from '../../services/storageService';

// Lazy load all page components
const DashboardPage = lazy(() => import('./DashboardPage'));
const MyNetworkPage = lazy(() => import('./MyNetworkPage'));
const WalletPage = lazy(() => import('./WalletPage'));
const AchievementsPage = lazy(() => import('./AchievementsPage'));
const ReferralToolsPage = lazy(() => import('./ReferralToolsPage'));
const UpgradePlanPage = lazy(() => import('./UpgradePlanPage'));
const SupportPage = lazy(() => import('./SupportPage'));
const ProfilePage = lazy(() => import('./ProfilePage'));
const SettingsPage = lazy(() => import('./SettingsPage'));
const NotificationHistoryPage = lazy(() => import('../notifications/NotificationHistoryPage'));
const AddFundsPage = lazy(() => import('./AddFundsPage'));
const WithdrawPage = lazy(() => import('./WithdrawPage'));
const IntegrationsPage = lazy(() => import('./IntegrationsPage'));
const ToolRunnerPage = lazy(() => import('./ToolRunnerPage'));

const getPageFromHash = () => {
    try {
        return decodeURIComponent(window.location.hash.substring(1));
    } catch (e) {
        return '';
    }
};

// Cập nhật targetId để logic thông minh trong OnboardingTour có thể tự tìm phần tử Desktop/Mobile phù hợp
const tourSteps: TourStep[] = [
    {
        targetId: 'nav-dashboard',
        title: 'Chào mừng bạn!',
        content: 'Đây là Bảng điều khiển trung tâm, nơi bạn có thể xem tổng quan về thu nhập và hoạt động của mình nhanh chóng nhất.',
    },
    {
        targetId: 'nav-wallet',
        title: 'Ví Của Tôi',
        content: 'Nơi quản lý tất cả nguồn tiền. Bạn có thể nạp tiền để sử dụng AI hoặc rút chiết khấu về tài khoản ngân hàng tại đây.',
    },
    {
        targetId: 'nav-tools',
        title: 'Kho Tiện Ích AI',
        content: 'Khám phá thế giới AI mạnh mẽ: Tạo ảnh, viết content, thiết kế nội thất... Tất cả công cụ pro đều hội tụ ở đây.',
    },
    {
        targetId: 'nav-referral',
        title: 'Xây dựng Mạng lưới',
        content: 'Lấy link giới thiệu và các mẫu tin nhắn soạn sẵn để chia sẻ cho bạn bè và nhận chiết khấu thụ động lên tới 10 tầng.',
    },
    {
        targetId: 'header-credit',
        title: 'Ví Credit',
        content: 'Credit là đơn vị dùng để chạy các tiện ích AI. Bạn có thể đổi từ số dư VNĐ sang Credit bất cứ lúc nào.',
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
      // Kiểm tra xem người dùng đã xem hướng dẫn chưa
      const checkTour = async () => {
          if (user) {
              const hasSeenTour = await storageService.getAsync(`hasSeenTour_${user.id}`, null);
              if (!hasSeenTour) {
                  // Trì hoãn một chút để đảm bảo DOM đã render xong
                  setTimeout(() => setIsTourOpen(true), 1500);
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
    return null;
  }
  
  const pageConfig: any = {
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

    const pageName = hashParts[0];
    const subPage = hashParts[1];

    // Chuẩn hóa tên trang để lookup (loại bỏ hoa thường và khoảng trắng thừa)
    const normalizedPageName = (pageName || '').trim().toLowerCase().normalize('NFC');
    
    const configKey = Object.keys(pageConfig).find(k => 
        k.trim().toLowerCase().normalize('NFC') === normalizedPageName
    ) as keyof typeof pageConfig;

    const config = pageConfig[configKey] || pageConfig['Bảng điều khiển'];
    const PageComponent = config.component;

    // Special handling for certain pages to pass subPage as initialTab
    let customProps = { ...config.props };
    
    // Explicitly check for Settings page by many possible names/keys
    const isSettings = 
        configKey === 'Cài đặt' || 
        normalizedPageName === 'cài đặt' || 
        (typeof PageComponent === 'object' && 'displayName' in PageComponent && PageComponent.displayName === 'SettingsPage');
    
    if (isSettings && subPage) {
        customProps.initialTab = subPage;
    }

    return (
        <div className="page-enter-active" key={`${String(configKey)}-${subPage || 'root'}`}>
            <Suspense fallback={<PageLoader />}>
                <PageComponent {...customProps} />
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
