import { z } from 'zod'

export const loginPasswordSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

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
  side: z.enum(['bride', 'groom']),
  rsvp_status: z.enum(['confirmed', 'pending', 'declined']),
  events_attending: z.string().optional(),
  dietary: z.string().optional(),
  notes: z.string().optional(),
})

export const budgetCategorySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  allocated: z.coerce.number().min(0, 'Must be 0 or more'),
  spent: z.coerce.number().min(0, 'Must be 0 or more'),
  sort_order: z.coerce.number().int().min(0).default(0),
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

export type LoginPasswordInput = z.infer<typeof loginPasswordSchema>
export type LoginMagicLinkInput = z.infer<typeof loginMagicLinkSchema>
export type EventInput = z.infer<typeof eventSchema>
export type GuestInput = z.infer<typeof guestSchema>
export type BudgetCategoryInput = z.infer<typeof budgetCategorySchema>
export type VendorInput = z.infer<typeof vendorSchema>
export type ChecklistItemInput = z.infer<typeof checklistItemSchema>
export type DecisionInput = z.infer<typeof decisionSchema>
