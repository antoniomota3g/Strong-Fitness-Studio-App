import { apiFetch } from './client'

export type TrainingSession = {
  id: number
  athlete_id: number
  session_name: string
  session_date: string
  session_time: string
  duration?: number | null
  session_type?: string | null
  session_notes?: string | null
  status?: string | null
  exercises?: any[] | null
  completed_data?: any | null
  completed_at?: string | null
  created_date?: string | null

  athlete_first_name?: string | null
  athlete_last_name?: string | null
}

export type TrainingSessionCreate = {
  athlete_id: number
  session_name: string
  session_date: string
  session_time: string
  duration?: number | null
  session_type?: string | null
  session_notes?: string | null
  status?: string | null
  exercises?: any[] | null
}

export type TrainingSessionUpdate = Partial<TrainingSessionCreate> & {
  completed_data?: any | null
  completed_at?: string | null
}

export async function listTrainingSessions(params?: {
  start?: string
  end?: string
  athlete_id?: number
  status?: string
}) {
  const sp = new URLSearchParams()
  if (params?.start) sp.set('start', params.start)
  if (params?.end) sp.set('end', params.end)
  if (params?.athlete_id) sp.set('athlete_id', String(params.athlete_id))
  if (params?.status) sp.set('status', params.status)
  const qs = sp.toString()
  return apiFetch<TrainingSession[]>(`/training-sessions${qs ? `?${qs}` : ''}`)
}

export async function createTrainingSession(payload: TrainingSessionCreate) {
  return apiFetch<{ id: number }>(`/training-sessions`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateTrainingSession(id: number, payload: TrainingSessionUpdate) {
  return apiFetch<{ updated: boolean }>(`/training-sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
}

export async function deleteTrainingSession(id: number) {
  return apiFetch<{ deleted: boolean }>(`/training-sessions/${id}`, { method: 'DELETE' })
}
