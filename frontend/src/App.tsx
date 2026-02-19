import * as React from 'react'
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  Fade,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery
} from '@mui/material'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import MenuIcon from '@mui/icons-material/Menu'

import { AthletesPage } from './pages/AthletesPage'
import { CalendarPage } from './pages/CalendarPage'
import { ExercisesPage } from './pages/ExercisesPage'
import { SessionsPage } from './pages/SessionsPage'
import { EvaluationsPage } from './pages/EvaluationsPage'
import { AnalysisPage } from './pages/AnalysisPage'
import { TreinoRunnerPage } from './pages/TreinoRunnerPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { useColorMode } from './ColorModeProvider'

const NAV_ITEMS: Array<{ label: string; to: string }> = [
  { label: 'Atletas', to: '/athletes' },
  { label: 'Exercícios', to: '/exercises' },
  { label: 'Sessões', to: '/sessions' },
  { label: 'Calendário', to: '/calendar' },
  { label: 'Treino', to: '/treino' },
  { label: 'Avaliações', to: '/evaluations' },
  { label: 'Análise', to: '/analysis' },
  // { label: 'Pagamentos', to: '/payments' }
]

function isActivePath(pathname: string, to: string) {
  if (to === '/athletes') return pathname === '/' || pathname.startsWith('/athletes')
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function App() {
  const { mode, toggleMode } = useColorMode()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const pageTransitionMs = reduceMotion ? 0 : 720

  React.useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  React.useEffect(() => {
    // Makes section switching feel smoother.
    try {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
    } catch {
      window.scrollTo(0, 0)
    }
  }, [location.pathname, reduceMotion])

  return (
    <Box>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box
              component={Link}
              to="/"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                textDecoration: 'none',
                color: 'inherit',
                flex: '0 0 auto',
                minWidth: 0
              }}
            >
              <Box
                component="img"
                src="/logo.png"
                alt="Strong Fitness Studio"
                sx={{
                  height: { xs: 40, sm: 46 },
                  width: { xs: 40, sm: 46 },
                  objectFit: 'contain',
                  borderRadius: 1
                }}
              />
              <Box sx={{ minWidth: 0, lineHeight: 1 }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 900,
                    letterSpacing: 0.4,
                    lineHeight: 1.05,
                    whiteSpace: 'nowrap',
                    display: { xs: 'none', md: 'block' }
                  }}
                >
                  Strong Fitness Studio
                </Typography>

                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 900,
                    letterSpacing: 0.3,
                    lineHeight: 1.05,
                    whiteSpace: 'nowrap',
                    display: { xs: 'block', md: 'none' }
                  }}
                >
                  Strong Fitness
                </Typography>

              </Box>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: '1 1 auto', justifyContent: 'flex-end' }}>
              <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
                <IconButton size="small" onClick={() => setMobileOpen(true)} aria-label="Abrir menu">
                  <MenuIcon fontSize="small" />
                </IconButton>
              </Box>

              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ display: { xs: 'none', md: 'flex' } }}>
                {NAV_ITEMS.map((item) => {
                  const active = isActivePath(location.pathname, item.to)
                  return (
                    <Button
                      key={item.to}
                      size="small"
                      component={Link}
                      to={item.to}
                      color={active ? 'primary' : 'inherit'}
                      variant={active ? 'contained' : 'text'}
                      disableElevation
                      sx={{ textTransform: 'none', fontWeight: active ? 800 : 600 }}
                    >
                      {item.label}
                    </Button>
                  )
                })}
              </Stack>

              <Tooltip title={mode === 'dark' ? 'Modo claro' : 'Modo escuro'}>
                <IconButton
                  size="small"
                  onClick={toggleMode}
                  aria-label={mode === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                >
                  {mode === 'dark' ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Container>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{ sx: { width: 280 } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box component="img" src="/logo.png" alt="Strong Fitness Studio" sx={{ height: 42, width: 42, objectFit: 'contain' }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight={900} sx={{ lineHeight: 1.1 }}>
                Strong Fitness Studio
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Navegação
              </Typography>
            </Box>
          </Stack>
        </Box>
        <Divider />
        <List sx={{ py: 0 }}>
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(location.pathname, item.to)
            return (
              <ListItemButton
                key={item.to}
                component={Link}
                to={item.to}
                selected={active}
                onClick={() => setMobileOpen(false)}
              >
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 900 : 700 }} />
              </ListItemButton>
            )
          })}
        </List>
      </Drawer>

      <Fade key={location.pathname} in appear timeout={pageTransitionMs}>
        <Box>
          <Routes>
            <Route path="/" element={<AthletesPage />} />
            <Route path="/athletes" element={<AthletesPage />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/treino" element={<TreinoRunnerPage />} />
            <Route path="/evaluations" element={<EvaluationsPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            {/* <Route path="/payments" element={<PaymentsPage />} /> */}
          </Routes>
        </Box>
      </Fade>
    </Box>
  )
}
