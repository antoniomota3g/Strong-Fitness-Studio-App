import { apiFetch } from './client'

export type Evaluation = {
  id: number
  athlete_id: number
  evaluation_date: string
  weight?: number | null
  muscle_percentage?: number | null
  fat_percentage?: number | null
  bone_percentage?: number | null
  water_percentage?: number | null
  notes?: string | null
  created_date?: string | null
  athlete_first_name?: string | null
  athlete_last_name?: string | null
}

export type EvaluationCreate = Omit<Evaluation, 'id' | 'created_date' | 'athlete_first_name' | 'athlete_last_name'>

export type EvaluationUpdate = Partial<EvaluationCreate>

export async function listEvaluations(params?: { athlete_id?: number; start?: string; end?: string }) {
  const sp = new URLSearchParams()
  if (params?.athlete_id) sp.set('athlete_id', String(params.athlete_id))
  if (params?.start) sp.set('start', params.start)
  if (params?.end) sp.set('end', params.end)
  const qs = sp.toString()
  return apiFetch<Evaluation[]>(`/evaluations${qs ? `?${qs}` : ''}`)
}

export async function createEvaluation(payload: EvaluationCreate) {
  return apiFetch<{ id: number }>(`/evaluations`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function deleteEvaluation(id: number) {
  return apiFetch<{ deleted: boolean }>(`/evaluations/${id}`, { method: 'DELETE' })
}

export async function updateEvaluation(id: number, payload: EvaluationUpdate) {
  return apiFetch<{ updated: boolean }>(`/evaluations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
}
