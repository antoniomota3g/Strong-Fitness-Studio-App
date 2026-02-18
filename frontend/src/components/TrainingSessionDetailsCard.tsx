import type { ReactNode } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography
} from '@mui/material'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PersonIcon from '@mui/icons-material/Person'
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck'
import NoteAltIcon from '@mui/icons-material/NoteAlt'
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter'
import CategoryIcon from '@mui/icons-material/Category'
import { alpha } from '@mui/material/styles'

import type { TrainingSession } from '../api/trainingSessions'

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

export function TrainingSessionDetailsCard(props: {
  session: TrainingSession
  footer?: ReactNode
}) {
  const { session, footer } = props

  const athleteName = [session.athlete_first_name, session.athlete_last_name].filter(Boolean).join(' ') || '—'
  const exCount = Array.isArray(session.exercises) ? session.exercises.length : 0

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: 'divider',
        bgcolor: (theme) =>
          theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.03) : alpha(theme.palette.common.black, 0.015)
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
              <DetailRow icon={<CalendarTodayIcon fontSize="small" />} label="Data" value={formatDate(session.session_date)} />
              <DetailRow icon={<AccessTimeIcon fontSize="small" />} label="Hora" value={formatTimeHHMM(session.session_time)} />
            </Stack>

            <Stack spacing={1.25}>
              <DetailRow icon={<CategoryIcon fontSize="small" />} label="Tipo" value={session.session_type ?? '—'} />
              <DetailRow icon={<PlaylistAddCheckIcon fontSize="small" />} label="Estado" value={session.status ?? '—'} />
              <DetailRow
                icon={<AccessTimeIcon fontSize="small" />}
                label="Duração"
                value={session.duration != null ? `${session.duration} min` : '—'}
              />
            </Stack>
          </Box>

          {session.session_notes ? <DetailRow icon={<NoteAltIcon fontSize="small" />} label="Notas" value={session.session_notes} /> : null}

          <Divider />

          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <FitnessCenterIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" fontWeight={800}>
                Exercícios ({exCount})
              </Typography>
            </Stack>

            {Array.isArray(session.exercises) && session.exercises.length > 0 ? (
              <Stack spacing={1}>
                {session.exercises.map((ex: any, idx: number) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 1.5,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                      bgcolor: 'background.paper'
                    }}
                  >
                    <Stack spacing={0.75}>
                      <Typography fontWeight={700}>{ex.exercise_name || '—'}</Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {ex.sets != null ? <Chip size="small" label={`Séries: ${ex.sets}`} /> : null}
                        {ex.reps ? <Chip size="small" label={`Reps: ${ex.reps}`} /> : null}
                        {ex.rest != null ? <Chip size="small" label={`Descanso: ${ex.rest}s`} /> : null}
                        {ex.weight ? <Chip size="small" label={`Peso: ${ex.weight}`} /> : null}
                      </Stack>
                      {ex.notes ? (
                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                          {ex.notes}
                        </Typography>
                      ) : null}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                —
              </Typography>
            )}
          </Stack>

          {footer ? <Box>{footer}</Box> : null}
        </Stack>
      </CardContent>
    </Card>
  )
}
