import { apiFetch } from './client'

export type PaymentSummary = {
  athlete_id: number
  athlete_first_name?: string | null
  athlete_last_name?: string | null

  plan_type?: string | null
  plan_sessions_per_week?: number | null
  plan_monthly_price?: number | null
  plan_on_demand_price?: number | null

  base_amount: number
  adjustments_total: number
  total_due: number

  status?: string | null
  paid_amount?: number | null
  paid_at?: string | null
}

export type PaymentAdjustment = {
  id: number
  athlete_id: number
  applies_month: string
  amount: number
  reason?: string | null
  related_session_id?: number | null
  created_at?: string | null
}

export async function listPayments(monthIso: string) {
  const sp = new URLSearchParams({ month: monthIso })
  return apiFetch<PaymentSummary[]>(`/payments?${sp.toString()}`)
}

export async function listPaymentAdjustments(monthIso: string, athleteId?: number) {
  const sp = new URLSearchParams({ month: monthIso })
  if (athleteId) sp.set('athlete_id', String(athleteId))
  return apiFetch<PaymentAdjustment[]>(`/payments/adjustments?${sp.toString()}`)
}

export async function createPaymentAdjustment(payload: {
  athlete_id: number
  applies_month: string
  amount: number
  reason?: string | null
  related_session_id?: number | null
}) {
  return apiFetch<{ id: number }>(`/payments/adjustments`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function deletePaymentAdjustment(id: number) {
  return apiFetch<{ deleted: boolean }>(`/payments/adjustments/${id}`, { method: 'DELETE' })
}

export async function markPaymentPaid(payload: { athlete_id: number; month: string; paid_amount?: number | null }) {
  return apiFetch<{ updated: boolean }>(`/payments/mark-paid`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function autoCreditFromCancelled(monthIso: string, athleteId?: number) {
  const sp = new URLSearchParams({ month: monthIso })
  if (athleteId) sp.set('athlete_id', String(athleteId))
  return apiFetch<{ created: number }>(`/payments/auto-credit?${sp.toString()}`, { method: 'POST' })
}
