import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
import PersonIcon from '@mui/icons-material/Person'
import ScaleIcon from '@mui/icons-material/Scale'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew'
import NoteAltIcon from '@mui/icons-material/NoteAlt'
import Autocomplete from '@mui/material/Autocomplete'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon'
import { alpha } from '@mui/material/styles'
import { useMutation, useQuery } from '@tanstack/react-query'

import { listAthletes } from '../api/athletes'
import { createEvaluation, deleteEvaluation, listEvaluations, updateEvaluation, type Evaluation } from '../api/evaluations'
import { queryClient } from '../queryClient'
import { ReservedLinearProgress } from '../components/ReservedLinearProgress'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function asIsoDay(value: string | null | undefined): string | null {
  if (!value) return null
  const s = String(value)
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
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

function initials(firstName?: string | null, lastName?: string | null) {
  const a = (firstName?.trim()?.[0] ?? '').toUpperCase()
  const b = (lastName?.trim()?.[0] ?? '').toUpperCase()
  return `${a}${b}` || 'A'
}

function BoneIcon(props: SvgIconProps) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      {/* Simple “dog bone” silhouette for clarity at small sizes */}
      <circle cx="7.1" cy="9.4" r="2.2" />
      <circle cx="7.1" cy="14.6" r="2.2" />
      <circle cx="16.9" cy="9.4" r="2.2" />
      <circle cx="16.9" cy="14.6" r="2.2" />
      <rect x="7.2" y="10.0" width="9.6" height="4.0" rx="2.0" />
    </SvgIcon>
  )
}

function DetailRow(props: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start">
      <Box sx={{ mt: '2px', color: 'text.secondary' }}>{props.icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
          {props.label}
        </Typography>
        <Typography variant="body2" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
          {props.value}
        </Typography>
      </Box>
    </Stack>
  )
}

export function EvaluationsPage() {
  const athletesQuery = useQuery({ queryKey: ['athletes'], queryFn: listAthletes })

  const [addOpen, setAddOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingEvaluation, setEditingEvaluation] = useState<Evaluation | null>(null)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const [athleteId, setAthleteId] = useState<number | ''>('')
  const [evaluationDate, setEvaluationDate] = useState(todayIso())
  const [weight, setWeight] = useState<number | ''>('')
  const [muscle, setMuscle] = useState<number | ''>('')
  const [fat, setFat] = useState<number | ''>('')
  const [bone, setBone] = useState<number | ''>('')
  const [water, setWater] = useState<number | ''>('')
  const [notes, setNotes] = useState('')

  const [filterAthleteId, setFilterAthleteId] = useState<number | ''>('')
  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')
  const [didInitDateRange, setDidInitDateRange] = useState(false)
  const [didUserEditDateRange, setDidUserEditDateRange] = useState(false)
  const [search, setSearch] = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; label: string } | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const LIST_CHUNK = 25
  const [visibleCount, setVisibleCount] = useState(LIST_CHUNK)

  const resetForm = () => {
    setAthleteId('')
    setEvaluationDate(todayIso())
    setWeight('')
    setMuscle('')
    setFat('')
    setBone('')
    setWater('')
    setNotes('')
    setSubmitAttempted(false)
  }

  const openCreate = () => {
    setFormMode('create')
    setEditingEvaluation(null)
    resetForm()
    setAddOpen(true)
  }

  const openEdit = (evaluation: Evaluation) => {
    setFormMode('edit')
    setEditingEvaluation(evaluation)

    setAthleteId(evaluation.athlete_id)
    setEvaluationDate(asIsoDay(evaluation.evaluation_date) ?? todayIso())
    setWeight(evaluation.weight == null ? '' : Number(evaluation.weight))
    setMuscle(evaluation.muscle_percentage == null ? '' : Number(evaluation.muscle_percentage))
    setFat(evaluation.fat_percentage == null ? '' : Number(evaluation.fat_percentage))
    setWater(evaluation.water_percentage == null ? '' : Number(evaluation.water_percentage))
    setBone(evaluation.bone_percentage == null ? '' : Number(evaluation.bone_percentage))
    setNotes(evaluation.notes ?? '')

    setSubmitAttempted(false)
    setAddOpen(true)
  }

  const effectiveStart = didUserEditDateRange ? (filterStart || '') : ''
  const effectiveEnd = didUserEditDateRange ? (filterEnd || '') : ''

  const evaluationsQuery = useQuery({
    queryKey: ['evaluations', filterAthleteId, effectiveStart, effectiveEnd],
    queryFn: () =>
      listEvaluations({
        athlete_id: filterAthleteId === '' ? undefined : Number(filterAthleteId),
        start: didUserEditDateRange ? (filterStart || undefined) : undefined,
        end: didUserEditDateRange ? (filterEnd || undefined) : undefined
      })
  })

  useEffect(() => {
    // Recompute suggested date range when the athlete filter changes
    // without forcing an extra fetch.
    setDidInitDateRange(false)
    setDidUserEditDateRange(false)
    setFilterStart('')
    setFilterEnd('')
  }, [filterAthleteId])

  useEffect(() => {
    if (didInitDateRange) return
    if (didUserEditDateRange) return
    const dates = (evaluationsQuery.data ?? [])
      .map((e) => asIsoDay(e.evaluation_date))
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
  }, [didInitDateRange, didUserEditDateRange, evaluationsQuery.data])

  const createMutation = useMutation({
    mutationFn: createEvaluation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['evaluations'] })
      resetForm()
      setAddOpen(false)
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateEvaluation>[1] }) => updateEvaluation(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['evaluations'] })
      resetForm()
      setEditingEvaluation(null)
      setFormMode('create')
      setAddOpen(false)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteEvaluation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['evaluations'] })
      setDeleteConfirm(null)
    }
  })

  const athletes = athletesQuery.data ?? []
  const evaluations = evaluationsQuery.data ?? []

  const canSubmit = useMemo(() => athleteId !== '' && evaluationDate, [athleteId, evaluationDate])

  const filteredEvaluations = useMemo(() => {
    let items = evaluations
    const q = normalizeText(search)
    if (!q) return items
    return items.filter((e) => {
      const athleteName = [e.athlete_first_name, e.athlete_last_name].filter(Boolean).join(' ')
      const hay = normalizeText(
        [
          e.evaluation_date,
          athleteName,
          e.weight,
          e.muscle_percentage,
          e.fat_percentage,
          e.water_percentage,
          e.bone_percentage,
          e.notes
        ]
          .filter(Boolean)
          .join(' ')
      )
      return hay.includes(q)
    })
  }, [evaluations, search])

  useEffect(() => {
    setVisibleCount(LIST_CHUNK)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluations, search, filterAthleteId, effectiveStart, effectiveEnd])

  useEffect(() => {
    if (evaluationsQuery.isLoading) return
    if (visibleCount >= filteredEvaluations.length) return
    const id = window.setTimeout(() => {
      setVisibleCount((c) => Math.min(filteredEvaluations.length, c + LIST_CHUNK))
    }, 40)
    return () => window.clearTimeout(id)
  }, [evaluationsQuery.isLoading, filteredEvaluations.length, visibleCount])

  const visibleEvaluations = useMemo(() => {
    return filteredEvaluations.slice(0, visibleCount)
  }, [filteredEvaluations, visibleCount])

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Box>
            <Typography variant="h4">Avaliações</Typography>
            <Typography variant="body2" color="text.secondary">
              Registe medições e acompanhe a evolução por atleta.
            </Typography>
          </Box>

          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Adicionar Avaliação
          </Button>
        </Stack>

        {evaluationsQuery.isError ? <Alert severity="error">Falha ao carregar avaliações.</Alert> : null}

        <ReservedLinearProgress active={evaluationsQuery.isFetching && !evaluationsQuery.isLoading} />

        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
            <Typography variant="h6">
              Histórico ({filteredEvaluations.length}{filteredEvaluations.length !== evaluations.length ? ` de ${evaluations.length}` : ''})
            </Typography>

            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por atleta, data, notas…"
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
              label="Filtrar por atleta"
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

        {evaluationsQuery.isLoading ? (
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
            {visibleEvaluations.map((e) => {
            const athleteName = [e.athlete_first_name, e.athlete_last_name].filter(Boolean).join(' ') || '—'
            return (
              <Accordion
                key={e.id}
                disableGutters
                elevation={0}
                expanded={expandedId === e.id}
                onChange={(_, isExpanded) => setExpandedId(isExpanded ? e.id : null)}
                TransitionProps={{ unmountOnExit: true }}
                sx={{
                  border: 1,
                  borderColor: expandedId === e.id ? 'primary.main' : 'divider',
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
                      {initials(e.athlete_first_name, e.athlete_last_name)}
                    </Avatar>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flexWrap: 'wrap' }}>
                        <Typography fontWeight={800} noWrap sx={{ minWidth: 0 }}>
                          {athleteName}
                        </Typography>
                        <Chip size="small" label={formatDate(e.evaluation_date)} variant="outlined" />
                      </Stack>

                      <Typography variant="body2" color="text.secondary" noWrap>
                        Peso: {e.weight ?? '—'} • Músculo: {e.muscle_percentage ?? '—'} • Gordura: {e.fat_percentage ?? '—'}
                      </Typography>
                    </Box>
                  </Stack>
                </AccordionSummary>

                <AccordionDetails sx={{ px: 2, pb: 2 }}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRadius: 2,
                      borderColor: 'divider',
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark'
                          ? alpha(theme.palette.common.white, 0.03)
                          : alpha(theme.palette.common.black, 0.015)
                    }}
                  >
                    <CardContent>
                      <Stack spacing={2}>
                        <Box
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                            gap: 2
                          }}
                        >
                          <Stack spacing={1.25}>
                            <DetailRow icon={<PersonIcon fontSize="small" />} label="Atleta" value={athleteName} />
                            <DetailRow
                              icon={<CalendarTodayIcon fontSize="small" />}
                              label="Data"
                              value={formatDate(e.evaluation_date)}
                            />
                            {e.notes ? <DetailRow icon={<NoteAltIcon fontSize="small" />} label="Notas" value={e.notes} /> : null}
                          </Stack>

                          <Stack spacing={1.25}>
                            <DetailRow
                              icon={<ScaleIcon fontSize="small" />}
                              label="Peso"
                              value={e.weight != null ? `${e.weight} kg` : '—'}
                            />
                            <DetailRow
                              icon={<FitnessCenterIcon fontSize="small" />}
                              label="Músculo"
                              value={e.muscle_percentage != null ? `${e.muscle_percentage}%` : '—'}
                            />
                            <DetailRow
                              icon={<AccessibilityNewIcon fontSize="small" />}
                              label="Gordura"
                              value={e.fat_percentage != null ? `${e.fat_percentage}%` : '—'}
                            />
                            <DetailRow
                              icon={<WaterDropIcon fontSize="small" />}
                              label="Água"
                              value={e.water_percentage != null ? `${e.water_percentage}%` : '—'}
                            />
                            <DetailRow
                              icon={<BoneIcon fontSize="small" />}
                              label="Osso"
                              value={e.bone_percentage != null ? `${e.bone_percentage}%` : '—'}
                            />
                          </Stack>
                        </Box>

                        <Stack direction="row" justifyContent="flex-end" spacing={1}>
                          <Button
                            variant="outlined"
                            onClick={() => openEdit(e)}
                            disabled={deleteMutation.isPending || createMutation.isPending || updateMutation.isPending}
                          >
                            Editar Avaliação
                          </Button>
                          <Button
                            color="error"
                            variant="outlined"
                            onClick={() => setDeleteConfirm({ id: e.id, label: `${athleteName} — ${formatDate(e.evaluation_date)}` })}
                            disabled={deleteMutation.isPending || createMutation.isPending || updateMutation.isPending}
                          >
                            Eliminar Avaliação
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </AccordionDetails>
              </Accordion>
            )
            })}

            {visibleCount < filteredEvaluations.length ? (
              <Box sx={{ py: 1 }}>
                <LinearProgress />
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {Array.from({ length: Math.min(3, filteredEvaluations.length - visibleCount) }).map((_, i) => (
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

        {athletesQuery.isError ? <Alert severity="warning">Falha ao carregar atletas.</Alert> : null}
      </Stack>

      <Dialog
        open={addOpen}
        onClose={() => {
          setAddOpen(false)
          setEditingEvaluation(null)
          setFormMode('create')
          resetForm()
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{formMode === 'edit' ? 'Editar Avaliação' : 'Registar Avaliação'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="h6">Informações da Avaliação</Typography>

            <Autocomplete
              options={athletes}
              getOptionLabel={(a) => `${a.first_name} ${a.last_name}`}
              value={athleteId === '' ? null : athletes.find((a) => a.id === athleteId) ?? null}
              onChange={(_, v) => setAthleteId(v ? v.id : '')}
              renderInput={(params) => <TextField {...params} label="Atleta*" />}
              fullWidth
            />

            <TextField
              label="Data*"
              type="date"
              value={evaluationDate}
              onChange={(e) => setEvaluationDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Peso (kg)"
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                fullWidth
              />
              <TextField
                label="Músculo (%)"
                type="number"
                value={muscle}
                onChange={(e) => setMuscle(e.target.value === '' ? '' : Number(e.target.value))}
                fullWidth
              />
              <TextField
                label="Gordura (%)"
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value === '' ? '' : Number(e.target.value))}
                fullWidth
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Água (%)"
                type="number"
                value={water}
                onChange={(e) => setWater(e.target.value === '' ? '' : Number(e.target.value))}
                fullWidth
              />
              <TextField
                label="Osso (%)"
                type="number"
                value={bone}
                onChange={(e) => setBone(e.target.value === '' ? '' : Number(e.target.value))}
                fullWidth
              />
            </Stack>

            <TextField
              label="Notas"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />

            {createMutation.isError ? <Alert severity="error">Falha ao guardar avaliação.</Alert> : null}
            {updateMutation.isError ? <Alert severity="error">Falha ao atualizar avaliação.</Alert> : null}
            {submitAttempted && !canSubmit ? (
              <Alert severity="info">Por favor preencha os campos obrigatórios (Atleta, Data).</Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAddOpen(false)
              setEditingEvaluation(null)
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
              if (!canSubmit) return
              const payload = {
                athlete_id: Number(athleteId),
                evaluation_date: evaluationDate,
                weight: weight === '' ? null : Number(weight),
                muscle_percentage: muscle === '' ? null : Number(muscle),
                fat_percentage: fat === '' ? null : Number(fat),
                water_percentage: water === '' ? null : Number(water),
                bone_percentage: bone === '' ? null : Number(bone),
                notes: notes || null
              }

              if (formMode === 'edit') {
                if (!editingEvaluation) return
                updateMutation.mutate({ id: editingEvaluation.id, payload })
              } else {
                createMutation.mutate(payload)
              }
            }}
          >
            {formMode === 'edit' ? 'Guardar Alterações' : 'Guardar Avaliação'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle>Eliminar avaliação?</DialogTitle>
        <DialogContent>
          <Typography>
            Tem a certeza que quer eliminar <b>{deleteConfirm?.label}</b>?
          </Typography>
          {deleteMutation.isError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              Falha ao eliminar avaliação.
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
