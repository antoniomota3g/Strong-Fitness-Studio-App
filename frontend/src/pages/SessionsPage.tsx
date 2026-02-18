import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Chip,
  LinearProgress,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import Autocomplete from '@mui/material/Autocomplete'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import { alpha } from '@mui/material/styles'
import { useMutation, useQuery } from '@tanstack/react-query'

import { listAthletes } from '../api/athletes'
import { listExercises } from '../api/exercises'
import {
  createTrainingSession,
  deleteTrainingSession,
  listTrainingSessions,
  updateTrainingSession,
  TrainingSession,
  TrainingSessionCreate
} from '../api/trainingSessions'
import { queryClient } from '../queryClient'
import { ReservedLinearProgress } from '../components/ReservedLinearProgress'
import { TrainingSessionDetailsCard } from '../components/TrainingSessionDetailsCard'

type PlannedExercise = {
  exercise_id?: number | null
  exercise_name: string
  sets: number
  reps: string
  rest: number
  weight?: string
  notes?: string
}

const STATUS_OPTIONS = ['Scheduled', 'Completed', 'Cancelled'] as const
const SESSION_TYPE_OPTIONS = ['Treino de Força', 'Cardio', 'Mobilidade', 'Técnica', 'Outro'] as const

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function asIsoDay(value: string | null | undefined): string | null {
  if (!value) return null
  const s = String(value)
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

function timeNowHHMM() {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
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

function initials(firstName?: string | null, lastName?: string | null) {
  const a = (firstName?.trim()?.[0] ?? '').toUpperCase()
  const b = (lastName?.trim()?.[0] ?? '').toUpperCase()
  return `${a}${b}` || 'A'
}

function statusChipColor(status?: string | null): 'default' | 'success' | 'warning' | 'error' {
  if (!status) return 'default'
  if (status === 'Completed') return 'success'
  if (status === 'Scheduled') return 'warning'
  if (status === 'Cancelled') return 'error'
  return 'default'
}

export function SessionsPage() {
  const athletesQuery = useQuery({ queryKey: ['athletes'], queryFn: listAthletes })
  const exercisesQuery = useQuery({ queryKey: ['exercises'], queryFn: listExercises })

  const [addOpen, setAddOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const [athleteId, setAthleteId] = useState<number | ''>('')
  const [sessionName, setSessionName] = useState('')
  const [sessionDate, setSessionDate] = useState(todayIso())
  const [sessionTime, setSessionTime] = useState(timeNowHHMM())
  const [duration, setDuration] = useState(60)
  const [sessionType, setSessionType] = useState<string>('Treino de Força')
  const [sessionNotes, setSessionNotes] = useState('')
  const [status, setStatus] = useState<string>('Scheduled')

  const [search, setSearch] = useState('')

  const [filterAthleteId, setFilterAthleteId] = useState<number | ''>('')
  const [filterStatus, setFilterStatus] = useState<string>('Todos')
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')
  const [didInitDateRange, setDidInitDateRange] = useState(false)
  const [didUserEditDateRange, setDidUserEditDateRange] = useState(false)

  const [plannedExercises, setPlannedExercises] = useState<PlannedExercise[]>([])

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; label: string } | null>(null)

  const [expandedId, setExpandedId] = useState<number | null>(null)

  const LIST_CHUNK = 25
  const [visibleCount, setVisibleCount] = useState(LIST_CHUNK)

  const resetForm = () => {
    setAthleteId('')
    setSessionName('')
    setSessionDate(todayIso())
    setSessionTime(timeNowHHMM())
    setDuration(60)
    setSessionType('Treino de Força')
    setSessionNotes('')
    setStatus('Scheduled')
    setPlannedExercises([])
    setSubmitAttempted(false)
  }

  const openCreate = () => {
    setFormMode('create')
    setEditingSession(null)
    resetForm()
    setAddOpen(true)
  }

  const openEdit = (session: TrainingSession) => {
    setFormMode('edit')
    setEditingSession(session)

    setAthleteId(session.athlete_id)
    setSessionName(session.session_name ?? '')
    setSessionDate(asIsoDay(session.session_date) ?? todayIso())
    setSessionTime(formatTimeHHMM(session.session_time) === '—' ? timeNowHHMM() : formatTimeHHMM(session.session_time))
    setDuration(session.duration ?? 60)
    setSessionType(session.session_type ?? 'Treino de Força')
    setSessionNotes(session.session_notes ?? '')
    setStatus(session.status ?? 'Scheduled')

    const ex = Array.isArray(session.exercises) ? session.exercises : []
    setPlannedExercises(
      ex.map((e: any) => ({
        exercise_id: e?.exercise_id ?? null,
        exercise_name: e?.exercise_name ?? '',
        sets: Number(e?.sets ?? 3),
        reps: String(e?.reps ?? '10'),
        rest: Number(e?.rest ?? 60),
        weight: e?.weight ?? '',
        notes: e?.notes ?? ''
      }))
    )

    setSubmitAttempted(false)
    setAddOpen(true)
  }

  const effectiveStart = didUserEditDateRange ? (filterStart || '') : ''
  const effectiveEnd = didUserEditDateRange ? (filterEnd || '') : ''

  const sessionsQuery = useQuery({
    queryKey: ['training-sessions', effectiveStart, effectiveEnd, filterAthleteId],
    queryFn: () =>
      listTrainingSessions({
        start: didUserEditDateRange ? (filterStart || undefined) : undefined,
        end: didUserEditDateRange ? (filterEnd || undefined) : undefined,
        athlete_id: filterAthleteId === '' ? undefined : Number(filterAthleteId)
      })
  })

  useEffect(() => {
    // If the athlete filter changes, recompute the suggested date range
    // without forcing an extra fetch.
    setDidInitDateRange(false)
    setDidUserEditDateRange(false)
    setFilterStart('')
    setFilterEnd('')
  }, [filterAthleteId])

  useEffect(() => {
    if (didInitDateRange) return
    if (didUserEditDateRange) return
    const dates = (sessionsQuery.data ?? [])
      .map((s) => asIsoDay(s.session_date))
      .filter(Boolean) as string[]
    if (dates.length === 0) return

    let min = dates[0]
    let max = dates[0]
    for (const d of dates) {
      if (d < min) min = d
      if (d > max) max = d
    }

    setFilterStart(min)
    setFilterEnd(max)
    setDidInitDateRange(true)
  }, [didInitDateRange, didUserEditDateRange, sessionsQuery.data])

  const createMutation = useMutation({
    mutationFn: createTrainingSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['training-sessions'] })
      resetForm()
      setAddOpen(false)
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: TrainingSessionCreate }) => updateTrainingSession(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['training-sessions'] })
      resetForm()
      setEditingSession(null)
      setFormMode('create')
      setAddOpen(false)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTrainingSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['training-sessions'] })
      setDeleteConfirm(null)
    }
  })

  const athletes = athletesQuery.data ?? []
  const exercises = exercisesQuery.data ?? []
  const sessions = sessionsQuery.data ?? []

  const deferredSearch = useDeferredValue(search)

  const searchIndex = useMemo(() => {
    const map = new Map<number, string>()
    for (const s of sessions) {
      map.set(
        s.id,
        normalizeText(
          [
            s.session_name,
            s.session_type,
            s.status,
            s.session_date,
            s.session_time,
            [s.athlete_first_name, s.athlete_last_name].filter(Boolean).join(' ')
          ]
            .filter(Boolean)
            .join(' ')
        )
      )
    }
    return map
  }, [sessions])

  const canSubmit = useMemo(() => {
    return athleteId !== '' && sessionName.trim().length > 0 && sessionDate && sessionTime
  }, [athleteId, sessionName, sessionDate, sessionTime])

  const payload: TrainingSessionCreate | null = useMemo(() => {
    if (!canSubmit) return null
    return {
      athlete_id: Number(athleteId),
      session_name: sessionName,
      session_date: sessionDate,
      session_time: sessionTime,
      duration,
      session_type: sessionType || null,
      session_notes: sessionNotes || null,
      status: status || 'Scheduled',
      exercises: plannedExercises
    }
  }, [athleteId, canSubmit, duration, plannedExercises, sessionDate, sessionName, sessionNotes, sessionTime, sessionType, status])

  const filteredSessions = useMemo(() => {
    let items = sessions
    if (filterStatus !== 'Todos') {
      items = items.filter((s) => s.status === filterStatus)
    }
    const q = normalizeText(deferredSearch)
    if (!q) return items

    return items.filter((s) => {
      return (searchIndex.get(s.id) ?? '').includes(q)
    })
  }, [deferredSearch, filterStatus, searchIndex, sessions])

  useEffect(() => {
    // Reset progressive rendering when the list changes materially.
    setVisibleCount(LIST_CHUNK)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, deferredSearch, sessions])

  useEffect(() => {
    if (sessionsQuery.isLoading) return
    if (visibleCount >= filteredSessions.length) return
    const id = window.setTimeout(() => {
      setVisibleCount((c) => Math.min(filteredSessions.length, c + LIST_CHUNK))
    }, 40)
    return () => window.clearTimeout(id)
  }, [filteredSessions.length, sessionsQuery.isLoading, visibleCount])

  const visibleSessions = useMemo(() => {
    return filteredSessions.slice(0, visibleCount)
  }, [filteredSessions, visibleCount])

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Box>
            <Typography variant="h4">Sessões</Typography>
            <Typography variant="body2" color="text.secondary">
              Crie sessões com exercícios, e faça a gestão do histórico.
            </Typography>
          </Box>

          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Adicionar Sessão
          </Button>
        </Stack>

        {sessionsQuery.isError ? <Alert severity="error">Falha ao carregar sessões.</Alert> : null}

        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
            <Typography variant="h6">
              Sessões ({filteredSessions.length}{filteredSessions.length !== sessions.length ? ` de ${sessions.length}` : ''})
            </Typography>

            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por nome, atleta, estado…"
              size="small"
              sx={{ minWidth: { xs: '100%', sm: 360 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton aria-label="Limpar pesquisa" edge="end" onClick={() => setSearch('')} size="small">
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : undefined
              }}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Filtrar por Atleta"
              value={filterAthleteId}
              onChange={(e) => setFilterAthleteId(e.target.value === '' ? '' : Number(e.target.value))}
              fullWidth
            >
              <MenuItem value="">Todos</MenuItem>
              {athletes.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.first_name} {a.last_name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Filtrar por Estado"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              fullWidth
            >
              <MenuItem value="Todos">Todos</MenuItem>
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="Início"
              type="date"
              value={filterStart}
              onChange={(e) => {
                setDidUserEditDateRange(true)
                setFilterStart(e.target.value)
              }}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Fim"
              type="date"
              value={filterEnd}
              onChange={(e) => {
                setDidUserEditDateRange(true)
                setFilterEnd(e.target.value)
              }}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </Stack>

        <ReservedLinearProgress active={sessionsQuery.isFetching && !sessionsQuery.isLoading} />

        {sessionsQuery.isLoading ? (
          <Stack spacing={1} sx={{ mt: 1 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Skeleton variant="text" width="55%" height={26} />
                      <Skeleton variant="text" width="80%" height={20} />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <Stack spacing={1}>
            {visibleSessions.map((s) => {
            const athleteName = [s.athlete_first_name, s.athlete_last_name].filter(Boolean).join(' ') || '—'
            const exCount = Array.isArray(s.exercises) ? s.exercises.length : 0
            return (
              <Accordion
                key={s.id}
                disableGutters
                elevation={0}
                expanded={expandedId === s.id}
                onChange={(_, isExpanded) => setExpandedId(isExpanded ? s.id : null)}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 2,
                  overflow: 'hidden',
                  bgcolor: 'background.paper',
                  '&:before': { display: 'none' },
                  transition: 'box-shadow 120ms ease',
                  '&:hover': {
                    boxShadow: (theme) =>
                      theme.palette.mode === 'dark' ? '0 10px 28px rgba(0,0,0,0.55)' : '0 6px 20px rgba(0,0,0,0.06)'
                  }
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    px: 2,
                    py: 1.25,
                    bgcolor: (theme) =>
                      theme.palette.mode === 'dark'
                        ? alpha(theme.palette.common.white, 0.04)
                        : alpha(theme.palette.common.black, 0.02),
                    '& .MuiAccordionSummary-content': { my: 0 }
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%', minWidth: 0 }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 800 }}>
                      {initials(s.athlete_first_name, s.athlete_last_name)}
                    </Avatar>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flexWrap: 'wrap' }}>
                        <Typography fontWeight={800} noWrap sx={{ minWidth: 0 }}>
                          {s.session_name}
                        </Typography>
                        {s.session_type ? <Chip size="small" label={s.session_type} variant="outlined" /> : null}
                        {s.status ? <Chip size="small" label={s.status} color={statusChipColor(s.status)} variant="outlined" /> : null}
                      </Stack>

                      <Typography variant="body2" color="text.secondary" noWrap>
                        {formatDate(s.session_date)} • {formatTimeHHMM(s.session_time)} • {athleteName} • {exCount} exercício(s)
                      </Typography>
                    </Box>
                  </Stack>
                </AccordionSummary>

                <AccordionDetails sx={{ px: 2, pb: 2 }}>
                  {expandedId === s.id ? (
                    <TrainingSessionDetailsCard
                      session={s}
                      footer={
                        <Stack direction="row" justifyContent="flex-end" spacing={1}>
                          <Button
                            variant="outlined"
                            onClick={() => openEdit(s)}
                            disabled={deleteMutation.isPending || createMutation.isPending || updateMutation.isPending}
                          >
                            Editar Sessão
                          </Button>
                          <Button
                            color="error"
                            variant="outlined"
                            onClick={() => setDeleteConfirm({ id: s.id, label: s.session_name })}
                            disabled={deleteMutation.isPending || createMutation.isPending || updateMutation.isPending}
                          >
                            Eliminar Sessão
                          </Button>
                        </Stack>
                      }
                    />
                  ) : null}
                </AccordionDetails>
              </Accordion>
            )
            })}

            {visibleCount < filteredSessions.length ? (
              <Box sx={{ py: 1 }}>
                <LinearProgress />
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {Array.from({ length: Math.min(3, filteredSessions.length - visibleCount) }).map((_, i) => (
                    <Card key={`more-${i}`} variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Skeleton variant="circular" width={40} height={40} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Skeleton variant="text" width="50%" height={26} />
                            <Skeleton variant="text" width="78%" height={20} />
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Box>
            ) : null}
          </Stack>
        )}

        {(athletesQuery.isError || exercisesQuery.isError) && (
          <Alert severity="warning">
            Se a lista de atletas/exercícios não carregar, confirme que o backend está a correr e que o DB foi seeded.
          </Alert>
        )}
      </Stack>

      <Dialog
        open={addOpen}
        onClose={() => {
          setAddOpen(false)
          setEditingSession(null)
          setFormMode('create')
          resetForm()
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{formMode === 'edit' ? 'Editar Sessão' : 'Registar Sessão'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="h6">Informações da Sessão</Typography>

            <Autocomplete
              options={athletes}
              getOptionLabel={(a) => `${a.first_name} ${a.last_name}`}
              value={athleteId === '' ? null : athletes.find((a) => a.id === athleteId) ?? null}
              onChange={(_, v) => setAthleteId(v ? v.id : '')}
              renderInput={(params) => <TextField {...params} label="Atleta*" />}
              fullWidth
            />

            <TextField
              label="Nome da Sessão*"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              fullWidth
              placeholder="ex: Dia de Pernas - Semana 1"
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Data*"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Hora*"
                type="time"
                value={sessionTime}
                onChange={(e) => setSessionTime(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Duração (min)"
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                fullWidth
              />
              <TextField
                select
                label="Tipo"
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                fullWidth
              >
                {SESSION_TYPE_OPTIONS.map((t) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Estado"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                fullWidth
              >
                {STATUS_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <TextField
              label="Notas"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />

            <Divider />

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Exercícios</Typography>
              <Button
                onClick={() =>
                  setPlannedExercises((prev) => [
                    ...prev,
                    { exercise_id: null, exercise_name: '', sets: 3, reps: '10', rest: 60, weight: '', notes: '' }
                  ])
                }
              >
                + Adicionar exercício
              </Button>
            </Stack>

            <Stack spacing={2}>
              {plannedExercises.map((ex, idx) => (
                <Box key={idx} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                  <Stack spacing={2}>
                    <TextField
                      select
                      label="Exercício"
                      value={ex.exercise_id ?? ''}
                      onChange={(e) => {
                        const nextId = e.target.value === '' ? null : Number(e.target.value)
                        const selected = exercises.find((x) => x.id === nextId)
                        setPlannedExercises((prev) =>
                          prev.map((p, i) =>
                            i === idx
                              ? {
                                  ...p,
                                  exercise_id: nextId,
                                  exercise_name: selected?.name ?? p.exercise_name
                                }
                              : p
                          )
                        )
                      }}
                      fullWidth
                    >
                      <MenuItem value="">Selecione…</MenuItem>
                      {exercises.map((x) => (
                        <MenuItem key={x.id} value={x.id}>
                          {x.name}
                        </MenuItem>
                      ))}
                    </TextField>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        label="Séries"
                        type="number"
                        value={ex.sets}
                        onChange={(e) =>
                          setPlannedExercises((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, sets: Number(e.target.value) } : p))
                          )
                        }
                        fullWidth
                      />
                      <TextField
                        label="Reps"
                        value={ex.reps}
                        onChange={(e) =>
                          setPlannedExercises((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, reps: e.target.value } : p))
                          )
                        }
                        fullWidth
                      />
                      <TextField
                        label="Descanso (s)"
                        type="number"
                        value={ex.rest}
                        onChange={(e) =>
                          setPlannedExercises((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, rest: Number(e.target.value) } : p))
                          )
                        }
                        fullWidth
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <TextField
                        label="Peso"
                        value={ex.weight ?? ''}
                        onChange={(e) =>
                          setPlannedExercises((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, weight: e.target.value } : p))
                          )
                        }
                        fullWidth
                      />
                      <TextField
                        label="Notas do exercício"
                        value={ex.notes ?? ''}
                        onChange={(e) =>
                          setPlannedExercises((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, notes: e.target.value } : p))
                          )
                        }
                        fullWidth
                      />
                    </Stack>

                    <Button color="error" onClick={() => setPlannedExercises((prev) => prev.filter((_, i) => i !== idx))} sx={{ alignSelf: 'flex-end' }}>
                      Remover
                    </Button>
                  </Stack>
                </Box>
              ))}
            </Stack>

            {createMutation.isError ? <Alert severity="error">Falha ao criar sessão.</Alert> : null}
            {updateMutation.isError ? <Alert severity="error">Falha ao atualizar sessão.</Alert> : null}
            {submitAttempted && !payload ? (
              <Alert severity="info">Por favor preencha os campos obrigatórios (Atleta, Nome, Data, Hora).</Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAddOpen(false)
              setEditingSession(null)
              setFormMode('create')
              resetForm()
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={createMutation.isPending || updateMutation.isPending}
            onClick={() => {
              setSubmitAttempted(true)
              if (!payload) return
              if (formMode === 'edit') {
                if (!editingSession) return
                updateMutation.mutate({ id: editingSession.id, payload })
              } else {
                createMutation.mutate(payload)
              }
            }}
          >
            {formMode === 'edit' ? 'Guardar Alterações' : 'Registar Sessão'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle>Eliminar sessão?</DialogTitle>
        <DialogContent>
          <Typography>
            Tem a certeza que quer eliminar <b>{deleteConfirm?.label}</b>?
          </Typography>
          {deleteMutation.isError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              Falha ao eliminar sessão.
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button
            color="error"
            variant="contained"
            disabled={!deleteConfirm || deleteMutation.isPending}
            onClick={() => {
              if (!deleteConfirm) return
              deleteMutation.mutate(deleteConfirm.id)
            }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
