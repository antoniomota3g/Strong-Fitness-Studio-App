import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  LinearProgress,
  Skeleton,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import StopIcon from '@mui/icons-material/Stop'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import CancelIcon from '@mui/icons-material/Cancel'
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import Autocomplete from '@mui/material/Autocomplete'
import { alpha } from '@mui/material/styles'
import { useMutation, useQuery } from '@tanstack/react-query'

import {
  listTrainingSessions,
  type TrainingSession,
  updateTrainingSession,
  type TrainingSessionUpdate
} from '../api/trainingSessions'
import { queryClient } from '../queryClient'
import { ReservedLinearProgress } from '../components/ReservedLinearProgress'

const ACTIVE_SESSION_KEY = 'treinoRunner:activeSessionId'
const PROGRESS_KEY_PREFIX = 'treinoRunner:progress:'

type ExerciseStatus = 'pending' | 'completed' | 'failed' | 'skipped'

type ExerciseProgress = {
  exercise_idx: number
  exercise_name: string

  planned_sets: number
  planned_reps: string
  planned_weight?: string
  planned_rest: number

  status: ExerciseStatus

  actual_sets: number
  actual_reps: string
  actual_weight?: string
  actual_rest: number

  notes: string
  completed_at: string | null
}

type SessionProgress = {
  started_at: string
  exercises: ExerciseProgress[]
  session_notes: string
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat('pt-PT', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

function formatTimeHHMM(value: unknown): string {
  const s = String(value ?? '')
  if (!s) return '—'
  return s.slice(0, 5)
}

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function loadActiveSessionId(): number | null {
  const v = localStorage.getItem(ACTIVE_SESSION_KEY)
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}

function saveActiveSessionId(sessionId: number | null) {
  if (sessionId == null) localStorage.removeItem(ACTIVE_SESSION_KEY)
  else localStorage.setItem(ACTIVE_SESSION_KEY, String(sessionId))
}

function loadProgress(sessionId: number): SessionProgress | null {
  return safeParseJson<SessionProgress>(localStorage.getItem(`${PROGRESS_KEY_PREFIX}${sessionId}`))
}

function saveProgress(sessionId: number, progress: SessionProgress) {
  localStorage.setItem(`${PROGRESS_KEY_PREFIX}${sessionId}`, JSON.stringify(progress))
}

function clearProgress(sessionId: number) {
  localStorage.removeItem(`${PROGRESS_KEY_PREFIX}${sessionId}`)
}

function statusChip(status: ExerciseStatus): { label: string; color: 'default' | 'success' | 'warning' | 'error' } {
  if (status === 'completed') return { label: 'Completo', color: 'success' }
  if (status === 'failed') return { label: 'Falhado', color: 'error' }
  if (status === 'skipped') return { label: 'Saltado', color: 'warning' }
  return { label: 'Pendente', color: 'default' }
}

function buildInitialProgress(session: TrainingSession): SessionProgress {
  const started_at = new Date().toISOString()
  const planned = Array.isArray(session.exercises) ? session.exercises : []

  const exercises: ExerciseProgress[] = planned.map((ex: any, idx: number) => {
    const planned_sets = Number(ex?.sets ?? ex?.planned_sets ?? 0) || 0
    const planned_reps = String(ex?.reps ?? ex?.planned_reps ?? '')
    const planned_rest = Number(ex?.rest ?? ex?.planned_rest ?? 0) || 0
    const planned_weight = ex?.weight != null ? String(ex.weight) : ex?.planned_weight != null ? String(ex.planned_weight) : ''

    return {
      exercise_idx: Number(ex?.exercise_idx ?? idx) || idx,
      exercise_name: String(ex?.exercise_name ?? ex?.name ?? `Exercício ${idx + 1}`),

      planned_sets,
      planned_reps,
      planned_weight,
      planned_rest,

      status: 'pending',

      actual_sets: planned_sets,
      actual_reps: planned_reps,
      actual_weight: planned_weight,
      actual_rest: planned_rest,

      notes: '',
      completed_at: null
    }
  })

  return { started_at, exercises, session_notes: session.session_notes ?? '' }
}

function sessionLabel(s: TrainingSession): string {
  const athlete = [s.athlete_first_name, s.athlete_last_name].filter(Boolean).join(' ')
  const when = `${formatDate(s.session_date)} ${formatTimeHHMM(s.session_time)}`
  return `${s.session_name} — ${athlete || 'Atleta'} (${when})`
}

function tryAlarm(durationSeconds = 3) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return

    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    // "Alarm clock" effect: short pulsed two-tone beeps (not a siren sweep).
    osc.type = 'triangle'
    osc.frequency.value = 880
    gain.gain.value = 0.0001

    osc.connect(gain)
    gain.connect(ctx.destination)

    const now = ctx.currentTime
    const dur = Math.max(0.2, Number(durationSeconds) || 3)

    // Try to comply with autoplay policies (may still be blocked without user gesture).
    ctx.resume?.().catch(() => undefined)

    // Fade in quickly, sustain, fade out near the end.
    // We gate the volume on/off to create "beep-beep ... pause".
    const end = now + dur
    const onGain = 0.16
    const attack = 0.01
    const release = 0.02
    const toneA = 880
    const toneB = 660
    const beepOn = 0.14
    const gapShort = 0.06
    const gapLong = 0.22

    gain.gain.cancelScheduledValues(now)
    gain.gain.setValueAtTime(0.0001, now)
    osc.frequency.cancelScheduledValues(now)

    let t = now
    while (t < end - 0.01) {
      // Beep A
      osc.frequency.setValueAtTime(toneA, t)
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(onGain, Math.min(t + attack, end))
      gain.gain.setValueAtTime(onGain, Math.min(t + Math.max(0, beepOn - release), end))
      gain.gain.exponentialRampToValueAtTime(0.0001, Math.min(t + beepOn, end))
      t += beepOn + gapShort
      if (t >= end) break

      // Beep B
      osc.frequency.setValueAtTime(toneB, t)
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(onGain, Math.min(t + attack, end))
      gain.gain.setValueAtTime(onGain, Math.min(t + Math.max(0, beepOn - release), end))
      gain.gain.exponentialRampToValueAtTime(0.0001, Math.min(t + beepOn, end))
      t += beepOn + gapShort
      if (t >= end) break

      t += gapLong
    }

    osc.start(now)
    osc.stop(end)

    osc.onended = () => {
      ctx.close().catch(() => undefined)
    }
  } catch {
    // No-op: audio may be blocked by browser policies.
  }
}

export function TreinoRunnerPage() {
  const [activeSessionId, setActiveSessionId] = useState<number | null>(() => loadActiveSessionId())
  const [selectedScheduled, setSelectedScheduled] = useState<TrainingSession | null>(null)
  const [progress, setProgress] = useState<SessionProgress | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)

  const [restSecondsLeft, setRestSecondsLeft] = useState(0)
  const [isRestRunning, setIsRestRunning] = useState(false)
  const [restBeepEnabled, setRestBeepEnabled] = useState(true)

  const [cancelOpen, setCancelOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)

  const scheduledQuery = useQuery({
    queryKey: ['training-sessions', 'Scheduled'],
    queryFn: () => listTrainingSessions({ status: 'Scheduled' })
  })

  const scheduledSessions = scheduledQuery.data ?? []

  const activeSession = useMemo(() => {
    if (!activeSessionId) return null
    return scheduledSessions.find((s) => s.id === activeSessionId) ?? null
  }, [activeSessionId, scheduledSessions])

  useEffect(() => {
    saveActiveSessionId(activeSessionId)
  }, [activeSessionId])

  useEffect(() => {
    if (!activeSessionId) {
      setProgress(null)
      setCurrentIdx(0)
      setRestSecondsLeft(0)
      setIsRestRunning(false)
      return
    }

    setProgress((prev) => {
      if (prev) return prev
      const saved = loadProgress(activeSessionId)
      if (saved) return saved
      if (activeSession) return buildInitialProgress(activeSession)
      return null
    })
  }, [activeSession, activeSessionId])

  useEffect(() => {
    if (!activeSessionId || !progress) return
    const id = window.setTimeout(() => saveProgress(activeSessionId, progress), 220)
    return () => window.clearTimeout(id)
  }, [activeSessionId, progress])

  useEffect(() => {
    if (!isRestRunning) return
    if (restSecondsLeft <= 0) {
      setIsRestRunning(false)
      return
    }
    const id = window.setInterval(() => {
      setRestSecondsLeft((s) => {
        const next = Math.max(0, s - 1)
        if (next === 0) {
          window.setTimeout(() => {
            if (restBeepEnabled) tryAlarm(3)
          }, 0)
        }
        return next
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [isRestRunning, restBeepEnabled, restSecondsLeft])

  // Keep current index in a sensible spot (first pending by default).
  useEffect(() => {
    if (!progress) return
    const firstPending = progress.exercises.findIndex((e) => e.status === 'pending')
    if (firstPending === -1) return
    setCurrentIdx((prev) => {
      if (prev >= 0 && prev < progress.exercises.length) return prev
      return firstPending
    })
  }, [progress])

  const elapsedMinutes = useMemo(() => {
    if (!progress) return 0
    const started = new Date(progress.started_at)
    if (Number.isNaN(started.getTime())) return 0
    return Math.max(0, Math.floor((Date.now() - started.getTime()) / 60000))
  }, [progress])

  const summary = useMemo(() => {
    const exs = progress?.exercises ?? []
    const total = exs.length
    const completed = exs.filter((e) => e.status === 'completed').length
    const failed = exs.filter((e) => e.status === 'failed').length
    const skipped = exs.filter((e) => e.status === 'skipped').length
    const pending = exs.filter((e) => e.status === 'pending').length
    return { total, completed, failed, skipped, pending }
  }, [progress])

  const current = progress?.exercises?.[currentIdx] ?? null

  const completeMutation = useMutation({
    mutationFn: async ({ sessionId, payload }: { sessionId: number; payload: TrainingSessionUpdate }) => {
      return updateTrainingSession(sessionId, payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['training-sessions'] })
      if (activeSessionId) clearProgress(activeSessionId)
      setActiveSessionId(null)
      setProgress(null)
      setCurrentIdx(0)
      setCompleteOpen(false)
    }
  })

  const startSession = () => {
    if (!selectedScheduled) return
    setActiveSessionId(selectedScheduled.id)
    const initial = buildInitialProgress(selectedScheduled)
    setProgress(initial)
    saveProgress(selectedScheduled.id, initial)
    setCurrentIdx(0)
    setRestSecondsLeft(0)
    setIsRestRunning(false)
    setSelectedScheduled(null)
  }

  const endLocal = () => {
    if (activeSessionId) clearProgress(activeSessionId)
    setActiveSessionId(null)
    setProgress(null)
    setCurrentIdx(0)
    setRestSecondsLeft(0)
    setIsRestRunning(false)
    setCancelOpen(false)
  }

  const startRest = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds || 0))
    if (s <= 0) return
    setRestSecondsLeft(s)
    setIsRestRunning(true)
  }

  const adjustRest = (deltaSeconds: number) => {
    const d = Math.floor(Number(deltaSeconds) || 0)
    if (!d) return
    setRestSecondsLeft((s) => {
      const base = Number.isFinite(s) ? s : 0
      return Math.max(0, base + d)
    })
  }

  const jumpToNextPending = (fromIdx: number, p: SessionProgress) => {
    const idx = p.exercises.findIndex((e, i) => i > fromIdx && e.status === 'pending')
    if (idx !== -1) {
      setCurrentIdx(idx)
      return
    }
    const wrap = p.exercises.findIndex((e) => e.status === 'pending')
    if (wrap !== -1) setCurrentIdx(wrap)
  }

  const setStatus = (idx: number, status: ExerciseStatus) => {
    const rest = progress?.exercises?.[idx]?.actual_rest ?? 0
    setProgress((p) => {
      if (!p) return p
      const ex = p.exercises[idx]
      if (!ex) return p
      const next: SessionProgress = { ...p, exercises: [...p.exercises] }
      next.exercises[idx] = {
        ...ex,
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null
      }
      // Auto-advance when you mark something.
      window.setTimeout(() => jumpToNextPending(idx, next), 0)
      return next
    })

    // Set/start rest timer only when completing an exercise.
    if (status === 'completed' && rest > 0) startRest(rest)
  }

  const updateCurrent = (patch: Partial<ExerciseProgress>) => {
    setProgress((p) => {
      if (!p) return p
      const ex = p.exercises[currentIdx]
      if (!ex) return p
      const next: SessionProgress = { ...p, exercises: [...p.exercises] }
      next.exercises[currentIdx] = { ...ex, ...patch }
      return next
    })
  }

  const completeToBackend = () => {
    if (!activeSessionId || !activeSession || !progress) return

    const planned = Array.isArray(activeSession.exercises) ? activeSession.exercises : []
    const updatedExercises = planned.map((ex: any, idx: number) => {
      const p = progress.exercises[idx]
      if (!p) return ex
      return {
        ...ex,
        actual_sets: p.actual_sets,
        actual_reps: p.actual_reps,
        actual_weight: p.actual_weight,
        actual_rest: p.actual_rest,
        status: p.status,
        exercise_notes: p.notes
      }
    })

    const completed_data = {
      started_at: progress.started_at,
      completed_at: new Date().toISOString(),
      exercises: progress.exercises,
      session_notes: progress.session_notes
    }

    const payload: TrainingSessionUpdate = {
      status: 'Completed',
      completed_at: new Date().toISOString(),
      completed_data,
      exercises: updatedExercises,
      session_notes: progress.session_notes || null
    }

    completeMutation.mutate({ sessionId: activeSessionId, payload })
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4">Treino</Typography>
          <Typography variant="body2" color="text.secondary">
            Execução da sessão: percorra exercícios e marque rapidamente o resultado.
          </Typography>
        </Box>

        {scheduledQuery.isError ? <Alert severity="error">Falha ao carregar sessões.</Alert> : null}
        <ReservedLinearProgress active={scheduledQuery.isFetching && !scheduledQuery.isLoading} />

        {!activeSessionId ? (
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack spacing={2}>
                <Alert severity="warning">
                  Nenhuma sessão ativa. Selecione uma sessão agendada para iniciar.
                </Alert>

                {scheduledQuery.isLoading ? (
                  <Stack spacing={1}>
                    <Skeleton variant="text" width="55%" height={26} />
                    <Skeleton variant="rounded" height={44} />
                    <Skeleton variant="rounded" height={40} />
                  </Stack>
                ) : scheduledSessions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma sessão agendada disponível.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    <Autocomplete
                      options={scheduledSessions}
                      value={selectedScheduled}
                      onChange={(_, v) => setSelectedScheduled(v)}
                      getOptionLabel={sessionLabel}
                      renderInput={(params) => <TextField {...params} label="Selecione uma sessão" />}
                      fullWidth
                    />

                    <Button
                      variant="contained"
                      startIcon={<PlayArrowIcon />}
                      onClick={startSession}
                      disabled={!selectedScheduled}
                    >
                      Iniciar sessão
                    </Button>
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        ) : activeSessionId && !activeSession ? (
          <Alert severity="warning">
            Sessão ativa não encontrada em "Scheduled". Pode ter sido alterada noutro local.
          </Alert>
        ) : activeSession && progress && current ? (
          <>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' },
                gap: 2,
                alignItems: 'start'
              }}
            >
              <Stack spacing={2}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">Sessão</Typography>
                    <Typography variant="h6" fontWeight={800} sx={{ mt: 0.25 }}>
                      {activeSession.session_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {[activeSession.athlete_first_name, activeSession.athlete_last_name].filter(Boolean).join(' ') || '—'}
                      {' • '}
                      {formatDate(activeSession.session_date)} {formatTimeHHMM(activeSession.session_time)}
                      {' • '}
                      {elapsedMinutes} min
                    </Typography>

                    <Box sx={{ mt: 1.5 }}>
                      <LinearProgress
                        variant="determinate"
                        value={summary.total === 0 ? 0 : (summary.completed / summary.total) * 100}
                        sx={{ height: 8, borderRadius: 999 }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        {summary.completed}/{summary.total} completos • {summary.pending} pendentes
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>

                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    borderColor: 'divider',
                    bgcolor: 'background.paper'
                  }}
                >
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="space-between">
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary">
                            Exercício {currentIdx + 1}/{progress.exercises.length}
                          </Typography>
                          <Typography variant="h5" fontWeight={900} sx={{ mt: 0.25 }} noWrap title={current.exercise_name}>
                            {current.exercise_name}
                          </Typography>
                        </Box>
                        <Chip size="small" {...statusChip(current.status)} variant={current.status === 'pending' ? 'outlined' : 'filled'} />
                      </Stack>

                      <Box
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 2,
                          p: 2,
                          bgcolor: (theme) =>
                            theme.palette.mode === 'dark'
                              ? alpha(theme.palette.common.white, 0.03)
                              : alpha(theme.palette.common.black, 0.015)
                        }}
                      >
                        <Typography fontWeight={800} sx={{ mb: 1 }}>Planeado</Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Séries</Typography>
                            <Typography fontWeight={800}>{current.planned_sets}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Reps/Duração</Typography>
                            <Typography fontWeight={800}>{current.planned_reps || '—'}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Descanso (seg)</Typography>
                            <Typography fontWeight={800}>{current.planned_rest}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Peso</Typography>
                            <Typography fontWeight={800}>{current.planned_weight || 'N/A'}</Typography>
                          </Box>
                        </Box>
                      </Box>

                      <Divider />

                      <Typography fontWeight={800}>Performance real</Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 1.5 }}>
                        <TextField
                          label="Séries"
                          type="number"
                          inputProps={{ min: 0, max: 20 }}
                          value={current.actual_sets}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            updateCurrent({ actual_sets: Number.isFinite(v) ? v : 0 })
                          }}
                          fullWidth
                        />
                        <TextField
                          label="Reps/Duração"
                          value={current.actual_reps}
                          onChange={(e) => updateCurrent({ actual_reps: e.target.value })}
                          fullWidth
                        />
                        <TextField
                          label="Descanso (seg)"
                          type="number"
                          inputProps={{ min: 0, max: 600, step: 15 }}
                          value={current.actual_rest}
                          onChange={(e) => {
                            const v = Number(e.target.value)
                            updateCurrent({ actual_rest: Number.isFinite(v) ? v : 0 })
                          }}
                          fullWidth
                        />
                        <TextField
                          label="Peso/Intensidade"
                          value={current.actual_weight ?? ''}
                          onChange={(e) => updateCurrent({ actual_weight: e.target.value })}
                          fullWidth
                        />
                      </Box>

                      <TextField
                        label="Notas do exercício"
                        value={current.notes}
                        onChange={(e) => updateCurrent({ notes: e.target.value })}
                        fullWidth
                        multiline
                        minRows={2}
                        placeholder="Ex: dor no ombro, RPE 8, última série difícil…"
                      />

                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                        <Button
                          startIcon={<CancelIcon />}
                          color="error"
                          variant="outlined"
                          onClick={() => setStatus(currentIdx, 'failed')}
                          sx={{ flex: 1 }}
                        >
                          Falhou
                        </Button>
                        <Button
                          startIcon={<SkipNextIcon />}
                          color="warning"
                          variant="outlined"
                          onClick={() => setStatus(currentIdx, 'skipped')}
                          sx={{ flex: 1 }}
                        >
                          Saltou
                        </Button>
                        <Button
                          startIcon={<CheckCircleOutlineIcon />}
                          variant="contained"
                          onClick={() => setStatus(currentIdx, 'completed')}
                          sx={{ flex: 1 }}
                        >
                          Completo
                        </Button>
                      </Stack>

                      <Stack direction="row" spacing={1} justifyContent="space-between" sx={{ pt: 0.5 }}>
                        <Button
                          startIcon={<NavigateBeforeIcon />}
                          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                          disabled={currentIdx === 0}
                        >
                          Anterior
                        </Button>
                        <Button
                          endIcon={<NavigateNextIcon />}
                          onClick={() => setCurrentIdx((i) => Math.min(progress.exercises.length - 1, i + 1))}
                          disabled={currentIdx >= progress.exercises.length - 1}
                        >
                          Próximo
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>

                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography fontWeight={800} sx={{ mb: 1 }}>Notas da sessão</Typography>
                    <TextField
                      value={progress.session_notes}
                      onChange={(e) => setProgress((p) => (p ? { ...p, session_notes: e.target.value } : p))}
                      fullWidth
                      multiline
                      minRows={3}
                      placeholder="Feedback geral da sessão, como o atleta se sentiu, observações…"
                    />

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
                      <Button variant="outlined" onClick={() => saveProgress(activeSessionId, progress)} sx={{ flex: 1 }}>
                        Guardar
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<CheckCircleOutlineIcon />}
                        onClick={() => setCompleteOpen(true)}
                        disabled={completeMutation.isPending}
                        sx={{ flex: 1 }}
                      >
                        Finalizar
                      </Button>
                      <Button
                        color="error"
                        variant="outlined"
                        startIcon={<StopIcon />}
                        onClick={() => setCancelOpen(true)}
                        disabled={completeMutation.isPending}
                        sx={{ flex: 1 }}
                      >
                        Cancelar
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>

              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography fontWeight={800} sx={{ mb: 1 }}>Temporizador</Typography>
                  <Stack spacing={1.5}>
                    <Box
                      sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 1.5,
                        bgcolor: (theme) =>
                          theme.palette.mode === 'dark'
                            ? alpha(theme.palette.common.white, 0.03)
                            : alpha(theme.palette.common.black, 0.015)
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="baseline" justifyContent="space-between">
                        <Typography variant="caption" color="text.secondary">Tempo</Typography>
                        <Typography fontWeight={900}>
                          {String(Math.floor(restSecondsLeft / 60)).padStart(2, '0')}:{String(restSecondsLeft % 60).padStart(2, '0')}
                        </Typography>
                      </Stack>
                    </Box>

                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setIsRestRunning(true)
                        }}
                        disabled={restSecondsLeft <= 0}
                        sx={{ flex: 1 }}
                      >
                        INICIAR
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => setIsRestRunning(false)}
                        disabled={restSecondsLeft <= 0}
                        sx={{ flex: 1 }}
                      >
                        PAUSAR
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setIsRestRunning(false)
                          setRestSecondsLeft(0)
                        }}
                        sx={{ flex: 1 }}
                      >
                        RESET
                      </Button>
                    </Stack>

                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        onClick={() => adjustRest(-15)}
                        disabled={restSecondsLeft <= 0}
                        sx={{ flex: 1 }}
                      >
                        -15
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => adjustRest(15)}
                        sx={{ flex: 1 }}
                      >
                        +15
                      </Button>
                    </Stack>

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={restBeepEnabled}
                          onChange={(_, v) => setRestBeepEnabled(v)}
                          size="small"
                        />
                      }
                      label="Alarme no fim"
                      sx={{ m: 0 }}
                    />
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Typography fontWeight={800} sx={{ mb: 1 }}>Lista</Typography>
                  <Stack spacing={1}>
                    {progress.exercises.map((ex, idx) => {
                      const c = statusChip(ex.status)
                      const isCurrent = idx === currentIdx
                      return (
                        <Box
                          key={`${ex.exercise_idx}-${idx}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => setCurrentIdx(idx)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') setCurrentIdx(idx)
                          }}
                          sx={{
                            border: 1,
                            borderColor: isCurrent ? 'primary.main' : 'divider',
                            borderRadius: 2,
                            px: 1.25,
                            py: 1,
                            cursor: 'pointer',
                            bgcolor: isCurrent ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.08) : 'transparent',
                            '&:hover': { bgcolor: 'action.hover' },
                            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 }
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                            <Typography fontWeight={800} sx={{ minWidth: 0, flex: '1 1 auto' }} noWrap title={ex.exercise_name}>
                              {idx + 1}. {ex.exercise_name}
                            </Typography>
                            <Chip size="small" label={c.label} color={c.color} variant={ex.status === 'pending' ? 'outlined' : 'filled'} />
                          </Stack>
                        </Box>
                      )
                    })}
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </>
        ) : null}
      </Stack>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Cancelar sessão?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Isto vai descartar o progresso guardado localmente. A sessão continuará como "Scheduled" na base de dados.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)}>Voltar</Button>
          <Button color="error" variant="contained" onClick={endLocal}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={completeOpen} onClose={() => setCompleteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Finalizar sessão?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Isto vai marcar a sessão como "Completed" e guardar os dados reais desta sessão.
          </Typography>
          {summary.pending > 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              Ainda há {summary.pending} exercício(s) pendente(s). Pode finalizar na mesma, mas talvez queira marcar o resultado antes.
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteOpen(false)} disabled={completeMutation.isPending}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={completeToBackend}
            disabled={completeMutation.isPending}
          >
            Finalizar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
