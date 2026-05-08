export enum Permission {
  // User Management
  USER_VIEW = 'user:view',
  USER_CREATE = 'user:create',
  USER_EDIT = 'user:edit',
  USER_DELETE = 'user:delete',
  USER_MANAGE_ROLES = 'user:manage_roles',
  
  // Finance
  FINANCE_VIEW_ALL = 'finance:view_all',
  FINANCE_MANAGE_WITHDRAWALS = 'finance:manage_withdrawals',
  FINANCE_EXPORT = 'finance:export',

  // Funds
  FUNDS_VIEW = 'funds:view',
  FUNDS_MANAGE_PAYOUTS = 'funds:manage_payouts',
  FUNDS_MANAGE_SETTINGS = 'funds:manage_settings',
  
  // Settings
  SETTINGS_FEES_COMMISSIONS_VIEW = 'settings:fees_commissions_view',
  SETTINGS_FEES_COMMISSIONS_EDIT = 'settings:fees_commissions_edit',
  SETTINGS_SYSTEM_VIEW = 'settings:system_view',
  SETTINGS_SYSTEM_EDIT = 'settings:system_edit',
  SETTINGS_ACHIEVEMENTS_MANAGE = 'settings:achievements_manage',

  // Support
  SUPPORT_VIEW = 'support:view',
  SUPPORT_MANAGE_TICKETS = 'support:manage_tickets',
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
}