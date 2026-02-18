import { apiFetch } from './client'

export type Athlete = {
  id: number
  first_name: string
  last_name: string
  email?: string | null
  phone?: string | null
  birth_date?: string | null
  gender?: string | null
  weight?: number | null
  height?: number | null
  fitness_level?: string | null
  goals?: string[] | null
  medical_conditions?: string | null
  created_at?: string | null
}

export type AthleteCreate = Omit<Athlete, 'id' | 'created_at'>

export async function listAthletes() {
  return apiFetch<Athlete[]>('/athletes')
}

export async function createAthlete(payload: AthleteCreate) {
  return apiFetch<{ id: number }>('/athletes', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateAthlete(id: number, payload: Partial<AthleteCreate>) {
  return apiFetch<{ updated: boolean }>(`/athletes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
}

export async function deleteAthlete(id: number) {
  return apiFetch<{ deleted: boolean }>(`/athletes/${id}`, { method: 'DELETE' })
}
