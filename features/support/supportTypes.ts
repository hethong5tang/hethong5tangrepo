import { SupportTicket, TicketCategory, TicketStatus } from "./types";
import { AdminManagedUser } from "../users/types";

export interface SupportState {
  supportTickets: SupportTicket[];
}

export type SupportAction =
  | { type: 'CREATE_TICKET'; payload: { title: string; category: TicketCategory; content: string; user: AdminManagedUser } }
  | { type: 'ADD_TICKET_REPLY'; payload: { ticketId: string; content: string; sender: 'user' | 'admin'; user: AdminManagedUser | null } }
  | { type: 'UPDATE_TICKET_STATUS'; payload: { ticketId: string; status: TicketStatus } };
