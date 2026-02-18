import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import { useTheme } from '@mui/material/styles'
import { useQuery } from '@tanstack/react-query'

import { listAthletes } from '../api/athletes'
import { listEvaluations, type Evaluation } from '../api/evaluations'
import { listTrainingSessions, type TrainingSession } from '../api/trainingSessions'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function asIsoDay(value: string | null | undefined): string | null {
  if (!value) return null
  const s = String(value)
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat('pt-PT', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

function parseNumber(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const s = String(value).trim()
  if (!s) return null
  const m = s.match(/(\d+(?:\.\d+)?)/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

function parseReps(value: unknown): number | null {
  const s = String(value ?? '').trim()
  if (!s) return null
  // Accepts "8" or "8-10"; use first number.
  const m = s.match(/(\d+(?:\.\d+)?)/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

type SeriesPoint = { date: string; value: number }

function buildSeries(points: Array<{ date: string; value: number | null | undefined }>): SeriesPoint[] {
  const bestByDate = new Map<string, number>()
  for (const p of points) {
    if (!p.date) continue
    const v = p.value
    if (typeof v !== 'number' || !Number.isFinite(v)) continue
    const prev = bestByDate.get(p.date)
    bestByDate.set(p.date, prev == null ? v : Math.max(prev, v))
  }
  return Array.from(bestByDate.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }))
}

function metricDelta(series: SeriesPoint[]) {
  if (series.length === 0) return null
  if (series.length === 1) return { latest: series[0].value, delta: null as number | null }
  const first = series[0].value
  const latest = series[series.length - 1].value
  return { latest, delta: latest - first }
}

function Sparkline(props: { series: SeriesPoint[] }) {
  const w = 220
  const h = 56
  const pad = 6

  const ys = props.series.map((p) => p.value)
  const min = Math.min(...ys)
  const max = Math.max(...ys)
  const span = max - min || 1

  const points = props.series
    .map((p, idx) => {
      const x = pad + (idx / Math.max(1, props.series.length - 1)) * (w - pad * 2)
      const y = pad + (1 - (p.value - min) / span) * (h - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <Box sx={{ width: w, height: h }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.8" />
        {props.series.map((p, idx) => {
          const x = pad + (idx / Math.max(1, props.series.length - 1)) * (w - pad * 2)
          const y = pad + (1 - (p.value - min) / span) * (h - pad * 2)
          return <circle key={idx} cx={x} cy={y} r={2.5} fill="currentColor" opacity="0.9" />
        })}
      </svg>
    </Box>
  )
}

type ChartSeries = { name: string; series: SeriesPoint[] }

function TimeSeriesChart(props: { seriesList: ChartSeries[] }) {
  const theme = useTheme()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const [hover, setHover] = useState<
    | {
        date: string
        items: Array<{ metric: string; value: number; color: string }>
        x: number
        y: number
        cw: number
        ch: number
      }
    | null
  >(null)

  const [tooltipSize, setTooltipSize] = useState<{ w: number; h: number } | null>(null)

  useLayoutEffect(() => {
    if (!hover) {
      setTooltipSize(null)
      return
    }
    const el = tooltipRef.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    if (!w || !h) return
    setTooltipSize({ w, h })
    // Only re-measure when the tooltip content changes (date/items).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover?.date, hover?.items.length])

  const w = 900
  const h = 340
  const padLeft = 56
  const padRight = 18
  const padTop = 14
  const padBottom = 56

  const colors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main
  ]

  const valueByMetricAndDate = useMemo(() => {
    const byMetric = new Map<string, Map<string, number>>()
    for (const s of props.seriesList) {
      const byDate = new Map<string, number>()
      for (const p of s.series) byDate.set(p.date, p.value)
      byMetric.set(s.name, byDate)
    }
    return byMetric
  }, [props.seriesList])

  const dates = useMemo(() => {
    const all = new Set<string>()
    for (const s of props.seriesList) {
      for (const p of s.series) all.add(p.date)
    }
    return Array.from(all).sort((a, b) => a.localeCompare(b))
  }, [props.seriesList])

  const values = useMemo(() => {
    const all: number[] = []
    for (const s of props.seriesList) {
      for (const p of s.series) all.push(p.value)
    }
    return all
  }, [props.seriesList])

  if (dates.length === 0 || values.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Sem dados para desenhar o gráfico.
      </Typography>
    )
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  const xForIndex = (idx: number) => {
    const plotW = w - padLeft - padRight
    if (dates.length === 1) return padLeft + plotW / 2
    return padLeft + (idx / (dates.length - 1)) * plotW
  }

  const bandForIndex = (idx: number) => {
    const x = xForIndex(idx)
    const start = idx === 0 ? padLeft : (xForIndex(idx - 1) + x) / 2
    const end = idx === dates.length - 1 ? w - padRight : (x + xForIndex(idx + 1)) / 2
    return { start, end, x }
  }

  const makeHoverItems = (date: string) => {
    const items: Array<{ metric: string; value: number; color: string }> = []
    props.seriesList.forEach((s, idx) => {
      const v = valueByMetricAndDate.get(s.name)?.get(date)
      if (typeof v === 'number' && Number.isFinite(v)) {
        items.push({ metric: s.name, value: v, color: colors[idx % colors.length] })
      }
    })
    return items
  }
  const yForValue = (value: number) => {
    const plotH = h - padTop - padBottom
    return padTop + (1 - (value - min) / span) * plotH
  }

  const xTickIdxs = (() => {
    const tickCount = Math.min(6, dates.length)
    if (tickCount <= 1) return [0]
    const chosen = new Set<number>()
    for (let i = 0; i < tickCount; i++) {
      const idx = Math.round((i * (dates.length - 1)) / (tickCount - 1))
      chosen.add(idx)
    }
    return Array.from(chosen.values()).sort((a, b) => a - b)
  })()

  const yTicks = (() => {
    const tickCount = 5
    const vals: number[] = []
    for (let i = 0; i < tickCount; i++) vals.push(min + (i * span) / (tickCount - 1))
    return vals
  })()

  return (
    <Box ref={containerRef} sx={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      <Box sx={{ width: '100%', height: h }}>
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Gráfico de métricas">
          {yTicks.map((t, i) => {
            const y = yForValue(t)
            return (
              <g key={i}>
                <line x1={padLeft} x2={w - padRight} y1={y} y2={y} stroke="#eaeaea" />
                <text x={padLeft - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">
                  {t.toFixed(1)}
                </text>
              </g>
            )
          })}

          <line x1={padLeft} x2={padLeft} y1={padTop} y2={h - padBottom} stroke="#cfcfcf" />
          <line x1={padLeft} x2={w - padRight} y1={h - padBottom} y2={h - padBottom} stroke="#cfcfcf" />

          {xTickIdxs.map((idx) => {
            const x = xForIndex(idx)
            const d = dates[idx]
            return (
              <g key={d}>
                <line x1={x} x2={x} y1={h - padBottom} y2={h - padBottom + 6} stroke="#cfcfcf" />
                <text x={x} y={h - padBottom + 22} textAnchor="middle" fontSize="11" fill="#6b7280">
                  {formatDate(d)}
                </text>
              </g>
            )
          })}

          {props.seriesList.map((s, seriesIdx) => {
            const color = colors[seriesIdx % colors.length]
            const pts = s.series
              .map((p) => ({
                ...p,
                x: xForIndex(dates.indexOf(p.date)),
                y: yForValue(p.value)
              }))
              .sort((a, b) => a.date.localeCompare(b.date))

            const d = pts
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(' ')

            return (
              <g key={s.name}>
                <path d={d} fill="none" stroke={color} strokeWidth={2.25} opacity={0.85} />
                {pts.map((p) => (
                  <circle
                    key={`${s.name}-${p.date}`}
                    cx={p.x}
                    cy={p.y}
                    r={4}
                    fill={color}
                    stroke="#fff"
                    strokeWidth={1.5}
                    pointerEvents="none"
                  />
                ))}
              </g>
            )
          })}

          {/* Hover bands per date (so overlapping points show all values) */}
          <g>
            {dates.map((d, idx) => {
              const { start, end } = bandForIndex(idx)
              const width = Math.max(0, end - start)
              return (
                <rect
                  key={`band-${d}`}
                  x={start}
                  y={padTop}
                  width={width}
                  height={h - padTop - padBottom}
                  fill="transparent"
                  onMouseEnter={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect()
                    if (!rect) return
                    const items = makeHoverItems(d)
                    if (items.length === 0) return
                    setHover({
                      date: d,
                      items,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      cw: rect.width,
                      ch: rect.height
                    })
                  }}
                  onMouseMove={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect()
                    if (!rect) return
                    const items = makeHoverItems(d)
                    if (items.length === 0) return
                    setHover({
                      date: d,
                      items,
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      cw: rect.width,
                      ch: rect.height
                    })
                  }}
                  onMouseLeave={() => setHover(null)}
                />
              )
            })}
          </g>
        </svg>
      </Box>

      {hover ? (() => {
        const pad = 8
        const offset = 12
        const estimated = { w: 280, h: Math.min(220, 32 + hover.items.length * 22) }
        const tip = tooltipSize ?? estimated

        let left = hover.x + offset
        let top = hover.y + offset

        // Flip to the left/bottom when near edges, and clamp.
        if (left + tip.w > hover.cw - pad) left = hover.x - offset - tip.w
        if (top + tip.h > hover.ch - pad) top = hover.y - offset - tip.h

        left = Math.max(pad, Math.min(left, hover.cw - pad - tip.w))
        top = Math.max(pad, Math.min(top, hover.ch - pad - tip.h))

        return (
          <Box
            ref={tooltipRef}
            sx={{
              position: 'absolute',
              left,
              top,
              pointerEvents: 'none',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              px: 1.25,
              py: 0.75,
              boxShadow: 3,
              maxWidth: 280
            }}
          >
          <Typography variant="caption" color="text.secondary" display="block">
            {formatDate(hover.date)}
          </Typography>
          {hover.items.map((it) => (
            <Stack key={it.metric} direction="row" spacing={1} alignItems="baseline" sx={{ minWidth: 0 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: 999, bgcolor: it.color, flex: '0 0 auto', mt: '3px' }} />
              <Typography variant="body2" fontWeight={800} noWrap title={it.metric} sx={{ minWidth: 0, flex: '1 1 auto' }}>
                {it.metric}
              </Typography>
              <Typography variant="body2" sx={{ flex: '0 0 auto' }}>{it.value.toFixed(1)}</Typography>
            </Stack>
          ))}
          </Box>
        )
      })() : null}
    </Box>
  )
}

function buildAvailableMetrics(evaluations: Evaluation[], completedSessions: TrainingSession[]) {
  const metricByDate: Record<string, Record<string, number>> = {}
  const available = new Set<string>()

  for (const e of evaluations) {
    const date = e.evaluation_date
    if (!date) continue
    metricByDate[date] ??= {}

    const add = (name: string, value: number | null | undefined) => {
      if (value == null || !Number.isFinite(value)) return
      available.add(name)
      metricByDate[date][name] = value
    }

    add('Peso Corporal (kg)', e.weight ?? null)
    add('Percentagem Muscular (%)', e.muscle_percentage ?? null)
    add('Percentagem de Gordura (%)', e.fat_percentage ?? null)
    add('Percentagem de Água (%)', e.water_percentage ?? null)
    add('Percentagem Óssea (%)', e.bone_percentage ?? null)
  }

  for (const s of completedSessions) {
    const date = s.session_date
    if (!date) continue
    const cd: any = s.completed_data
    const exs: any[] = Array.isArray(cd?.exercises) ? cd.exercises : []
    if (exs.length === 0) continue

    for (const ex of exs) {
      if (ex?.status !== 'completed') continue
      const name = String(ex?.exercise_name ?? '').trim()
      if (!name) continue

      // Weight
      const w = parseNumber(ex?.actual_weight)
      if (w != null) {
        metricByDate[date] ??= {}
        const metric = `${name} - Peso`
        available.add(metric)
        metricByDate[date][metric] = Math.max(metricByDate[date][metric] ?? -Infinity, w)
      }

      // Volume = sets * reps
      const sets = parseNumber(ex?.actual_sets)
      const reps = parseReps(ex?.actual_reps)
      if (sets != null && reps != null) {
        const volume = sets * reps
        metricByDate[date] ??= {}
        const metric = `${name} - Volume`
        available.add(metric)
        metricByDate[date][metric] = Math.max(metricByDate[date][metric] ?? -Infinity, volume)
      }
    }
  }

  const allDates = Object.keys(metricByDate).sort()
  return { availableMetrics: Array.from(available).sort(), metricByDate, allDates }
}

export function AnalysisPage() {
  const athletesQuery = useQuery({ queryKey: ['athletes'], queryFn: listAthletes })
  const athletes = athletesQuery.data ?? []

  const [athleteId, setAthleteId] = useState<number | ''>('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [didInitDateRange, setDidInitDateRange] = useState(false)
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
  const [isCompositeMode, setIsCompositeMode] = useState(false)
  const [hideInsufficientMetrics, setHideInsufficientMetrics] = useState(true)

  const [metricModal, setMetricModal] = useState<{
    open: boolean
    title: string
    seriesList: ChartSeries[]
  }>({ open: false, title: '', seriesList: [] })

  const openMetricModal = (title: string, seriesList: ChartSeries[]) => {
    setMetricModal({ open: true, title, seriesList })
  }

  const evaluationsQuery = useQuery({
    queryKey: ['evaluations', athleteId, start, end],
    queryFn: () =>
      listEvaluations({
        athlete_id: athleteId === '' ? undefined : Number(athleteId),
        start: start || undefined,
        end: end || undefined
      }),
    enabled: athleteId !== ''
  })

  const completedSessionsQuery = useQuery({
    queryKey: ['training-sessions', athleteId, start, end, 'Completed'],
    queryFn: () =>
      listTrainingSessions({
        athlete_id: athleteId === '' ? undefined : Number(athleteId),
        start: start || undefined,
        end: end || undefined,
        status: 'Completed'
      }),
    enabled: athleteId !== ''
  })

  const evaluations = evaluationsQuery.data ?? []
  const completedSessions = completedSessionsQuery.data ?? []

  useEffect(() => {
    if (athleteId === '') {
      setDidInitDateRange(false)
      return
    }
    if (didInitDateRange) return
    if (evaluationsQuery.isLoading || completedSessionsQuery.isLoading) return

    const dates = [
      ...evaluations.map((e) => asIsoDay(e.evaluation_date)),
      ...completedSessions.map((s) => asIsoDay(s.session_date))
    ].filter(Boolean) as string[]

    if (dates.length === 0) return

    let min = dates[0]
    let max = dates[0]
    for (const d of dates) {
      if (d < min) min = d
      if (d > max) max = d
    }

    setStart(min)
    setEnd(max)
    setDidInitDateRange(true)
  }, [
    athleteId,
    completedSessions,
    completedSessionsQuery.isLoading,
    didInitDateRange,
    evaluations,
    evaluationsQuery.isLoading
  ])

  const metrics = useMemo(() => {
    return buildAvailableMetrics(evaluations, completedSessions)
  }, [completedSessions, evaluations])

  const visibleMetricSet = useMemo(() => {
    if (selectedMetrics.length === 0) return null
    return new Set(selectedMetrics)
  }, [selectedMetrics])

  const seriesByMetric = useMemo(() => {
    const map = new Map<string, SeriesPoint[]>()
    for (const metric of metrics.availableMetrics) {
      const points: Array<{ date: string; value: number | null | undefined }> = []
      for (const date of metrics.allDates) {
        const v = metrics.metricByDate[date]?.[metric]
        points.push({ date, value: v })
      }
      const series = buildSeries(points)
      if (series.length > 0) map.set(metric, series)
    }
    return map
  }, [metrics.allDates, metrics.availableMetrics, metrics.metricByDate])

  const metricOptions = useMemo(() => {
    if (!hideInsufficientMetrics) return metrics.availableMetrics
    return metrics.availableMetrics.filter((m) => (seriesByMetric.get(m)?.length ?? 0) >= 2)
  }, [hideInsufficientMetrics, metrics.availableMetrics, seriesByMetric])

  const compositeSeries = useMemo(() => {
    if (selectedMetrics.length === 0) return []
    return selectedMetrics
      .map((m) => ({ name: m, series: seriesByMetric.get(m) ?? [] }))
      .filter((x) => (hideInsufficientMetrics ? x.series.length >= 2 : x.series.length > 0))
  }, [hideInsufficientMetrics, selectedMetrics, seriesByMetric])

  const individualBodySeries = useMemo(() => {
    // Metrics from evaluations (body composition) don't have the " - " suffix.
    const names = metrics.availableMetrics.filter((m) => {
      if (m.includes(' - ')) return false
      if (!visibleMetricSet) return true
      return visibleMetricSet.has(m)
    })
    return names
      .map((m) => ({ name: m, series: seriesByMetric.get(m) ?? [] }))
      .filter((x) => (hideInsufficientMetrics ? x.series.length >= 2 : x.series.length > 0))
  }, [hideInsufficientMetrics, metrics.availableMetrics, seriesByMetric, visibleMetricSet])

  const individualExerciseGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        weight?: SeriesPoint[]
        volume?: SeriesPoint[]
      }
    >()

    for (const [metric, series] of seriesByMetric.entries()) {
      if (visibleMetricSet && !visibleMetricSet.has(metric)) continue
      if (!metric.includes(' - ')) continue
      const idx = metric.lastIndexOf(' - ')
      const exName = metric.slice(0, idx).trim()
      const kind = metric.slice(idx + 3).trim().toLowerCase()
      if (!exName) continue

      const g = groups.get(exName) ?? {}
      if (hideInsufficientMetrics && series.length < 2) {
        // Skip metrics that would show "Sem dados suficientes".
      } else {
        if (kind === 'peso') g.weight = series
        else if (kind === 'volume') g.volume = series
      }
      groups.set(exName, g)
    }

    return Array.from(groups.entries())
      .map(([exercise, g]) => ({ exercise, ...g }))
      .filter((g) => !!g.weight || !!g.volume)
      .sort((a, b) => a.exercise.localeCompare(b.exercise, 'pt-PT'))
  }, [hideInsufficientMetrics, seriesByMetric, visibleMetricSet])

  const kpis = useMemo(() => {
    const totalCompleted = completedSessions.length
    const totalDuration = completedSessions.reduce((acc, s) => acc + (s.duration ?? 0), 0)

    let completedExerciseCount = 0
    for (const s of completedSessions) {
      const cd: any = s.completed_data
      const exs: any[] = Array.isArray(cd?.exercises) ? cd.exercises : []
      completedExerciseCount += exs.filter((e) => e?.status === 'completed').length
    }

    const latestEvalDate = evaluations.length > 0 ? evaluations[evaluations.length - 1].evaluation_date : null

    return { totalCompleted, totalDuration, completedExerciseCount, latestEvalDate }
  }, [completedSessions, evaluations])

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4">Análise</Typography>
          <Typography variant="body2" color="text.secondary">
            Métricas de composição corporal e performance (sessões concluídas).
          </Typography>
        </Box>

        {athletesQuery.isError ? <Alert severity="error">Falha ao carregar atletas.</Alert> : null}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' },
            gap: 2,
            alignItems: 'stretch'
          }}
        >
          <Autocomplete
            options={athletes}
            getOptionLabel={(a) => `${a.first_name} ${a.last_name}`}
            value={athleteId === '' ? null : athletes.find((a) => a.id === athleteId) ?? null}
            onChange={(_, v) => {
              setAthleteId(v ? v.id : '')
              setSelectedMetrics([])
              setIsCompositeMode(false)
              setStart('')
              setEnd('')
              setDidInitDateRange(false)
            }}
            renderInput={(params) => <TextField {...params} label="Atleta" />}
            fullWidth
          />

          <TextField
            label="Início"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Fim"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        {athleteId === '' ? (
          <Alert severity="info">Selecione um atleta para ver a análise.</Alert>
        ) : null}

        {athleteId !== '' && (evaluationsQuery.isError || completedSessionsQuery.isError) ? (
          <Alert severity="error">Falha ao carregar dados para a análise.</Alert>
        ) : null}

        {athleteId !== '' && !evaluationsQuery.isLoading && !completedSessionsQuery.isLoading ? (
          <Stack spacing={2}>
            {metrics.availableMetrics.length === 0 ? (
              <Alert severity="warning">
                Ainda não há métricas disponíveis. Adicione avaliações e/ou complete sessões de treino.
              </Alert>
            ) : (
              <>
                <Stack spacing={2}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Card variant="outlined" sx={{ flex: 1, borderRadius: 2 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">Sessões concluídas</Typography>
                        <Typography variant="h5" fontWeight={800}>{kpis.totalCompleted}</Typography>
                      </CardContent>
                    </Card>
                    <Card variant="outlined" sx={{ flex: 1, borderRadius: 2 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">Duração total (min)</Typography>
                        <Typography variant="h5" fontWeight={800}>{kpis.totalDuration}</Typography>
                      </CardContent>
                    </Card>
                    <Card variant="outlined" sx={{ flex: 1, borderRadius: 2 }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">Exercícios completados</Typography>
                        <Typography variant="h5" fontWeight={800}>{kpis.completedExerciseCount}</Typography>
                      </CardContent>
                    </Card>
                  </Stack>
                </Stack>

                <Divider />

                <Stack spacing={2}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ sm: 'center' }}
                    justifyContent="space-between"
                  >
                    <Typography variant="h6">Métricas</Typography>

                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={2}
                      alignItems={{ sm: 'center' }}
                      sx={{ width: { xs: '100%', sm: 'auto' } }}
                    >
                      <FormControlLabel
                        control={<Switch checked={isCompositeMode} onChange={(_, v) => setIsCompositeMode(v)} />}
                        label={isCompositeMode ? 'Vista Composta' : 'Vista Individual'}
                        sx={{ mr: 0 }}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={hideInsufficientMetrics}
                            onChange={(_, v) => setHideInsufficientMetrics(v)}
                            size="small"
                          />
                        }
                        label="Ocultar sem dados"
                        sx={{ mr: 0 }}
                      />
                    </Stack>
                  </Stack>

                  <Autocomplete
                    multiple
                    options={metricOptions}
                    value={selectedMetrics}
                    onChange={(_, value) => setSelectedMetrics(value)}
                    renderInput={(params) => <TextField {...params} label="Selecione métricas" />}
                    fullWidth
                  />
                </Stack>

                {isCompositeMode ? (
                  <>
                    <Divider />

                    <Typography variant="h6">Gráfico composto</Typography>
                    {compositeSeries.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        Selecione uma ou mais métricas para ver o gráfico.
                      </Typography>
                    ) : (
                      <Card variant="outlined" sx={{ borderRadius: 2 }}>
                        <CardContent>
                          <Stack spacing={2}>
                            <TimeSeriesChart seriesList={compositeSeries} />
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                              {compositeSeries.map((s, i) => (
                                <Chip
                                  key={s.name}
                                  label={s.name}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    borderColor: (theme) =>
                                      [
                                        theme.palette.primary.main,
                                        theme.palette.secondary.main,
                                        theme.palette.success.main,
                                        theme.palette.warning.main,
                                        theme.palette.error.main,
                                        theme.palette.info.main
                                      ][i % 6],
                                    color: (theme) =>
                                      [
                                        theme.palette.primary.main,
                                        theme.palette.secondary.main,
                                        theme.palette.success.main,
                                        theme.palette.warning.main,
                                        theme.palette.error.main,
                                        theme.palette.info.main
                                      ][i % 6]
                                  }}
                                />
                              ))}
                            </Stack>

                          </Stack>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <>
                    {individualExerciseGroups.length === 0 && individualBodySeries.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">Sem dados suficientes.</Typography>
                    ) : (
                      <Stack spacing={2}>
                        {individualBodySeries.length > 0 ? (
                          <Card variant="outlined" sx={{ borderRadius: 2 }}>
                            <CardContent>
                              <Typography fontWeight={800} sx={{ mb: 1 }}>Composição corporal</Typography>
                              <Stack spacing={1.5}>
                                {individualBodySeries.map(({ name, series }) => {
                                  const md = metricDelta(series)
                                  const latest = md?.latest
                                  const delta = md?.delta
                                  const deltaText = delta == null ? null : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`
                                  return (
                                    <Stack key={name} direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
                                      <Box sx={{ minWidth: 0 }}>
                                        <Typography fontWeight={800} noWrap title={name}>{name}</Typography>
                                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                          <Chip size="small" label={`Último: ${latest?.toFixed(1) ?? '—'}`} />
                                          {deltaText ? <Chip size="small" label={`Δ: ${deltaText}`} color={delta != null && delta < 0 ? 'warning' : 'success'} variant="outlined" /> : null}
                                          <Chip size="small" label={`${series.length} referências(s)`} variant="outlined" />
                                        </Stack>
                                      </Box>
                                      {series.length >= 2 ? (
                                        <Box
                                          role="button"
                                          tabIndex={0}
                                          onClick={() => openMetricModal(name, [{ name, series }])}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') openMetricModal(name, [{ name, series }])
                                          }}
                                          sx={{
                                            color: 'primary.main',
                                            cursor: 'pointer',
                                            borderRadius: 1,
                                            px: 0.5,
                                            '&:hover': { bgcolor: 'action.hover' },
                                            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 }
                                          }}
                                        >
                                          <Sparkline series={series} />
                                        </Box>
                                      ) : (
                                        <Typography variant="body2" color="text.secondary">Sem dados suficientes</Typography>
                                      )}
                                    </Stack>
                                  )
                                })}
                              </Stack>
                            </CardContent>
                          </Card>
                        ) : null}

                        {individualExerciseGroups.map((g) => (
                          <Card key={g.exercise} variant="outlined" sx={{ borderRadius: 2 }}>
                            <CardContent>
                              <Typography fontWeight={800} sx={{ mb: 1 }} noWrap title={g.exercise}>
                                {g.exercise}
                              </Typography>

                              <Stack spacing={1.5}>
                                {g.weight ? (
                                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
                                    <Box sx={{ minWidth: 0 }}>
                                      <Typography fontWeight={800}>Peso</Typography>
                                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                        <Chip size="small" label={`Último: ${metricDelta(g.weight)?.latest?.toFixed(1) ?? '—'}`} />
                                        <Chip size="small" label={`${g.weight.length} referência(s)`} variant="outlined" />
                                      </Stack>
                                    </Box>
                                    {g.weight.length >= 2 ? (
                                      <Box
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => openMetricModal(`${g.exercise} - Peso`, [{ name: `${g.exercise} - Peso`, series: g.weight ?? [] }])}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            openMetricModal(`${g.exercise} - Peso`, [{ name: `${g.exercise} - Peso`, series: g.weight ?? [] }])
                                          }
                                        }}
                                        sx={{
                                          color: 'primary.main',
                                          cursor: 'pointer',
                                          borderRadius: 1,
                                          px: 0.5,
                                          '&:hover': { bgcolor: 'action.hover' },
                                          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 }
                                        }}
                                      >
                                        <Sparkline series={g.weight} />
                                      </Box>
                                    ) : (
                                      <Typography variant="body2" color="text.secondary">Sem dados suficientes</Typography>
                                    )}
                                  </Stack>
                                ) : null}

                                {g.volume ? (
                                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
                                    <Box sx={{ minWidth: 0 }}>
                                      <Typography fontWeight={800}>Volume</Typography>
                                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                        <Chip size="small" label={`Último: ${metricDelta(g.volume)?.latest?.toFixed(1) ?? '—'}`} />
                                        <Chip size="small" label={`${g.volume.length} referência(s)`} variant="outlined" />
                                      </Stack>
                                    </Box>
                                    {g.volume.length >= 2 ? (
                                      <Box
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => openMetricModal(`${g.exercise} - Volume`, [{ name: `${g.exercise} - Volume`, series: g.volume ?? [] }])}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' || e.key === ' ') {
                                            openMetricModal(`${g.exercise} - Volume`, [{ name: `${g.exercise} - Volume`, series: g.volume ?? [] }])
                                          }
                                        }}
                                        sx={{
                                          color: 'primary.main',
                                          cursor: 'pointer',
                                          borderRadius: 1,
                                          px: 0.5,
                                          '&:hover': { bgcolor: 'action.hover' },
                                          '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 }
                                        }}
                                      >
                                        <Sparkline series={g.volume} />
                                      </Box>
                                    ) : (
                                      <Typography variant="body2" color="text.secondary">Sem dados suficientes</Typography>
                                    )}
                                  </Stack>
                                ) : null}
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    )}
                  </>
                )}

              </>
            )}
          </Stack>
        ) : null}
      </Stack>

      <Dialog
        open={metricModal.open}
        onClose={() => setMetricModal((m) => ({ ...m, open: false }))}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{metricModal.title || 'Métrica'}</DialogTitle>
        <DialogContent dividers>
          {metricModal.seriesList.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Sem dados suficientes.
            </Typography>
          ) : (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Vista composta para esta métrica.
              </Typography>

              <TimeSeriesChart seriesList={metricModal.seriesList} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMetricModal((m) => ({ ...m, open: false }))}>Fechar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
