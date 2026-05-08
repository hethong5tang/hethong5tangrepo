export enum TicketStatus {
  New = 'new',
  InProgress = 'in_progress',
  Resolved = 'resolved',
}

export enum TicketCategory {
  Finance = 'finance', // Vấn đề Nạp/Rút tiền
  Technical = 'technical', // Lỗi Kỹ thuật
  Commission = 'commission', // Hỏi về Hoa hồng
  Other = 'other', // Khác
}

export interface TicketMessage {
  id: string;
  sender: 'user' | 'admin';
  content: string;
  timestamp: string;
  userName?: string;
  userAvatar?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  user: {
    name: string;
    avatar: string;
  };
  title: string;
  category: TicketCategory;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}
