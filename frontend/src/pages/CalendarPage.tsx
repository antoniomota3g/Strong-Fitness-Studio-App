import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { listAthletes } from '../api/athletes'
import { deleteTrainingSession, listTrainingSessions, TrainingSession, updateTrainingSession } from '../api/trainingSessions'
import { queryClient } from '../queryClient'
import { TrainingSessionDetailsCard } from '../components/TrainingSessionDetailsCard'

const ACTIVE_SESSION_KEY = 'treinoRunner:activeSessionId'

function isoDate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

function addMonths(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1)
}

function addDays(d: Date, delta: number): Date {
  const next = new Date(d)
  next.setDate(next.getDate() + delta)
  return next
}

function startOfWeekMonday(d: Date): Date {
  const day = d.getDay() // 0=Sun
  const offset = (day + 6) % 7 // Mon=0 ... Sun=6
  const start = new Date(d)
  start.setDate(d.getDate() - offset)
  start.setHours(0, 0, 0, 0)
  return start
}

type CalendarCell = {
  date: Date
  iso: string
  inMonth: boolean
}

function buildMonthGrid(monthCursor: Date): CalendarCell[] {
  const monthStart = startOfMonth(monthCursor)
  const monthEnd = endOfMonth(monthCursor)
  const gridStart = startOfWeekMonday(monthStart)

  const cells: CalendarCell[] = []
  const cursor = new Date(gridStart)

  // 6 weeks * 7 days = 42 cells (stable layout)
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(cursor)
    const cellIso = isoDate(cellDate)
    cells.push({
      date: cellDate,
      iso: cellIso,
      inMonth: cellDate >= monthStart && cellDate <= monthEnd
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return cells
}

function formatMonthTitle(d: Date): string {
  return new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(d)
}

function formatWeekTitle(weekStart: Date): string {
  const end = addDays(weekStart, 6)
  const fmt = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit' })
  const fmtY = new Intl.DateTimeFormat('pt-PT', { year: 'numeric' })
  return `${fmt.format(weekStart)} – ${fmt.format(end)} ${fmtY.format(end)}`
}

function formatDayTitle(d: Date): string {
  return new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(d)
}

function formatTimeHHMM(value: string | null | undefined): string {
  if (!value) return ''
  return String(value).slice(0, 5)
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat('pt-PT', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

function statusLabel(status: string | null | undefined) {
  if (status === 'Scheduled') return 'Agendada'
  if (status === 'Completed') return 'Concluída'
  if (status === 'Cancelled') return 'Cancelada'
  return status ? String(status) : '—'
}

function statusChipColor(status: string | null | undefined): 'default' | 'success' | 'warning' | 'info' | 'error' {
  if (status === 'Completed') return 'success'
  if (status === 'Cancelled') return 'error'
  if (status === 'Scheduled') return 'info'
  return 'default'
}

function athleteLabel(s: TrainingSession): string {
  const name = [s.athlete_first_name, s.athlete_last_name].filter(Boolean).join(' ').trim()
  return name || 'Atleta'
}

function entrySx(status: string | null | undefined) {
  return (theme: any) => {
    const main =
      status === 'Completed'
        ? theme.palette.success.main
        : status === 'Cancelled'
          ? theme.palette.error.main
          : status === 'Scheduled'
            ? theme.palette.info.main
            : null

    if (!main) return {}

    const bg = alpha(main, theme.palette.mode === 'dark' ? 0.28 : 0.18)
    const bgHover = alpha(main, theme.palette.mode === 'dark' ? 0.40 : 0.28)
    const outline = alpha(main, theme.palette.mode === 'dark' ? 0.55 : 0.45)

    return {
      borderLeft: `6px solid ${main}`,
      backgroundColor: bg,
      boxShadow: `inset 0 0 0 1px ${outline}`,
      '&:hover': {
        backgroundColor: bgHover
      }
    }
  }
}


export function CalendarPage() {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month')
  const [cursorDate, setCursorDate] = useState(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })

  const todayIso = (() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return isoDate(d)
  })()

  const navigate = useNavigate()

  const [filterAthleteId, setFilterAthleteId] = useState<number | ''>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  const [selected, setSelected] = useState<TrainingSession | null>(null)

  const monthStart = useMemo(() => startOfMonth(cursorDate), [cursorDate])
  const monthEnd = useMemo(() => endOfMonth(cursorDate), [cursorDate])
  const weekStart = useMemo(() => startOfWeekMonday(cursorDate), [cursorDate])
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart])

  const rangeStartIso = useMemo(() => {
    if (view === 'day') return isoDate(cursorDate)
    if (view === 'week') return isoDate(weekStart)
    return isoDate(monthStart)
  }, [cursorDate, monthStart, view, weekStart])

  const rangeEndIso = useMemo(() => {
    if (view === 'day') return isoDate(cursorDate)
    if (view === 'week') return isoDate(weekEnd)
    return isoDate(monthEnd)
  }, [cursorDate, monthEnd, view, weekEnd])

  const cells = useMemo(() => buildMonthGrid(monthStart), [monthStart])
  const weekDays = useMemo(() => {
    const days: Array<{ date: Date; iso: string; label: string }> = []
    const fmt = new Intl.DateTimeFormat('pt-PT', { weekday: 'short', day: '2-digit', month: '2-digit' })
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i)
      days.push({ date: d, iso: isoDate(d), label: fmt.format(d) })
    }
    return days
  }, [weekStart])

  const athletesQuery = useQuery({ queryKey: ['athletes'], queryFn: listAthletes })

  const sessionsQuery = useQuery({
    queryKey: ['training-sessions', 'calendar', view, rangeStartIso, rangeEndIso, filterAthleteId, filterStatus],
    queryFn: () =>
      listTrainingSessions({
        start: rangeStartIso,
        end: rangeEndIso,
        athlete_id: filterAthleteId === '' ? undefined : Number(filterAthleteId),
        status: filterStatus ? filterStatus : undefined
      })
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTrainingSession,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['training-sessions'] })
      setSelected(null)
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TrainingSession> }) =>
      updateTrainingSession(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['training-sessions'] })
    }
  })

  const athletes = athletesQuery.data ?? []
  const sessions = sessionsQuery.data ?? []

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, TrainingSession[]>()
    for (const s of sessions) {
      const key = s.session_date
      const bucket = map.get(key) ?? []
      bucket.push(s)
      map.set(key, bucket)
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => String(a.session_time).localeCompare(String(b.session_time)))
    }
    return map
  }, [sessions])

  const weekdayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

  const goToDay = (d: Date) => {
    const next = new Date(d)
    next.setHours(0, 0, 0, 0)
    setCursorDate(next)
    setView('day')
  }

  const headerTitle = useMemo(() => {
    if (view === 'day') return formatDayTitle(cursorDate)
    if (view === 'week') return formatWeekTitle(weekStart)
    return formatMonthTitle(monthStart)
  }, [cursorDate, monthStart, view, weekStart])

  const canStartSelected = selected ? selected.status !== 'Completed' && selected.status !== 'Cancelled' : false

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Typography variant="h4">Calendário</Typography>

        <ToggleButtonGroup
          exclusive
          size="small"
          value={view}
          onChange={(_, v) => {
            if (!v) return
            setView(v)
          }}
          sx={{ alignSelf: 'flex-start' }}
        >
          <ToggleButton value="month" sx={{ textTransform: 'none', fontWeight: 800 }}>
            Mês
          </ToggleButton>
          <ToggleButton value="week" sx={{ textTransform: 'none', fontWeight: 800 }}>
            Semana
          </ToggleButton>
          <ToggleButton value="day" sx={{ textTransform: 'none', fontWeight: 800 }}>
            Dia
          </ToggleButton>
        </ToggleButtonGroup>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                alignItems: 'center',
                gap: 1,
                flex: 1,
                minWidth: 0
              }}
            >
              <Button
                variant="outlined"
                onClick={() => {
                  if (view === 'day') setCursorDate((d) => addDays(d, -1))
                  else if (view === 'week') setCursorDate((d) => addDays(d, -7))
                  else setCursorDate((d) => addMonths(d, -1))
                }}
              >
                ←
              </Button>

              <Typography
                variant="h6"
                sx={{
                  textTransform: 'capitalize',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  textAlign: 'center'
                }}
                title={headerTitle}
              >
                {headerTitle}
              </Typography>

              <Button
                variant="outlined"
                onClick={() => {
                  if (view === 'day') setCursorDate((d) => addDays(d, 1))
                  else if (view === 'week') setCursorDate((d) => addDays(d, 7))
                  else setCursorDate((d) => addMonths(d, 1))
                }}
              >
                →
              </Button>
            </Box>

            <Button
              variant="text"
              onClick={() => {
                const d = new Date()
                d.setHours(0, 0, 0, 0)
                setCursorDate(d)
              }}
              sx={{ textTransform: 'none', flexShrink: 0 }}
            >
              Hoje
            </Button>

            {view === 'day' ? (
              <TextField
                type="date"
                size="small"
                value={isoDate(cursorDate)}
                onChange={(e) => {
                  const v = e.target.value
                  if (!v) return
                  const d = new Date(v)
                  if (!Number.isNaN(d.getTime())) {
                    d.setHours(0, 0, 0, 0)
                    setCursorDate(d)
                  }
                }}
                sx={{ minWidth: 150, flexShrink: 0 }}
                InputLabelProps={{ shrink: true }}
              />
            ) : null}
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Atleta"
              value={filterAthleteId}
              onChange={(e) => setFilterAthleteId(e.target.value === '' ? '' : Number(e.target.value))}
              sx={{ minWidth: 220 }}
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
              label="Estado"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="Scheduled">Scheduled</MenuItem>
              <MenuItem value="Completed">Completed</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
            </TextField>
          </Stack>
        </Stack>

        {(athletesQuery.isError || sessionsQuery.isError) && (
          <Alert severity="error">Falha ao carregar atletas ou sessões. Confirme backend/DB.</Alert>
        )}

        {view === 'month' ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: 1
            }}
          >
            {weekdayLabels.map((w) => (
              <Box key={w} sx={{ p: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {w}
                </Typography>
              </Box>
            ))}

            {cells.map((cell) => {
              const daySessions = sessionsByDate.get(cell.iso) ?? []
              const isToday = cell.iso === todayIso
              return (
                <Box
                  key={cell.iso}
                  role="button"
                  tabIndex={0}
                  onClick={() => goToDay(cell.date)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') goToDay(cell.date)
                  }}
                  sx={{
                    border: 1,
                    borderColor: isToday ? 'primary.main' : 'divider',
                    borderRadius: 2,
                    p: 1,
                    minHeight: 110,
                    bgcolor: cell.inMonth
                      ? 'background.paper'
                      : (theme) =>
                          theme.palette.mode === 'dark'
                            ? alpha(theme.palette.common.white, 0.03)
                            : alpha(theme.palette.common.black, 0.02),
                    transition: 'background-color 120ms ease, box-shadow 120ms ease',
                    cursor: 'pointer',
                    outline: 'none',
                    '&:focus-visible': {
                      boxShadow: (theme) => `0 0 0 3px ${alpha(theme.palette.primary.main, 0.35)}`
                    },
                    '&:hover': {
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark'
                          ? alpha(theme.palette.common.white, 0.06)
                          : alpha(theme.palette.common.black, 0.03),
                      boxShadow: (theme) =>
                        theme.palette.mode === 'dark' ? '0 10px 28px rgba(0,0,0,0.55)' : '0 6px 20px rgba(0,0,0,0.06)'
                    },
                    ...(isToday
                      ? {
                          boxShadow: (theme) => `0 0 0 2px ${alpha(theme.palette.primary.main, 0.25)}`
                        }
                      : null)
                  }}
                >
                  <Stack spacing={0.5}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      {isToday ? (
                        <Box sx={{ width: 8, height: 8, borderRadius: 999, bgcolor: 'primary.main', flex: '0 0 auto' }} />
                      ) : null}
                      <Typography variant="caption" color={cell.inMonth ? 'text.primary' : 'text.secondary'}>
                        {cell.date.getDate()}
                      </Typography>
                    </Stack>

                    <Stack spacing={0.5}>
                      {daySessions.slice(0, 4).map((s) => (
                        <Button
                          key={s.id}
                          size="small"
                          variant="text"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelected(s)
                          }}
                          sx={[
                            {
                              justifyContent: 'flex-start',
                              textTransform: 'none',
                              width: '100%',
                              px: 0.75,
                              py: 0.25,
                              minHeight: 0,
                              borderRadius: 1
                            },
                            entrySx(s.status)
                          ]}
                        >
                          <Typography variant="caption" noWrap>
                            {formatTimeHHMM(s.session_time)} {athleteLabel(s)}
                          </Typography>
                        </Button>
                      ))}
                      {daySessions.length > 4 ? (
                        <Typography variant="caption" color="text.secondary">
                          +{daySessions.length - 4} mais
                        </Typography>
                      ) : null}
                    </Stack>
                  </Stack>
                </Box>
              )
            })}
          </Box>
        ) : null}

        {view === 'week' ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 1 }}>
            {weekDays.map((d) => {
              const daySessions = sessionsByDate.get(d.iso) ?? []
              const isToday = d.iso === todayIso
              return (
                <Box
                  key={d.iso}
                  role="button"
                  tabIndex={0}
                  onClick={() => goToDay(d.date)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') goToDay(d.date)
                  }}
                  sx={{
                    border: 1,
                    borderColor: isToday ? 'primary.main' : 'divider',
                    borderRadius: 2,
                    p: 1,
                    minHeight: 160,
                    bgcolor: 'background.paper',
                    cursor: 'pointer',
                    outline: 'none',
                    '&:focus-visible': {
                      boxShadow: (theme) => `0 0 0 3px ${alpha(theme.palette.primary.main, 0.35)}`
                    },
                    ...(isToday
                      ? {
                          boxShadow: (theme) => `0 0 0 2px ${alpha(theme.palette.primary.main, 0.25)}`
                        }
                      : null)
                  }}
                >
                  <Stack spacing={0.75}>
                    <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1}>
                      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                        {isToday ? (
                          <Box sx={{ width: 8, height: 8, borderRadius: 999, bgcolor: 'primary.main', flex: '0 0 auto' }} />
                        ) : null}
                        <Typography variant="subtitle2" fontWeight={900} sx={{ textTransform: 'capitalize' }} noWrap>
                          {d.label}
                        </Typography>
                      </Stack>
                      {daySessions.length ? <Chip size="small" label={daySessions.length} variant="outlined" /> : null}
                    </Stack>

                    <Stack spacing={0.5}>
                      {daySessions.map((s) => (
                        <Button
                          key={s.id}
                          size="small"
                          variant="text"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelected(s)
                          }}
                          sx={[
                            {
                              justifyContent: 'flex-start',
                              textTransform: 'none',
                              width: '100%',
                              px: 0.75,
                              py: 0.25,
                              minHeight: 0,
                              borderRadius: 1
                            },
                            entrySx(s.status)
                          ]}
                        >
                          <Typography variant="caption" noWrap>
                            {formatTimeHHMM(s.session_time)} {athleteLabel(s)}
                          </Typography>
                        </Button>
                      ))}
                      {daySessions.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      ) : null}
                    </Stack>
                  </Stack>
                </Box>
              )
            })}
          </Box>
        ) : null}

        {view === 'day' ? (
          <Box>
            {(() => {
              const dayIso = isoDate(cursorDate)
              const daySessions = sessionsByDate.get(dayIso) ?? []
              const isToday = dayIso === todayIso
              return (
                <Stack spacing={1}>
                  {isToday ? (
                    <Box>
                      <Chip size="small" label="Hoje" color="primary" variant="filled" />
                    </Box>
                  ) : null}
                  {daySessions.length === 0 ? (
                    <Alert severity="info">Sem sessões para este dia.</Alert>
                  ) : (
                    daySessions.map((s) => (
                      <Box
                        key={s.id}
                        sx={[
                          {
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 2,
                            p: 1.25,
                            bgcolor: 'background.paper'
                          },
                          entrySx(s.status)
                        ]}
                      >
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="space-between">
                          <Box sx={{ minWidth: 0 }}>
                            <Typography fontWeight={900} noWrap title={s.session_name}>
                              {formatTimeHHMM(s.session_time)} • {athleteLabel(s)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {s.session_type ? s.session_type : '—'}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1} alignItems="center">
                            {s.status ? (
                              <Chip
                                size="small"
                                label={statusLabel(s.status)}
                                color={statusChipColor(s.status)}
                                variant={s.status === 'Scheduled' ? 'filled' : 'outlined'}
                              />
                            ) : null}
                            <Button size="small" variant="contained" onClick={() => setSelected(s)}>
                              Abrir
                            </Button>
                          </Stack>
                        </Stack>
                      </Box>
                    ))
                  )}
                </Stack>
              )
            })()}
          </Box>
        ) : null}
      </Stack>

      <Dialog open={!!selected} onClose={() => setSelected(null)} fullWidth maxWidth="md">
        {selected ? (
          <DialogTitle sx={{ pb: 1.25 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems={{ sm: 'center' }} justifyContent="space-between">
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" fontWeight={900} noWrap title={selected.session_name}>
                  {selected.session_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(selected.session_date)} {formatTimeHHMM(selected.session_time)}
                </Typography>
              </Box>
              <Chip
                label={statusLabel(selected.status)}
                color={statusChipColor(selected.status)}
                variant={selected.status === 'Scheduled' ? 'filled' : 'outlined'}
              />
            </Stack>
          </DialogTitle>
        ) : (
          <DialogTitle>Detalhes da sessão</DialogTitle>
        )}

        <DialogContent dividers>
          {selected ? <TrainingSessionDetailsCard session={selected} /> : null}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setSelected(null)}>Fechar</Button>

          {selected ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ ml: 'auto' }}>
              <Button
                variant="outlined"
                color="warning"
                disabled={
                  updateMutation.isPending ||
                  deleteMutation.isPending ||
                  selected.status === 'Completed' ||
                  selected.status === 'Cancelled'
                }
                onClick={() => {
                  if (!selected) return
                  if (!window.confirm('Cancelar esta sessão?')) return
                  updateMutation.mutate({ id: selected.id, payload: { status: 'Cancelled' } })
                }}
              >
                Cancelar sessão
              </Button>

              <Button
                variant="contained"
                disabled={deleteMutation.isPending || updateMutation.isPending || !canStartSelected}
                onClick={() => {
                  if (!selected) return
                  try {
                    localStorage.setItem(ACTIVE_SESSION_KEY, String(selected.id))
                  } catch {
                    // ignore
                  }
                  setSelected(null)
                  navigate('/treino')
                }}
              >
                Iniciar treino
              </Button>

              <Button
                color="error"
                disabled={deleteMutation.isPending || updateMutation.isPending}
                onClick={() => {
                  if (!selected) return
                  if (!window.confirm('Eliminar esta sessão? Esta ação não pode ser desfeita.')) return
                  deleteMutation.mutate(selected.id)
                }}
              >
                Eliminar
              </Button>
            </Stack>
          ) : null}
        </DialogActions>
      </Dialog>
    </Container>
  )
}
