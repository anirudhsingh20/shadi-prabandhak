export type RsvpStatus = 'confirmed' | 'pending' | 'declined'
export type GuestSide = 'bride' | 'groom'
export type VendorStatus = 'booked' | 'shortlisted'
export type ChecklistStatus = 'done' | 'next' | 'later'

export interface Wedding {
  id: string
  bride_name: string
  groom_name: string
  wedding_date: string
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
  events_attending: string | null
  dietary: string | null
  notes: string | null
}

export interface BudgetCategory {
  id: string
  wedding_id: string
  name: string
  allocated: number
  spent: number
  sort_order: number
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

export interface Database {
  public: {
    Tables: {
      weddings: { Row: Wedding; Insert: Omit<Wedding, 'created_at'> & { created_at?: string }; Update: Partial<Wedding> }
      events: { Row: Event; Insert: Omit<Event, 'id'> & { id?: string }; Update: Partial<Event> }
      guests: { Row: Guest; Insert: Omit<Guest, 'id'> & { id?: string }; Update: Partial<Guest> }
      budget_categories: { Row: BudgetCategory; Insert: Omit<BudgetCategory, 'id'> & { id?: string }; Update: Partial<BudgetCategory> }
      vendors: { Row: Vendor; Insert: Omit<Vendor, 'id'> & { id?: string }; Update: Partial<Vendor> }
      checklist_items: { Row: ChecklistItem; Insert: Omit<ChecklistItem, 'id'> & { id?: string }; Update: Partial<ChecklistItem> }
      decisions: { Row: Decision; Insert: Omit<Decision, 'id' | 'created_at'> & { id?: string; created_at?: string }; Update: Partial<Decision> }
    }
  }
}
