import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  Box,
  Chip,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  MenuItem,
  Skeleton,
  Tooltip,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AddIcon from '@mui/icons-material/Add'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/Phone'
import CakeIcon from '@mui/icons-material/Cake'
import StraightenIcon from '@mui/icons-material/Straighten'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import TrackChangesIcon from '@mui/icons-material/TrackChanges'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import Autocomplete from '@mui/material/Autocomplete'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import { alpha } from '@mui/material/styles'
import { useMutation, useQuery } from '@tanstack/react-query'

import { createAthlete, deleteAthlete, listAthletes, updateAthlete, type Athlete, type AthleteCreate } from '../api/athletes'
import { queryClient } from '../queryClient'
import { formatPhoneNumber } from '../utils/formatPhoneNumber'
import { ReservedLinearProgress } from '../components/ReservedLinearProgress'

const GENDER_OPTIONS = ['Masculino', 'Feminino', 'Outro'] as const
const FITNESS_LEVEL_OPTIONS = ['Iniciante', 'Intermediário', 'Avançado', 'Profissional'] as const
const GOAL_OPTIONS = [
  'Perda de Peso',
  'Ganho de Massa Muscular',
  'Força',
  'Resistência',
  'Flexibilidade',
  'Condição Física Geral',
  'Performance Desportiva'
] as const

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  // Accepts YYYY-MM-DD or ISO timestamp
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat('pt-PT', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

function formatGoals(goals: string[] | null | undefined): string {
  if (!goals || goals.length === 0) return 'N/A'
  return goals.join(', ')
}

function initials(firstName: string, lastName: string) {
  const a = (firstName?.trim()?.[0] ?? '').toUpperCase()
  const b = (lastName?.trim()?.[0] ?? '').toUpperCase()
  return `${a}${b}` || 'A'
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function DetailRow(props: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start">
      <Box sx={{ mt: '2px', color: 'text.secondary' }}>{props.icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
          {props.label}
        </Typography>
        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
          {props.value}
        </Typography>
      </Box>
    </Stack>
  )
}

export function AthletesPage() {
  const [addOpen, setAddOpen] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')

  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<string>('')
  const [weight, setWeight] = useState<string>('')
  const [height, setHeight] = useState<string>('')
  const [fitnessLevel, setFitnessLevel] = useState<string>('')
  const [goals, setGoals] = useState<string[]>([])
  const [medicalConditions, setMedicalConditions] = useState('')
  const [notes, setNotes] = useState('')

  const [search, setSearch] = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; label: string } | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const LIST_CHUNK = 25
  const [visibleCount, setVisibleCount] = useState(LIST_CHUNK)

  const resetForm = () => {
    setFirstName('')
    setLastName('')
    setEmail('')
    setPhone('')
    setBirthDate('')
    setGender('')
    setWeight('')
    setHeight('')
    setFitnessLevel('')
    setGoals([])
    setMedicalConditions('')
    setNotes('')
    setSubmitAttempted(false)
  }

  const openCreate = () => {
    setFormMode('create')
    setEditingAthlete(null)
    resetForm()
    setAddOpen(true)
  }

  const openEdit = (a: Athlete) => {
    setFormMode('edit')
    setEditingAthlete(a)

    setFirstName(a.first_name ?? '')
    setLastName(a.last_name ?? '')
    setEmail(a.email ?? '')
    setPhone(a.phone ?? '')
    setBirthDate(a.birth_date ?? '')
    setGender(a.gender ?? '')
    setWeight(a.weight != null ? String(a.weight) : '')
    setHeight(a.height != null ? String(a.height) : '')
    setFitnessLevel(a.fitness_level ?? '')
    setGoals(Array.isArray(a.goals) ? a.goals.filter(Boolean) : [])
    setMedicalConditions(a.medical_conditions ?? '')
    setNotes(a.notes ?? '')
    setSubmitAttempted(false)

    setAddOpen(true)
  }

  const athletesQuery = useQuery({
    queryKey: ['athletes'],
    queryFn: listAthletes
  })

  const createMutation = useMutation({
    mutationFn: createAthlete,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['athletes'] })
      resetForm()
      setAddOpen(false)
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<AthleteCreate> }) => updateAthlete(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['athletes'] })
      resetForm()
      setAddOpen(false)
      setEditingAthlete(null)
      setFormMode('create')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAthlete,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['athletes'] })
    }
  })

  const athletes = athletesQuery.data ?? []

  const filteredAthletes = useMemo(() => {
    const q = normalizeText(search)
    if (!q) return athletes
    return athletes.filter((a) => {
      const haystack = normalizeText(
        [a.first_name, a.last_name, a.email, a.phone].filter(Boolean).join(' ')
      )
      return haystack.includes(q)
    })
  }, [athletes, search])

  useEffect(() => {
    setVisibleCount(LIST_CHUNK)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athletes, search])

  useEffect(() => {
    if (athletesQuery.isLoading) return
    if (visibleCount >= filteredAthletes.length) return
    const id = window.setTimeout(() => {
      setVisibleCount((c) => Math.min(filteredAthletes.length, c + LIST_CHUNK))
    }, 40)
    return () => window.clearTimeout(id)
  }, [athletesQuery.isLoading, filteredAthletes.length, visibleCount])

  const visibleAthletes = useMemo(() => {
    return filteredAthletes.slice(0, visibleCount)
  }, [filteredAthletes, visibleCount])
  const canSubmit = useMemo(() => {
    return firstName.trim().length > 0 && lastName.trim().length > 0 && email.trim().length > 0
  }, [email, firstName, lastName])

  const createPayload = useMemo(() => {
    if (!canSubmit) return null

    const parsedWeight = weight.trim().length > 0 ? Number(weight) : null
    const parsedHeight = height.trim().length > 0 ? Number(height) : null

    return {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      birth_date: birthDate || null,
      gender: gender || null,
      weight: Number.isFinite(parsedWeight) ? parsedWeight : null,
      height: Number.isFinite(parsedHeight) ? parsedHeight : null,
      fitness_level: fitnessLevel || null,
      goals: goals.length > 0 ? goals : null,
      medical_conditions: medicalConditions.trim() || null,
      notes: notes.trim() || null,
    }
  }, [
    birthDate,
    canSubmit,
    email,
    firstName,
    gender,
    goals,
    fitnessLevel,
    height,
    lastName,
    medicalConditions,
    notes,
    phone,
    weight
  ])

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={3}>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h4">Atletas</Typography>
            <Typography variant="body2" color="text.secondary">
              Registe e faça a gestão dos atletas.
            </Typography>
          </Box>

          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Adicionar Atleta
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Typography variant="h6">
            Atletas Registados ({filteredAthletes.length}{filteredAthletes.length !== athletes.length ? ` de ${athletes.length}` : ''})
          </Typography>

          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome, email, telefone…"
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

        {athletesQuery.isError ? (
          <Alert severity="error">Falha ao carregar atletas.</Alert>
        ) : null}

        <ReservedLinearProgress active={athletesQuery.isFetching && !athletesQuery.isLoading} />

        {athletesQuery.isLoading ? (
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
            {visibleAthletes.map((a) => {
            const title = `${a.first_name} ${a.last_name}`
            const goalList = Array.isArray(a.goals) ? a.goals.filter(Boolean) : []
            return (
              <Accordion
                key={a.id}
                disableGutters
                elevation={0}
                expanded={expandedId === a.id}
                onChange={(_, isExpanded) => setExpandedId(isExpanded ? a.id : null)}
                TransitionProps={{ unmountOnExit: true }}
                sx={{
                  border: 1,
                  borderColor: expandedId === a.id ? 'primary.main' : 'divider',
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
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        fontWeight: 800
                      }}
                    >
                      {initials(a.first_name, a.last_name)}
                    </Avatar>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                        <Typography fontWeight={800} noWrap>
                          {title}
                        </Typography>
                        {a.fitness_level ? (
                          <Chip size="small" label={a.fitness_level} variant="outlined" />
                        ) : null}
                      </Stack>

                      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, mt: 0.25 }}>
                        <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1 }}>
                          {a.email ?? '—'}
                        </Typography>
                        {a.phone ? (
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {formatPhoneNumber(a.phone)}
                          </Typography>
                        ) : null}
                      </Stack>
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
                            <DetailRow icon={<EmailIcon fontSize="small" />} label="Email" value={a.email ?? 'N/A'} />
                            <DetailRow
                              icon={<PhoneIcon fontSize="small" />}
                              label="Telefone"
                              value={a.phone ? formatPhoneNumber(a.phone) : 'N/A'}
                            />
                            <DetailRow
                              icon={<CakeIcon fontSize="small" />}
                              label="Data de Nascimento"
                              value={a.birth_date ?? 'N/A'}
                            />
                            <DetailRow
                              icon={<AccessibilityNewIcon fontSize="small" />}
                              label="Género"
                              value={a.gender ?? 'N/A'}
                            />
                          </Stack>

                          <Stack spacing={1.25}>
                            <DetailRow
                              icon={<FitnessCenterIcon fontSize="small" />}
                              label="Nível de Condição"
                              value={a.fitness_level ?? 'N/A'}
                            />
                            <DetailRow
                              icon={<StraightenIcon fontSize="small" />}
                              label="Altura"
                              value={a.height != null ? `${a.height} cm` : 'N/A'}
                            />
                            <DetailRow
                              icon={<FitnessCenterIcon fontSize="small" />}
                              label="Peso"
                              value={a.weight != null ? `${a.weight} kg` : 'N/A'}
                            />
                            <DetailRow
                              icon={<CalendarTodayIcon fontSize="small" />}
                              label="Data de Registo"
                              value={formatDate(a.created_at ?? null)}
                            />
                          </Stack>
                        </Box>

                        <DetailRow
                          icon={<TrackChangesIcon fontSize="small" />}
                          label="Objetivos"
                          value={
                            goalList.length > 0 ? (
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                {goalList.map((g) => (
                                  <Chip key={g} label={g} size="small" color="primary" variant="outlined" />
                                ))}
                              </Stack>
                            ) : (
                              'N/A'
                            )
                          }
                        />

                        {a.medical_conditions ? (
                          <Stack spacing={0.5}>
                            <Typography variant="subtitle2" fontWeight={800}>
                              Condições Médicas / Lesões
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              {a.medical_conditions}
                            </Typography>
                          </Stack>
                        ) : null}

                        {a.notes ? (
                          <Stack spacing={0.5}>
                            <Typography variant="subtitle2" fontWeight={800}>
                              Notas Adicionais
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              {a.notes}
                            </Typography>
                          </Stack>
                        ) : null}

                        <Stack direction="row" justifyContent="flex-end" spacing={1}>
                          <Button
                            startIcon={<EditIcon />}
                            variant="outlined"
                            onClick={() => openEdit(a)}
                            disabled={deleteMutation.isPending}
                          >
                            Editar Atleta
                          </Button>
                          <Button
                            color="error"
                            variant="outlined"
                            onClick={() => setDeleteConfirm({ id: a.id, label: title })}
                            disabled={deleteMutation.isPending}
                          >
                            Eliminar Atleta
                          </Button>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </AccordionDetails>
              </Accordion>
            )
            })}

            {visibleCount < filteredAthletes.length ? (
              <Box sx={{ py: 1 }}>
                <LinearProgress />
                <Stack spacing={1} sx={{ mt: 1 }}>
                  {Array.from({ length: Math.min(3, filteredAthletes.length - visibleCount) }).map((_, i) => (
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
          setEditingAthlete(null)
          setFormMode('create')
        }}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{formMode === 'edit' ? 'Editar Atleta' : 'Registar Atleta'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="h6">Informações do Atleta</Typography>

            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
              <TextField
                label="Nome*"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                fullWidth
                placeholder="João"
              />
              <TextField
                label="Sobrenome*"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                fullWidth
                placeholder="Silva"
              />
            </Stack>

            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
              <TextField
                label="Email*"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                placeholder="atleta@exemplo.com"
              />
              <TextField
                label="Telefone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                fullWidth
                placeholder="912345678"
              />
            </Stack>

            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
              <TextField
                label="Data de Nascimento"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <TextField select label="Género" value={gender} onChange={(e) => setGender(e.target.value)} fullWidth>
                <MenuItem value="">Escolha uma opção</MenuItem>
                {GENDER_OPTIONS.map((g) => (
                  <MenuItem key={g} value={g}>
                    {g}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
              <TextField
                label="Peso (kg)"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                fullWidth
                inputMode="decimal"
                placeholder="ex: 72.5"
              />
              <TextField
                label="Altura (cm)"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                fullWidth
                inputMode="decimal"
                placeholder="ex: 175"
              />
            </Stack>

            <Divider />

            <Typography variant="h6">Informações Físicas</Typography>

            <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
              <TextField
                select
                label="Nível de Condição Física"
                value={fitnessLevel}
                onChange={(e) => setFitnessLevel(e.target.value)}
                fullWidth
              >
                <MenuItem value="">Escolha uma opção</MenuItem>
                {FITNESS_LEVEL_OPTIONS.map((lvl) => (
                  <MenuItem key={lvl} value={lvl}>
                    {lvl}
                  </MenuItem>
                ))}
              </TextField>

              <Autocomplete
                multiple
                options={[...GOAL_OPTIONS]}
                value={goals}
                onChange={(_, value) => setGoals(value)}
                renderInput={(params) => <TextField {...params} label="Objetivos de Treino" />}
                fullWidth
              />
            </Stack>

            <TextField
              label="Condições Médicas / Lesões"
              value={medicalConditions}
              onChange={(e) => setMedicalConditions(e.target.value)}
              fullWidth
              multiline
              minRows={3}
              placeholder="Quaisquer condições médicas ou lesões a ter em consideração..."
            />

            <TextField
              label="Notas Adicionais"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              placeholder="Qualquer outra informação relevante..."

            />

            {createMutation.isError && formMode === 'create' ? <Alert severity="error">Falha ao registar atleta.</Alert> : null}
            {updateMutation.isError && formMode === 'edit' ? <Alert severity="error">Falha ao atualizar atleta.</Alert> : null}
            {submitAttempted && !canSubmit ? (
              <Alert severity="info">Por favor preencha os campos obrigatórios (Nome, Sobrenome, Email).</Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAddOpen(false)
              resetForm()
              setEditingAthlete(null)
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
                if (!editingAthlete) return
                updateMutation.mutate({ id: editingAthlete.id, payload: createPayload })
              } else {
                createMutation.mutate(createPayload)
              }
            }}
          >
            {formMode === 'edit' ? 'Guardar alterações' : 'Registar Atleta'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} fullWidth maxWidth="xs">
        <DialogTitle>Eliminar atleta?</DialogTitle>
        <DialogContent>
          <Typography>
            Tem a certeza que quer eliminar <b>{deleteConfirm?.label}</b>? Isto também vai remover sessões e avaliações associadas.
          </Typography>
          {deleteMutation.isError ? <Alert severity="error" sx={{ mt: 2 }}>Falha ao eliminar atleta.</Alert> : null}
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
              setDeleteConfirm(null)
            }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
