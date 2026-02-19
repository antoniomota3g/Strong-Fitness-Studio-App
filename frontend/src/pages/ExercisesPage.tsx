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
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import CategoryIcon from '@mui/icons-material/Category'
import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt'
import ConstructionIcon from '@mui/icons-material/Construction'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import DescriptionIcon from '@mui/icons-material/Description'
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'
import LinkIcon from '@mui/icons-material/Link'
import EditIcon from '@mui/icons-material/Edit'
import Autocomplete from '@mui/material/Autocomplete'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import { alpha } from '@mui/material/styles'
import { useMutation, useQuery } from '@tanstack/react-query'

import { createExercise, deleteExercise, listExercises, updateExercise, type Exercise, type ExerciseCreate } from '../api/exercises'
import { queryClient } from '../queryClient'
import { ReservedLinearProgress } from '../components/ReservedLinearProgress'

const CATEGORY_OPTIONS = [
  'Força',
  'Cardio',
  'Flexibilidade',
  'Equilíbrio',
  'Pliometria',
  'Funcional',
  'Levantamento Olímpico'
] as const

const DIFFICULTY_OPTIONS = ['Iniciante', 'Intermediário', 'Avançado', 'Especialista'] as const

const MUSCLE_GROUP_OPTIONS = [
  'Peito',
  'Costas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Antebraços',
  'Core/Abdominais',
  'Quadríceps',
  'Isquiotibiais',
  'Glúteos',
  'Gémeos',
  'Corpo Inteiro'
] as const

const EQUIPMENT_OPTIONS = [
  'Nenhum (Peso Corporal)',
  'Barbell',
  'Dumbbells',
  'Kettlebell',
  'Resistance Bands',
  'Cable Machine',
  'Banco',
  'Pull-up Bar',
  'Medicine Ball',
  'TRX',
  'Smith Machine',
  'Leg Press Machine',
  'Outra Máquina'
] as const

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

function splitCsv(value: string | null | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function joinCsv(values: string[]): string {
  return values.map((s) => s.trim()).filter(Boolean).join(', ')
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

export function ExercisesPage() {
  const [addOpen, setAddOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('Todos')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('Todos')
  const [filterMuscle, setFilterMuscle] = useState<string>('Todos')

  const [name, setName] = useState('')
  const [category, setCategory] = useState<string>('')
  const [difficulty, setDifficulty] = useState<string>('')
  const [muscleGroups, setMuscleGroups] = useState<string[]>([])
  const [equipment, setEquipment] = useState<string[]>([])

  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [videoUrl, setVideoUrl] = useState('')

  const [exerciseType, setExerciseType] = useState<string>('')
  const [setsRange, setSetsRange] = useState('')
  const [repsRange, setRepsRange] = useState('')
  const [tips, setTips] = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; label: string } | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const LIST_CHUNK = 25
  const [visibleCount, setVisibleCount] = useState(LIST_CHUNK)

  const resetForm = () => {
    setName('')
    setCategory('')
    setDifficulty('')
    setMuscleGroups([])
    setEquipment([])
    setDescription('')
    setInstructions('')
    setVideoUrl('')
    setExerciseType('')
    setSetsRange('')
    setRepsRange('')
    setTips('')
    setSubmitAttempted(false)
  }

  const openCreate = () => {
    setFormMode('create')
    setEditingExercise(null)
    resetForm()
    setAddOpen(true)
  }

  const openEdit = (e: Exercise) => {
    setFormMode('edit')
    setEditingExercise(e)

    setName(e.name ?? '')
    setCategory(e.category ?? '')
    setDifficulty(e.difficulty ?? '')
    setMuscleGroups(splitCsv(e.muscle_groups))
    setEquipment(splitCsv(e.equipment))
    setDescription(e.description ?? '')
    setInstructions(e.instructions ?? '')
    setVideoUrl(e.video_url ?? '')

    setExerciseType(e.exercise_type ?? '')
    setSetsRange(e.sets_range ?? '')
    setRepsRange(e.reps_range ?? '')
    setTips(e.tips ?? '')

    setSubmitAttempted(false)
    setAddOpen(true)
  }

  const exercisesQuery = useQuery({ queryKey: ['exercises'], queryFn: listExercises })

  const createMutation = useMutation({
    mutationFn: createExercise,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['exercises'] })
      resetForm()
      setAddOpen(false)
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ExerciseCreate> }) => updateExercise(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['exercises'] })
      resetForm()
      setAddOpen(false)
      setEditingExercise(null)
      setFormMode('create')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteExercise,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['exercises'] })
      setDeleteConfirm(null)
    }
  })

  const exercises = exercisesQuery.data ?? []

  const filteredExercises = useMemo(() => {
    let items: Exercise[] = exercises

    if (filterCategory !== 'Todos') {
      items = items.filter((e) => e.category === filterCategory)
    }
    if (filterDifficulty !== 'Todos') {
      items = items.filter((e) => e.difficulty === filterDifficulty)
    }
    if (filterMuscle !== 'Todos') {
      items = items.filter((e) => (e.muscle_groups ?? '').includes(filterMuscle))
    }

    const q = normalizeText(search)
    if (!q) return items
    return items.filter((e) => {
      const hay = normalizeText([e.name, e.category, e.difficulty, e.muscle_groups, e.equipment].filter(Boolean).join(' '))
      return hay.includes(q)
    })
  }, [exercises, filterCategory, filterDifficulty, filterMuscle, search])

  useEffect(() => {
    setVisibleCount(LIST_CHUNK)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises, filterCategory, filterDifficulty, filterMuscle, search])

  useEffect(() => {
    if (exercisesQuery.isLoading) return
    if (visibleCount >= filteredExercises.length) return
    const id = window.setTimeout(() => {
      setVisibleCount((c) => Math.min(filteredExercises.length, c + LIST_CHUNK))
    }, 40)
    return () => window.clearTimeout(id)
  }, [exercisesQuery.isLoading, filteredExercises.length, visibleCount])

  const visibleExercises = useMemo(() => {
    return filteredExercises.slice(0, visibleCount)
  }, [filteredExercises, visibleCount])

  const canSubmit = useMemo(() => {
    return name.trim().length > 0 && category.trim().length > 0 && difficulty.trim().length > 0 && muscleGroups.length > 0
  }, [category, difficulty, muscleGroups.length, name])

  const createPayload = useMemo(() => {
    if (!canSubmit) return null
    return {
      name: name.trim(),
      category: category || null,
      difficulty: difficulty || null,
      muscle_groups: joinCsv(muscleGroups) || null,
      equipment: joinCsv(equipment) || null,
      exercise_type: exerciseType || null,
      sets_range: setsRange.trim() || null,
      reps_range: repsRange.trim() || null,
      description: description.trim() || null,
      instructions: instructions.trim() || null,
      tips: tips.trim() || null,
      video_url: videoUrl.trim() || null
    }
  }, [canSubmit, category, description, difficulty, equipment, exerciseType, instructions, muscleGroups, name, repsRange, setsRange, tips, videoUrl])

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Box>
            <Typography variant="h4">Exercícios</Typography>
            <Typography variant="body2" color="text.secondary">
              Registe exercícios e construa a biblioteca.
            </Typography>
          </Box>

          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Adicionar Exercício
          </Button>
        </Stack>

        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
            <Typography variant="h6">
              Biblioteca de Exercícios ({filteredExercises.length}{filteredExercises.length !== exercises.length ? ` de ${exercises.length}` : ''})
            </Typography>

            <TextField
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por nome, categoria, músculo…"
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
              label="Filtrar por Categoria"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              fullWidth
            >
              <MenuItem value="Todos">Todos</MenuItem>
              {CATEGORY_OPTIONS.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Filtrar por Dificuldade"
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              fullWidth
            >
              <MenuItem value="Todos">Todos</MenuItem>
              {DIFFICULTY_OPTIONS.map((d) => (
                <MenuItem key={d} value={d}>{d}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Filtrar por Grupo Muscular"
              value={filterMuscle}
              onChange={(e) => setFilterMuscle(e.target.value)}
              fullWidth
            >
              <MenuItem value="Todos">Todos</MenuItem>
              {MUSCLE_GROUP_OPTIONS.map((m) => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </Stack>

        {exercisesQuery.isError ? <Alert severity="error">Falha ao carregar exercícios.</Alert> : null}

        <ReservedLinearProgress active={exercisesQuery.isFetching && !exercisesQuery.isLoading} />

        {exercisesQuery.isLoading ? (
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
            {visibleExercises.map((e) => {
            const muscles = splitCsv(e.muscle_groups)
            const equipments = splitCsv(e.equipment)
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
                    <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                      <FitnessCenterIcon fontSize="small" />
                    </Avatar>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flexWrap: 'wrap' }}>
                        <Typography fontWeight={800} sx={{ minWidth: 0 }} noWrap>
                          {e.name}
                        </Typography>
                        {e.category ? <Chip size="small" label={e.category} variant="outlined" /> : null}
                        {e.difficulty ? <Chip size="small" label={e.difficulty} variant="outlined" /> : null}
                      </Stack>

                      <Typography variant="body2" color="text.secondary" noWrap>
                        {muscles.length > 0 ? muscles.join(', ') : '—'}
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
                            <DetailRow icon={<CategoryIcon fontSize="small" />} label="Categoria" value={e.category ?? '—'} />
                            <DetailRow icon={<PsychologyAltIcon fontSize="small" />} label="Dificuldade" value={e.difficulty ?? '—'} />
                            <DetailRow
                              icon={<FitnessCenterIcon fontSize="small" />}
                              label="Grupos Musculares"
                              value={muscles.length > 0 ? (
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                  {muscles.map((m) => (
                                    <Chip key={m} label={m} size="small" color="primary" variant="outlined" />
                                  ))}
                                </Stack>
                              ) : '—'}
                            />
                          </Stack>

                          <Stack spacing={1.25}>
                            <DetailRow
                              icon={<ConstructionIcon fontSize="small" />}
                              label="Equipamento"
                              value={equipments.length > 0 ? (
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                  {equipments.map((m) => (
                                    <Chip key={m} label={m} size="small" variant="outlined" />
                                  ))}
                                </Stack>
                              ) : 'Nenhum necessário'}
                            />
                            <DetailRow
                              icon={<CalendarTodayIcon fontSize="small" />}
                              label="Criado em"
                              value={formatDate(e.created_at ?? null)}
                            />
                          </Stack>
                        </Box>

                        <Divider />

                        {e.description ? (
                          <DetailRow icon={<DescriptionIcon fontSize="small" />} label="Descrição" value={e.description} />
                        ) : null}

                        {e.instructions ? (
                          <DetailRow icon={<FormatListNumberedIcon fontSize="small" />} label="Instruções" value={e.instructions} />
                        ) : null}

                        {e.video_url ? (
                          <DetailRow
                            icon={<LinkIcon fontSize="small" />}
                            label="Vídeo"
                            value={
                              <a href={e.video_url} target="_blank" rel="noreferrer">
                                {e.video_url}
                              </a>
                            }
                          />
                        ) : null}

                        <Stack direction="row" justifyContent="flex-end" spacing={1}>
                          <Button
                            startIcon={<EditIcon />}
                            variant="outlined"
                            onClick={() => openEdit(e)}
                            disabled={deleteMutation.isPending}
                          >
                            Editar Exercício
                          </Button>
                          <Button
                            color="error"
                            variant="outlined"
                            onClick={() => setDeleteConfirm({ id: e.id, label: e.name })}
                            disabled={deleteMutation.isPending}
                          >
                            Eliminar Exercício
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </AccordionDetails>
              </Accordion>
            )
            })}

            {visibleCount < filteredExercises.length ? (
              <Box sx={{ py: 1 }}>
                <LinearProgress />
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {Array.from({ length: Math.min(3, filteredExercises.length - visibleCount) }).map((_, i) => (
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
      </Stack>

      <Dialog
        open={addOpen}
        onClose={() => {
          setAddOpen(false)
          resetForm()
          setEditingExercise(null)
          setFormMode('create')
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{formMode === 'edit' ? 'Editar Exercício' : 'Registar Exercício'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="h6">Informações do Exercício</Typography>

            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
              <TextField
                label="Nome do Exercício*"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
                placeholder="ex: Agachamento com Barra"
              />
              <TextField
                select
                label="Categoria*"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                fullWidth
              >
                <MenuItem value="">Escolha uma opção</MenuItem>
                {CATEGORY_OPTIONS.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
              <Autocomplete
                multiple
                options={[...MUSCLE_GROUP_OPTIONS]}
                value={muscleGroups}
                onChange={(_, value) => setMuscleGroups(value)}
                renderInput={(params) => <TextField {...params} label="Grupos Musculares Principais*" />}
                fullWidth
              />

              <TextField
                select
                label="Nível de Dificuldade*"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                fullWidth
              >
                <MenuItem value="">Escolha uma opção</MenuItem>
                {DIFFICULTY_OPTIONS.map((d) => (
                  <MenuItem key={d} value={d}>{d}</MenuItem>
                ))}
              </TextField>
            </Stack>

            <Autocomplete
              multiple
              options={[...EQUIPMENT_OPTIONS]}
              value={equipment}
              onChange={(_, value) => setEquipment(value)}
              renderInput={(params) => <TextField {...params} label="Equipamento Necessário" />}
              fullWidth
            />

            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
              <TextField
                select
                label="Tipo de Exercício"
                value={exerciseType}
                onChange={(e) => setExerciseType(e.target.value)}
                fullWidth
              >
                <MenuItem value="">Escolha uma opção</MenuItem>
                <MenuItem value="Composto">Composto</MenuItem>
                <MenuItem value="Isolamento">Isolamento</MenuItem>
                <MenuItem value="Cardio">Cardio</MenuItem>
                <MenuItem value="Alongamento">Alongamento</MenuItem>
              </TextField>
              <TextField
                label="Séries Recomendadas"
                value={setsRange}
                onChange={(e) => setSetsRange(e.target.value)}
                fullWidth
                placeholder="ex: 3"
              />
              <TextField
                label="Repetições Recomendadas"
                value={repsRange}
                onChange={(e) => setRepsRange(e.target.value)}
                fullWidth
                placeholder="ex: 10"
              />
            </Stack>

            <Divider />

            <Typography variant="h6">Detalhes do Exercício</Typography>

            <TextField
              label="Descrição"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              placeholder="Breve descrição do exercício..."
            />

            <TextField
              label="Instruções"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              fullWidth
              multiline
              minRows={4}
              placeholder={'Instruções passo a passo:\n1. Posição inicial...\n2. Movimento...'}
            />

            <TextField
              label="Dicas & Erros Comuns"
              value={tips}
              onChange={(e) => setTips(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              placeholder="Dicas importantes e erros comuns a evitar..."
            />

            <TextField
              label="URL do Vídeo"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              fullWidth
              placeholder="https://youtube.com/watch?v=..."
            />

            {createMutation.isError && formMode === 'create' ? <Alert severity="error">Falha ao registar exercício.</Alert> : null}
            {updateMutation.isError && formMode === 'edit' ? <Alert severity="error">Falha ao atualizar exercício.</Alert> : null}
            {submitAttempted && !canSubmit ? (
              <Alert severity="info">Por favor preencha os campos obrigatórios (Nome, Categoria, Dificuldade, Grupos Musculares).</Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAddOpen(false)
              resetForm()
              setEditingExercise(null)
              setFormMode('create')
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={createMutation.isPending || updateMutation.isPending}
            onClick={() => {
              setSubmitAttempted(true)
              if (!createPayload) return
              if (formMode === 'edit') {
                if (!editingExercise) return
                updateMutation.mutate({ id: editingExercise.id, payload: createPayload })
              } else {
                createMutation.mutate(createPayload)
              }
            }}
          >
            {formMode === 'edit' ? 'Guardar alterações' : 'Registar Exercício'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle>Eliminar exercício?</DialogTitle>
        <DialogContent>
          <Typography>
            Tem a certeza que quer eliminar <b>{deleteConfirm?.label}</b>?
          </Typography>
          {deleteMutation.isError ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              Falha ao eliminar exercício.
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
