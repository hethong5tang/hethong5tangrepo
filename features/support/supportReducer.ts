import { SupportTicket, TicketStatus, TicketMessage } from './types';
import { SupportAction, SupportState } from './supportTypes';

export const supportReducer = (state: SupportState, action: SupportAction): SupportState => {
  switch (action.type) {
    case 'CREATE_TICKET': {
      const { title, category, content, user } = action.payload;
      const now = new Date().toISOString();
      const newTicket: SupportTicket = {
        id: `tkt_${Date.now()}`,
        userId: user.id,
        user: { name: user.name, avatar: user.avatar },
        title,
        category,
        status: TicketStatus.New,
        createdAt: now,
        updatedAt: now,
        messages: [
          { id: `msg_${Date.now()}`, sender: 'user', content, timestamp: now, userName: user.name, userAvatar: user.avatar }
        ]
      };
      return {
        ...state,
        supportTickets: [newTicket, ...state.supportTickets],
      };
    }

    case 'ADD_TICKET_REPLY': {
      const { ticketId, content, sender, user } = action.payload;
      return {
        ...state,
        supportTickets: state.supportTickets.map(ticket => {
          if (ticket.id === ticketId) {
            const now = new Date().toISOString();
            const newMessage: TicketMessage = {
              id: `msg_${Date.now()}`,
              sender,
              content,
              timestamp: now,
            };
            if (sender === 'user' && user) {
              newMessage.userName = user.name;
              newMessage.userAvatar = user.avatar;
            } else if (sender === 'admin') {
              newMessage.userName = 'Quản trị viên';
              newMessage.userAvatar = 'https://picsum.photos/id/1/100';
            }
            return {
              ...ticket,
              messages: [...ticket.messages, newMessage],
              updatedAt: now,
              status: sender === 'admin' && ticket.status === TicketStatus.New ? TicketStatus.InProgress : ticket.status,
            };
          }
          return ticket;
        }),
      };
    }

    case 'UPDATE_TICKET_STATUS': {
      const { ticketId, status } = action.payload;
      return {
        ...state,
        supportTickets: state.supportTickets.map(ticket =>
          ticket.id === ticketId
            ? { ...ticket, status, updatedAt: new Date().toISOString() }
            : ticket
        ),
      };
    }

    default:
      return state;
  }
};