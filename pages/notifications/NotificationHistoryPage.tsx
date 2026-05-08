import React, { useMemo, useState } from 'react';
import { BellIcon, CheckIcon, ArrowTopRightOnSquareIcon, MagnifyingGlassIcon, XCircleIcon, ArrowPathIcon } from '../../components/Icons';
import { useAuth } from '../../features/auth/useAuth';
import { useNotification } from '../../features/notifications/useNotification';
import { useActions } from '../../features/actions/useActions';
import { Notification } from '../../features/notifications/types';

interface NotificationHistoryPageProps {
    onNavigate: (page: string) => void;
}

// Define categories for filtering
enum NotificationCategory {
    Finance = 'finance',
    User = 'user',
    Support = 'support',
    System = 'system',
}

const categoryLabels: Record<NotificationCategory, string> = {
    [NotificationCategory.Finance]: 'Tài chính',
    [NotificationCategory.User]: 'Người dùng',
    [NotificationCategory.Support]: 'Hỗ trợ',
    [NotificationCategory.System]: 'Hệ thống',
};

// Function to infer category from notification content
const getNotificationCategory = (notification: Notification): NotificationCategory => {
    const message = notification.message.toLowerCase();
    const link = notification.link;

    if (message.includes('rút tiền') || message.includes('hoa hồng') || message.includes('thanh toán') || message.includes('nạp tiền') || link === 'Tài chính' || link === 'Ví Của Tôi') {
        return NotificationCategory.Finance;
    }
    if (message.includes('người dùng mới') || message.includes('đăng ký') || link === 'Quản lý người dùng') {
        return NotificationCategory.User;
    }
    if (message.includes('hỗ trợ') || link === 'Yêu cầu Hỗ trợ') {
        return NotificationCategory.Support;
    }
    return NotificationCategory.System;
};


const NotificationHistoryPage: React.FC<NotificationHistoryPageProps> = ({ onNavigate }) => {
    const { loggedInUser, userRole } = useAuth();
    const { notificationState } = useNotification();
    const { markNotificationsAsRead, markOneAsRead } = useActions();

    const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>('all');
    const [categoryFilter, setCategoryFilter] = useState<'all' | NotificationCategory>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const notifications = useMemo(() => {
        const sortedNotifications = [...notificationState.notifications].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        let baseNotifications;
        if (userRole === 'admin') {
            baseNotifications = sortedNotifications.filter(n => n.userId === 'admin' || (loggedInUser && n.userId === loggedInUser.id));
        } else {
            baseNotifications = sortedNotifications.filter(n => n.userId === loggedInUser?.id);
        }

        if (userRole !== 'admin') {
            return baseNotifications;
        }

        // Admin-specific filtering
        return baseNotifications.filter(n => {
            const searchLower = searchTerm.toLowerCase();
            const statusMatch = (readFilter === 'all') || (readFilter === 'read' && n.isRead) || (readFilter === 'unread' && !n.isRead);
            const categoryMatch = (categoryFilter === 'all') || (getNotificationCategory(n) === categoryFilter);
            const searchMatch = !searchLower || n.message.toLowerCase().includes(searchLower);
            
            return statusMatch && searchMatch && categoryMatch;
        });

    }, [notificationState.notifications, userRole, loggedInUser, readFilter, categoryFilter, searchTerm]);

    const onMarkAllRead = () => {
        if (userRole === 'admin') {
            if (loggedInUser) { // Sub-admin
                markNotificationsAsRead(loggedInUser.id);
            }
            markNotificationsAsRead('admin'); // Always mark system-wide admin notifications
        } else if (loggedInUser) { // Regular user
            markNotificationsAsRead(loggedInUser.id);
        }
    };
    
    const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);
    const isFilterActive = searchTerm !== '' || readFilter !== 'all' || categoryFilter !== 'all';
    
    const resetFilters = () => {
        setSearchTerm('');
        setReadFilter('all');
        setCategoryFilter('all');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Lịch sử Thông báo ({notifications.length})</h2>
                {unreadCount > 0 && (
                    <button
                        onClick={onMarkAllRead}
                        disabled={unreadCount === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <CheckIcon className="h-4 w-4" />
                        Đánh dấu tất cả là đã đọc ({unreadCount})
                    </button>
                )}
            </div>

            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 p-6">
                {userRole === 'admin' && (
                    <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                        <div className="relative flex-grow min-w-[250px]">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input 
                                type="text" 
                                placeholder="Tìm theo nội dung..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className="block w-full pl-10 pr-10 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 dark:text-white" 
                            />
                            {searchTerm && (
                                <button type="button" onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600">
                                    <XCircleIcon className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                        <select 
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value as any)}
                            className="w-full sm:w-auto px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 dark:text-white sm:text-sm"
                        >
                            <option value="all">Tất cả Danh mục</option>
                            {Object.entries(categoryLabels).map(([key, label]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>
                        <select 
                            value={readFilter} 
                            onChange={e => setReadFilter(e.target.value as any)}
                            className="w-full sm:w-auto px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-md bg-white/50 dark:bg-slate-700/50 dark:text-white sm:text-sm"
                        >
                            <option value="all">Tất cả Trạng thái</option>
                            <option value="unread">Chưa đọc</option>
                            <option value="read">Đã đọc</option>
                        </select>
                        {isFilterActive && (
                            <button 
                                onClick={resetFilters} 
                                className="p-2 text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-600"
                            >
                                <ArrowPathIcon className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                )}
                <div className="space-y-3">
                    {notifications.length > 0 ? (
                        notifications.map(notif => (
                            <div
                                key={notif.id}
                                onClick={() => {
                                    if (!notif.isRead) {
                                        markOneAsRead(notif.id);
                                    }
                                }}
                                className={`p-4 rounded-lg flex items-start gap-4 transition-colors ${notif.isRead ? 'cursor-default' : 'cursor-pointer'} ${
                                    !notif.isRead
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700'
                                        : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                <div className="relative flex-shrink-0">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${!notif.isRead ? 'bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                        <BellIcon className="h-5 w-5" />
                                    </div>
                                    {!notif.isRead && (
                                        <span className="absolute -top-1 -right-1 block h-3 w-3 rounded-full bg-indigo-500 ring-2 ring-white dark:ring-slate-800" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm ${!notif.isRead ? 'font-semibold text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}>
                                        {notif.message}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{new Date(notif.date).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' })}</p>
                                </div>
                                {notif.link && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!notif.isRead) {
                                                markOneAsRead(notif.id);
                                            }
                                            onNavigate(notif.link!);
                                        }}
                                        className="self-center ml-auto px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600/50 flex items-center gap-1.5"
                                    >
                                        Xem chi tiết <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 text-slate-500 dark:text-slate-400">
                            <BellIcon className="h-12 w-12 mx-auto text-slate-400 mb-2" />
                            <p className="font-semibold">Không có thông báo nào</p>
                            <p className="text-sm">{isFilterActive ? 'Không tìm thấy thông báo nào khớp với bộ lọc của bạn.' : 'Tất cả thông báo của bạn sẽ được hiển thị ở đây.'}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationHistoryPage;