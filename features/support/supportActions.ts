
import { AdminManagedUser } from '../users/types';
import { TicketCategory, TicketStatus } from './types';

export const createSupportActions = (deps: {
    supportState: any;
    supportDispatch: any;
    notificationDispatch: any;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}) => {
    const { supportState, supportDispatch, notificationDispatch, addToast } = deps;

    const handleCreateTicket = (title: string, category: TicketCategory, content: string, user: AdminManagedUser) => {
        supportDispatch({ type: 'CREATE_TICKET', payload: { title, category, content, user } });
        notificationDispatch({type: 'ADD_NOTIFICATION', payload: { userId: 'admin', message: `Có yêu cầu hỗ trợ mới từ ${user.name}.`, link: 'Yêu cầu Hỗ trợ' }});
        addToast('Yêu cầu hỗ trợ của bạn đã được gửi!', 'success');
    };
    
    const handleAddTicketReply = (ticketId: string, content: string, sender: 'user' | 'admin', user: AdminManagedUser | null) => {
        const ticket = supportState.supportTickets.find((t: any) => t.id === ticketId);
        if(!ticket) return;
        
        supportDispatch({ type: 'ADD_TICKET_REPLY', payload: { ticketId, content, sender, user } });
    
        if (sender === 'admin') {
            notificationDispatch({ type: 'ADD_NOTIFICATION', payload: { userId: ticket.userId, message: `Admin đã trả lời yêu cầu hỗ trợ.`, link: 'Hỗ trợ' } });
        } else {
            notificationDispatch({ type: 'ADD_NOTIFICATION', payload: { userId: 'admin', message: `${ticket.user.name} đã trả lời yêu cầu hỗ trợ.`, link: 'Yêu cầu Hỗ trợ' } });
        }
        addToast('Đã gửi trả lời!', 'success');
    };
      
    const handleUpdateTicketStatus = (ticketId: string, status: TicketStatus) => {
        supportDispatch({ type: 'UPDATE_TICKET_STATUS', payload: { ticketId, status } });
        const ticket = supportState.supportTickets.find((t: any) => t.id === ticketId);
        if(!ticket) return;
    
        if (status === TicketStatus.Resolved) {
            notificationDispatch({ type: 'ADD_NOTIFICATION', payload: { userId: ticket.userId, message: `Yêu cầu hỗ trợ "${ticket.title}" đã được giải quyết.`, link: 'Hỗ trợ' } });
        }
    };

    return {
        handleCreateTicket,
        handleAddTicketReply,
        handleUpdateTicketStatus,
    };
};
