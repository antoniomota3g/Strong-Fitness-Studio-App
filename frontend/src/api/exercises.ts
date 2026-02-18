import { apiFetch } from './client'

export type Exercise = {
  id: number
  name: string
  category?: string | null
  muscle_groups?: string | null
  equipment?: string | null
  difficulty?: string | null
  description?: string | null
  instructions?: string | null
  video_url?: string | null
  created_at?: string | null
}

export type ExerciseCreate = Omit<Exercise, 'id' | 'created_at'>

export async function listExercises() {
  return apiFetch<Exercise[]>('/exercises')
}

export async function createExercise(payload: ExerciseCreate) {
  return apiFetch<{ id: number }>('/exercises', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateExercise(id: number, payload: Partial<ExerciseCreate>) {
  return apiFetch<{ updated: boolean }>(`/exercises/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })
}

export async function deleteExercise(id: number) {
  return apiFetch<{ deleted: boolean }>(`/exercises/${id}`, { method: 'DELETE' })
}
