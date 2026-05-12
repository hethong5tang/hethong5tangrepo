
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Bars3Icon, BellIcon, ChartPieIcon, Cog6ToothIcon, CurrencyDollarIcon, HomeIcon, PowerIcon, UserGroupIcon, UsersIcon, XMarkIcon, UserCircleIcon, TrophyIcon, LinkIcon, CrownIcon, ReceiptPercentIcon, BanknotesIcon, LifebuoyIcon, SparklesIcon, TableCellsIcon, ShieldCheckIcon, ArrowDownCircleIcon, ArrowUpCircleIcon, ChartBarIcon, DocumentMagnifyingGlassIcon, Squares2X2Icon, CpuChipIcon, BoltIcon } from './Icons';
import { MembershipTier, AdminManagedUser, UserStatus } from '../features/users/types';
import { Notification } from '../features/notifications/types';
import { Permission } from '../features/roles/types';
import { useToast } from './ToastProvider';
import { useAuth } from '../features/auth/useAuth';
import { useNotification } from '../features/notifications/useNotification';
import { useLandingPageContent } from '../features/landing/useLandingPageContent';
import { SocialProofToasts } from './SocialProofToasts';
import LogoDisplay from './LogoDisplay';
import { useActions } from '../features/actions/useActions';
import { RankLevelBadge } from './Badges';
import LevelUpModal from './LevelUpModal';
import { ThemeToggle } from './ThemeToggle';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: 'admin' | 'user';
  currentPage: string;
  onNavigate: (page: string) => void;
  user?: AdminManagedUser;
  fullWidth?: boolean;
  hideSidebar?: boolean;
}

const userNavItems = [
  { name: 'Bảng điều khiển', href: '#', icon: HomeIcon, id: 'dashboard' },
  { name: 'Mạng Lưới Của Tôi', href: '#', icon: UsersIcon, id: 'network' },
  { name: 'Ví Của Tôi', href: '#', icon: BanknotesIcon, id: 'wallet' },
  { name: 'Nạp tiền', href: '#', icon: ArrowDownCircleIcon, id: 'deposit' },
  { name: 'Rút tiền', href: '#', icon: ArrowUpCircleIcon, id: 'withdraw' },
  { name: 'Thành Tích', href: '#', icon: TrophyIcon, id: 'achievements' },
  { name: 'Công Cụ Tuyển Dụng', href: '#', icon: LinkIcon, id: 'referral' },
  { name: 'Kho Tiện Ích', href: '#', icon: Squares2X2Icon, id: 'tools' },
  { name: 'Nâng Cấp Gói', href: '#', icon: CrownIcon, id: 'upgrade' },
  { name: 'Hỗ trợ', href: '#', icon: LifebuoyIcon, id: 'support' },
  { name: 'Lịch sử Thông báo', href: '#', icon: BellIcon, id: 'history' },
  { name: 'Thông tin cá nhân', href: '#', icon: UserCircleIcon, id: 'profile' },
  { name: 'Cài đặt', href: '#', icon: Cog6ToothIcon, id: 'settings' },
];

const baseAdminNavItems = [
  { name: 'Bảng điều khiển', href: '#', icon: HomeIcon, permission: null, id: 'admin-dashboard' },
  { name: 'Quản lý người dùng', href: '#', icon: UsersIcon, permission: Permission.USER_VIEW, id: 'admin-users' },
  { name: 'Tài chính', href: '#', icon: CurrencyDollarIcon, permission: Permission.FINANCE_VIEW_ALL, id: 'admin-finance' },
  { name: 'Thống kê API', href: '#', icon: BoltIcon, permission: Permission.SETTINGS_SYSTEM_VIEW, id: 'admin-api-stats' },
  { name: 'Yêu cầu Hỗ trợ', href: '#', icon: LifebuoyIcon, permission: Permission.SUPPORT_VIEW, id: 'admin-support' },
  { name: 'Quản lý Quỹ', href: '#', icon: ChartPieIcon, permission: Permission.FUNDS_VIEW, id: 'admin-funds' },
  { name: 'Quản lý Vai trò', href: '#', icon: ShieldCheckIcon, permission: Permission.USER_MANAGE_ROLES, id: 'admin-roles' },
  { name: 'Phí & Chiết khấu', href: '#', icon: ReceiptPercentIcon, permission: Permission.SETTINGS_FEES_COMMISSIONS_VIEW, id: 'admin-fees' },
  { name: 'Quản lý Cấp bậc', href: '#', icon: TrophyIcon, permission: Permission.SETTINGS_ACHIEVEMENTS_MANAGE, id: 'admin-levels' },
  { name: 'Quản lý Thành tích', href: '#', icon: TrophyIcon, permission: Permission.SETTINGS_ACHIEVEMENTS_MANAGE, id: 'admin-achievements' },
  { name: 'Quản lý Bảng xếp hạng', href: '#', icon: ChartBarIcon, permission: Permission.SETTINGS_ACHIEVEMENTS_MANAGE, id: 'admin-leaderboard' },
  { name: 'Quản lý Trang chủ', href: '#', icon: TableCellsIcon, permission: Permission.SETTINGS_SYSTEM_EDIT, id: 'admin-landing' },
  { name: 'Nội dung Tuyển dụng', href: '#', icon: LinkIcon, permission: Permission.SETTINGS_SYSTEM_EDIT, id: 'admin-referral-content' },
  { name: 'Quản lý Tiện ích', href: '#', icon: CpuChipIcon, permission: Permission.SETTINGS_SYSTEM_EDIT, id: 'admin-tools' },
  { name: 'Nhật ký Hoạt động', href: '#', icon: DocumentMagnifyingGlassIcon, permission: Permission.USER_VIEW, id: 'admin-logs' },
  { name: 'Lịch sử Thông báo', href: '#', icon: BellIcon, permission: null, id: 'admin-notifs' },
  { name: 'Đồng bộ GitHub', href: '#', icon: CpuChipIcon, permission: Permission.SETTINGS_SYSTEM_EDIT, id: 'admin-github-sync' },
  { name: 'Cài đặt', href: '#', icon: Cog6ToothIcon, permission: Permission.SETTINGS_SYSTEM_VIEW, id: 'admin-settings' },
];


const TierBadge: React.FC<{ tier: MembershipTier }> = ({ tier }) => {
    if (tier === MembershipTier.Starter) return null;

    const styles = {
        [MembershipTier.Pro]: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
        [MembershipTier.Master]: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
        [MembershipTier.Starter]: '', 
        [MembershipTier.None]: '',
    };

    return (
        <span className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${styles[tier]}`}>
            <CrownIcon className="h-3 w-3" />
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
        </span>
    );
};

interface SidebarContentProps {
    navigation: { name: string; href: string; icon: React.FC<{ className?: string }>; id?: string }[];
    currentPage: string;
    onNavigate: (page: string) => void;
    onLogout: () => void;
    user?: AdminManagedUser;
    idPrefix: string;
}

const SidebarContent: React.FC<SidebarContentProps> = ({ navigation, currentPage, onNavigate, onLogout, user, idPrefix }) => {
    const { state: { content } } = useLandingPageContent();
    const logoProps = {
        logoUrl: content.hero.logoUrl,
        logoText: content.hero.logoText,
        useWideLogo: content.hero.useWideLogo,
        logoObjectPosition: content.hero.logoObjectPosition,
    };
    
    const isOverdue = !!(user && user.nextMaintenanceDate && new Date() > new Date(user.nextMaintenanceDate));
    const isStatusRestricted = user && user.status !== UserStatus.Active;
    const isWithdrawalDisabled = isStatusRestricted || isOverdue;

    return (
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-slate-900 px-6 pb-4">
            <div className="flex h-16 shrink-0 items-center">
                <button onClick={() => onNavigate('Bảng điều khiển')} className="flex items-center gap-2 text-left transition-opacity hover:opacity-80">
                    <LogoDisplay {...logoProps} />
                </button>
            </div>
            <nav className="flex flex-1 flex-col">
                <ul role="list" className="flex flex-1 flex-col gap-y-7">
                    <li>
                        <ul role="list" className="-mx-2 space-y-1">
                            {navigation.map((item) => {
                                const isDisabled = item.name === 'Rút tiền' && isWithdrawalDisabled;
                                return (
                                <li key={item.name} id={item.id ? `${idPrefix}${item.id}` : undefined}>
                                    <a href={item.href} 
                                       title={isDisabled ? "Chức năng bị tạm khóa do tài khoản bị hạn chế hoặc nợ phí" : ""}
                                       onClick={(e) => { 
                                           e.preventDefault(); 
                                           if (!isDisabled) onNavigate(item.name); 
                                       }}
                                       aria-disabled={isDisabled}
                                       className={`${item.name === currentPage ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'} ${isDisabled ? 'opacity-40 cursor-not-allowed grayscale' : ''} group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-all`}>
                                        <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                        {item.name}
                                    </a>
                                </li>
                            )})}
                        </ul>
                    </li>
                     <li className="mt-auto">
                        <a onClick={(e) => { e.preventDefault(); onLogout(); }} href="#" className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-slate-400 hover:bg-slate-800 hover:text-white">
                            <PowerIcon className="h-6 w-6 shrink-0" aria-hidden="true" />
                            Đăng xuất
                        </a>
                    </li>
                </ul>
            </nav>
        </div>
      );
};
export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, role, currentPage, onNavigate, user, fullWidth = false, hideSidebar = false }) => {
  const { handleLogout: onLogout, hasPermission, loggedInUser } = useAuth();
  const { markNotificationsAsRead, clearLevelUpNotification, handleShowLevelUpNotification } = useActions();
  const { notificationState } = useNotification();
  const { state: { content } } = useLandingPageContent();
  
  useEffect(() => {
    if (role === 'user' && user && user.pendingLevelUpInfo) {
        handleShowLevelUpNotification(user.pendingLevelUpInfo.levelName);
    }
  }, [user, role, handleShowLevelUpNotification]);
  
  const notifications = useMemo(() => {
    const userId = role === 'admin' ? (loggedInUser?.id || 'admin') : user?.id;
    if (!userId) return [];
    return notificationState.notifications
      .filter(n => n.userId === userId || (role === 'admin' && n.userId === 'admin'))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [notificationState.notifications, role, user, loggedInUser]);
  
  const onMarkNotificationsAsRead = () => {
    if (role === 'admin') {
      if (loggedInUser) {
        markNotificationsAsRead(loggedInUser.id);
      }
      markNotificationsAsRead('admin');
    } else if (user?.id) { 
      markNotificationsAsRead(user.id);
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();
  
  const adminNav = useMemo(() => {
    let items = baseAdminNavItems.filter(item => !item.permission || hasPermission(item.permission));
    
    // Hide GitHub Sync outside AI Studio (Vercel, custom domains, etc)
    const isProductionDeployed = !window.location.hostname.includes('run.app') && !window.location.hostname.includes('localhost');
    if (isProductionDeployed) {
        items = items.filter(item => item.id !== 'admin-github-sync');
    }
    
    return items;
  }, [hasPermission]);

  const navigation = role === 'admin' ? adminNav : userNavItems;
  const userName = role === 'admin' ? (loggedInUser?.name || "Quản trị viên Cấp cao") : (user?.name || "Thành viên");
  const userAvatar = role === 'admin' ? (loggedInUser?.avatar || 'https://picsum.photos/id/1/100') : (user?.avatar || "");
  const userTier = role === 'user' ? user?.membershipTier : (loggedInUser?.membershipTier || null);
  const rankLevel = user?.rankLevel;


  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
            setIsNotifOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSidebarNavigate = (page: string) => {
      onNavigate(page);
      setSidebarOpen(false);
  };

  const handleNotificationClick = (notification: Notification) => {
      if (notification.link) {
          onNavigate(notification.link);
      }
      onMarkNotificationsAsRead();
      setIsNotifOpen(false);
  };
  
  const handleMarkAllRead = (e: React.MouseEvent) => {
      e.stopPropagation();
      onMarkNotificationsAsRead();
      addToast('Đã đánh dấu tất cả là đã đọc.', 'success');
  }
  
  const showNavigation = !hideSidebar;

  return (
    <div className="h-full">
        {/* Mobile sidebar */}
        {showNavigation && (
          <div className={`relative z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`} role="dialog" aria-modal="true">
              <div className="fixed inset-0 bg-gray-900/80" onClick={() => setSidebarOpen(false)}></div>
              <div className="fixed inset-0 flex">
                  <div className="relative mr-16 flex w-full max-w-xs flex-1">
                      <div className="absolute left-full top-0 flex w-16 justify-center pt-5">
                          <button type="button" className="-m-2.5 p-2.5" onClick={() => setSidebarOpen(false)}>
                              <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
                          </button>
                      </div>
                      <SidebarContent navigation={navigation} currentPage={currentPage} onNavigate={handleSidebarNavigate} onLogout={onLogout} user={user} idPrefix="m-nav-" />
                  </div>
              </div>
          </div>
        )}

        {/* Static sidebar for desktop */}
        {showNavigation && (
            <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:w-72 lg:flex lg:flex-col">
                <SidebarContent navigation={navigation} currentPage={currentPage} onNavigate={onNavigate} onLogout={onLogout} user={user} idPrefix="nav-" />
            </div>
        )}

        <div className={`${showNavigation ? 'lg:pl-72' : ''} flex flex-col h-screen`}>
            {showNavigation && (
              <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
                  <button type="button" className="-m-2.5 p-2.5 text-gray-700 dark:text-gray-200 lg:hidden" onClick={() => setSidebarOpen(true)}>
                      <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                  </button>

                  <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-end">
                      <div className="flex items-center gap-x-4 lg:gap-x-6">
                          <ThemeToggle />
                          {user && (
                              <div className="hidden sm:flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-800" id="header-credit">
                                  <SparklesIcon className="h-5 w-5 text-yellow-500" />
                                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                      {user.creditBalance.toLocaleString('vi-VN')}
                                  </span>
                                  <span className="text-sm text-slate-500 dark:text-slate-400">Credit</span>
                              </div>
                          )}
                          <div className="relative" ref={notifRef}>
                            <button type="button" onClick={() => setIsNotifOpen(prev => !prev)} className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200">
                                <BellIcon className="h-6 w-6" aria-hidden="true" />
                                {unreadCount > 0 && (
                                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-semibold text-white ring-2 ring-white dark:ring-slate-900">
                                    {unreadCount}
                                  </span>
                                )}
                            </button>

                            {isNotifOpen && (
                              <div 
                                className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none"
                              >
                                <div className="p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
                                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">Thông báo</h4>
                                  {unreadCount > 0 && (
                                    <button onClick={handleMarkAllRead} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                                      Đánh dấu đã đọc tất cả
                                    </button>
                                  )}
                                </div>
                                <div className="max-h-96 overflow-y-auto">
                                  {notifications.length > 0 ? (
                                    notifications.slice(0, 10).map(notif => (
                                      <div 
                                        key={notif.id} 
                                        onClick={() => handleNotificationClick(notif)} 
                                        className={`p-4 border-b border-slate-200/50 dark:border-slate-700/50 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer ${!notif.isRead ? 'bg-indigo-50/30 dark:bg-indigo-900/20' : ''}`}
                                      >
                                        {!notif.isRead && <div className="mt-1.5 h-2 w-2 rounded-full bg-indigo-50 flex-shrink-0"></div>}
                                        <div className={`flex-1 ${!notif.isRead ? '' : 'pl-5'}`}>
                                          <p className="text-sm text-slate-800 dark:text-slate-300">{notif.message}</p>
                                          <p className="text-xs text-slate-500 mt-1">{notif.date}</p>
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="p-8 text-center text-sm text-slate-500">Bạn không có thông báo nào.</p>
                                  )}
                                </div>
                                 <div className="p-2 border-t border-slate-200 dark:border-slate-700">
                                  <button
                                    onClick={() => {
                                      onNavigate('Lịch sử Thông báo');
                                      setIsNotifOpen(false);
                                    }}
                                    className="w-full text-center text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-md py-2"
                                  >
                                    Xem tất cả thông báo
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-x-4">
                              <img className="h-8 w-8 rounded-full bg-gray-50" src={userAvatar} alt="" />
                              <span className="hidden lg:flex lg:items-center">
                                  <span className="text-sm font-semibold leading-6 text-gray-900 dark:text-gray-200" aria-hidden="true">{userName}</span>
                                  {rankLevel !== undefined && <RankLevelBadge level={rankLevel} />}
                                  {userTier && <TierBadge tier={userTier} />}
                              </span>
                          </div>
                      </div>
                  </div>
              </div>
            )}
            <main className={`flex-grow ${fullWidth ? 'overflow-hidden' : 'py-10 overflow-y-auto'}`}>
                <div className={fullWidth ? 'h-full' : 'px-4 sm:px-6 lg:px-8'}>{children}</div>
            </main>
        </div>
        {role === 'user' && content.socialProof?.enabled && <SocialProofToasts />}
        {notificationState.levelUpInfo && (
            <LevelUpModal
                isOpen={!!notificationState.levelUpInfo}
                onClose={clearLevelUpNotification}
                levelName={notificationState.levelUpInfo.levelName}
            />
        )}
    </div>
  );
};
