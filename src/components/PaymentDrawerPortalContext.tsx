import { createContext, useContext } from 'react'

export const PaymentDrawerPortalContext = createContext<HTMLElement | null>(null)

export function usePaymentDrawerPortal() {
  return useContext(PaymentDrawerPortalContext)
}
