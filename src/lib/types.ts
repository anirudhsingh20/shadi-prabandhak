export type RsvpStatus = 'confirmed' | 'pending' | 'declined'
export type GuestSide = 'bride' | 'groom' | 'common'
export type VendorStatus = 'booked' | 'shortlisted'
export type ChecklistStatus = 'done' | 'next' | 'later'
export type BudgetPaymentStatus = 'done' | 'pending' | 'may_come'
export interface Wedding {
  id: string
  bride_name: string
  groom_name: string
  wedding_date: string
  money_in_bank: number
  total_budget: number
  created_at: string
}

export interface Event {
  id: string
  wedding_id: string
  name: string
  event_date: string
  time_label: string | null
  venue: string | null
  tag: string | null
  sort_order: number
}

export interface Guest {
  id: string
  wedding_id: string
  name: string
  side: GuestSide
  rsvp_status: RsvpStatus
  headcount: number
  events_attending: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BudgetCategory {
  id: string
  wedding_id: string
  name: string
  allocated: number
  spent: number
  sort_order: number
}

export interface BudgetPayment {
  id: string
  wedding_id: string
  category_id: string | null
  title: string
  amount: number
  status: BudgetPaymentStatus
  due_date: string | null
  notes: string | null
  created_at: string
}

export interface Vendor {
  id: string
  wedding_id: string
  type: string
  name: string
  phone: string | null
  email: string | null
  notes: string | null
  status: VendorStatus
}

export interface ChecklistItem {
  id: string
  wedding_id: string
  group_label: string
  title: string
  due_label: string | null
  status: ChecklistStatus
  sort_order: number
}

export interface Decision {
  id: string
  wedding_id: string
  decision_date: string
  text: string
  created_at: string
}

/** tldraw document snapshot stored in idea_boards.state.document */
export interface IdeaBoard {
  wedding_id: string
  state: { document?: unknown }
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      weddings: { Row: Wedding; Insert: Omit<Wedding, 'created_at'> & { created_at?: string }; Update: Partial<Wedding> }
      events: { Row: Event; Insert: Omit<Event, 'id'> & { id?: string }; Update: Partial<Event> }
      guests: { Row: Guest; Insert: Omit<Guest, 'id'> & { id?: string }; Update: Partial<Guest> }
      budget_categories: { Row: BudgetCategory; Insert: Omit<BudgetCategory, 'id'> & { id?: string }; Update: Partial<BudgetCategory> }
      budget_payments: { Row: BudgetPayment; Insert: Omit<BudgetPayment, 'id' | 'created_at'> & { id?: string; created_at?: string }; Update: Partial<BudgetPayment> }
      vendors: { Row: Vendor; Insert: Omit<Vendor, 'id'> & { id?: string }; Update: Partial<Vendor> }
      checklist_items: { Row: ChecklistItem; Insert: Omit<ChecklistItem, 'id'> & { id?: string }; Update: Partial<ChecklistItem> }
      decisions: { Row: Decision; Insert: Omit<Decision, 'id' | 'created_at'> & { id?: string; created_at?: string }; Update: Partial<Decision> }
      idea_boards: { Row: IdeaBoard; Insert: IdeaBoard; Update: Partial<IdeaBoard> }
    }
  }
}
