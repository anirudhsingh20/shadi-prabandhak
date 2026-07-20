import { z } from 'zod'

export const loginMagicLinkSchema = z.object({
  email: z.string().email('Enter a valid email'),
})

export const eventSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  event_date: z.string().min(1, 'Date is required'),
  time_label: z.string().optional(),
  venue: z.string().optional(),
  tag: z.string().optional(),
  sort_order: z.coerce.number().int().min(0).default(0),
})

export const guestSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  side: z.enum(['bride', 'groom', 'common']),
  rsvp_status: z.enum(['confirmed', 'pending', 'declined']),
  headcount: z.coerce.number().int().min(1, 'At least 1').max(99),
  events_attending: z.string().optional(),
  notes: z.string().optional(),
})

export const budgetCategorySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  allocated: z.coerce.number().min(0, 'Must be 0 or more'),
  sort_order: z.coerce.number().int().min(0).default(0),
})

export const moneyInBankSchema = z.object({
  money_in_bank: z.coerce.number().min(0, 'Must be 0 or more'),
})

export const totalBudgetSchema = z.object({
  total_budget: z.coerce.number().min(0, 'Must be 0 or more'),
})

export const budgetPaymentSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  amount: z.coerce.number().min(0, 'Must be 0 or more'),
  status: z.enum(['done', 'pending', 'may_come']),
  category_id: z.string().uuid().optional().or(z.literal('')),
  due_date: z.string().optional(),
  notes: z.string().optional(),
})

export const vendorSchema = z.object({
  type: z.string().min(2, 'Type is required'),
  name: z.string().min(2, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  notes: z.string().optional(),
  status: z.enum(['booked', 'shortlisted']),
})

export const checklistItemSchema = z.object({
  group_label: z.string().min(2, 'Group is required'),
  title: z.string().min(2, 'Title is required'),
  due_label: z.string().optional(),
  status: z.enum(['done', 'next', 'later']),
  sort_order: z.coerce.number().int().min(0).default(0),
})

export const decisionSchema = z.object({
  decision_date: z.string().min(1, 'Date is required'),
  text: z.string().min(3, 'Note must be at least 3 characters'),
})

export type LoginMagicLinkInput = z.infer<typeof loginMagicLinkSchema>
export type EventInput = z.infer<typeof eventSchema>
export type GuestInput = z.infer<typeof guestSchema>
export type BudgetCategoryInput = z.infer<typeof budgetCategorySchema>
export type MoneyInBankInput = z.infer<typeof moneyInBankSchema>
export type TotalBudgetInput = z.infer<typeof totalBudgetSchema>
export type BudgetPaymentInput = z.infer<typeof budgetPaymentSchema>
export type VendorInput = z.infer<typeof vendorSchema>
export type ChecklistItemInput = z.infer<typeof checklistItemSchema>
export type DecisionInput = z.infer<typeof decisionSchema>
