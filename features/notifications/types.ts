export interface Notification {
  id: string;
  userId: string | 'admin'; // 'admin' for system-wide admin notifications
  date: string;
  message: string;
  isRead: boolean;
  link?: string; // Page to navigate to
}
