/**
 * Simzzy backend — support module barrel.
 * Customer-facing ticket flow (create, list mine, view mine, reply).
 */
export {
  TICKET_CATEGORIES,
  createTicket,
  listMyTickets,
  getMyTicket,
  addMyTicketMessage,
} from './service'

export type {
  TicketCategory,
  TicketSummaryDto,
  TicketMessageDto,
  TicketDetailDto,
  CreateTicketInput,
} from './service'
