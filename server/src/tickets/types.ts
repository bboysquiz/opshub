export type TicketStatus = 'open' | 'in_progress' | 'resolved';
export type TicketPriority = 'low' | 'medium' | 'high';

export type TicketRow = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  created_by: string | null;
  created_by_email: string | null;
  assigned_to: string | null;
  assigned_to_email: string | null;
  updated_at: Date | string;
  created_at: Date | string;
};

export type TicketDto = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdBy: string | null;
  createdByEmail: string | null;
  assignedTo: string | null;
  assignedToEmail: string | null;
  updatedAt: Date | string;
  createdAt: Date | string;
};

export type CreateTicketInput = {
  title: string;
  description: string;
  priority: TicketPriority;
  assignedTo?: string;
};

export type UpdateTicketInput = {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string | null;
};
