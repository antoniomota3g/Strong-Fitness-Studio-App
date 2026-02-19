import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
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
  MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import PaidIcon from '@mui/icons-material/Paid'
import ReplayIcon from '@mui/icons-material/Replay'
import { useMutation, useQuery } from '@tanstack/react-query'

import { listAthletes, updateAthlete } from '../api/athletes'
import {
  autoCreditFromCancelled,
  createPaymentAdjustment,
  deletePaymentAdjustment,
  listPaymentAdjustments,
  listPayments,
  markPaymentPaid,
  type PaymentAdjustment,
  type PaymentSummary
} from '../api/payments'
import { queryClient } from '../queryClient'

function monthStartIso(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

function euro(v: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v)
}

function fullName(s: { athlete_first_name?: string | null; athlete_last_name?: string | null }) {
  return [s.athlete_first_name, s.athlete_last_name].filter(Boolean).join(' ') || '—'
}

function planLabel(s: PaymentSummary) {
  const type = (s.plan_type || 'monthly').toLowerCase()
  if (type === 'on_demand') {
    return `On-demand (${s.plan_on_demand_price != null ? euro(Number(s.plan_on_demand_price)) : '—'} / sessão)`
  }
  const spw = s.plan_sessions_per_week != null ? `${s.plan_sessions_per_week}x/sem` : '—'
  const price = s.plan_monthly_price != null ? euro(Number(s.plan_monthly_price)) : '—'
  return `Mensal (${spw}) • ${price}`
}

export function PaymentsPage() {
  const [monthIso, setMonthIso] = useState(() => monthStartIso(new Date()))
  const [selectedAthleteId, setSelectedAthleteId] = useState<number | ''>('')

  const athletesQuery = useQuery({ queryKey: ['athletes'], queryFn: listAthletes })
  const paymentsQuery = useQuery({ queryKey: ['payments', monthIso], queryFn: () => listPayments(monthIso) })

  const adjustmentsQuery = useQuery({
    queryKey: ['payment-adjustments', monthIso, selectedAthleteId],
    queryFn: () => listPaymentAdjustments(monthIso, selectedAthleteId === '' ? undefined : Number(selectedAthleteId))
  })

  const athletes = athletesQuery.data ?? []
  const payments = paymentsQuery.data ?? []
  const adjustments = adjustmentsQuery.data ?? []

  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustAmount, setAdjustAmount] = useState<number | ''>('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustAthleteId, setAdjustAthleteId] = useState<number | ''>('')

  const [planOpen, setPlanOpen] = useState(false)
  const [planAthleteId, setPlanAthleteId] = useState<number | ''>('')
  const [planType, setPlanType] = useState<'monthly' | 'on_demand'>('monthly')
  const [planSessionsPerWeek, setPlanSessionsPerWeek] = useState<number | ''>(2)
  const [planMonthlyPrice, setPlanMonthlyPrice] = useState<number | ''>(60)
  const [planOnDemandPrice, setPlanOnDemandPrice] = useState<number | ''>(15)

  useEffect(() => {
    // Keep selection valid if athletes list changes
    if (selectedAthleteId === '') return
    if (!athletes.some((a) => a.id === selectedAthleteId)) setSelectedAthleteId('')
  }, [athletes, selectedAthleteId])

  const createAdjustmentMutation = useMutation({
    mutationFn: createPaymentAdjustment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payments'] })
      await queryClient.invalidateQueries({ queryKey: ['payment-adjustments'] })
      setAdjustAmount('')
      setAdjustReason('')
      setAdjustAthleteId('')
      setAdjustOpen(false)
    }
  })

  const deleteAdjustmentMutation = useMutation({
    mutationFn: deletePaymentAdjustment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payments'] })
      await queryClient.invalidateQueries({ queryKey: ['payment-adjustments'] })
    }
  })

  const autoCreditMutation = useMutation({
    mutationFn: ({ monthIso, athleteId }: { monthIso: string; athleteId?: number }) => autoCreditFromCancelled(monthIso, athleteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payments'] })
      await queryClient.invalidateQueries({ queryKey: ['payment-adjustments'] })
    }
  })

  const markPaidMutation = useMutation({
    mutationFn: markPaymentPaid,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['payments'] })
    }
  })

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateAthlete(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['athletes'] })
      await queryClient.invalidateQueries({ queryKey: ['payments'] })
      setPlanOpen(false)
      setPlanAthleteId('')
    }
  })

  const byAthleteAdjustments = useMemo(() => {
    const map = new Map<number, PaymentAdjustment[]>()
    for (const a of adjustments) {
      const arr = map.get(a.athlete_id) ?? []
      arr.push(a)
      map.set(a.athlete_id, arr)
    }
    return map
  }, [adjustments])

  const visiblePayments = useMemo(() => {
    if (selectedAthleteId === '') return payments
    return payments.filter((p) => p.athlete_id === selectedAthleteId)
  }, [payments, selectedAthleteId])

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1.5, sm: 3 } }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Box>
            <Typography variant="h4">Pagamentos</Typography>
            <Typography variant="body2" color="text.secondary">
              Fecho mensal: valor base do plano + ajustes (créditos/débitos).
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
            <TextField
              label="Mês"
              type="month"
              value={monthIso.slice(0, 7)}
              onChange={(e) => setMonthIso(`${e.target.value}-01`)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <Button
              variant="outlined"
              startIcon={<ReplayIcon />}
              onClick={() => autoCreditMutation.mutate({ monthIso, athleteId: selectedAthleteId === '' ? undefined : Number(selectedAthleteId) })}
              disabled={autoCreditMutation.isPending}
            >
              Importar cancelamentos (mês anterior)
            </Button>
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            label="Atleta"
            value={selectedAthleteId}
            onChange={(e) => setSelectedAthleteId(e.target.value === '' ? '' : Number(e.target.value))}
            fullWidth
          >
            <MenuItem value="">Todos</MenuItem>
            {athletes.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.first_name} {a.last_name}
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setAdjustOpen(true)
              setAdjustAthleteId(selectedAthleteId === '' ? '' : Number(selectedAthleteId))
            }}
          >
            Novo ajuste
          </Button>
        </Stack>

        {paymentsQuery.isError ? <Alert severity="error">Falha ao carregar pagamentos.</Alert> : null}
        {autoCreditMutation.isError ? <Alert severity="error">Falha ao importar cancelamentos.</Alert> : null}

        <Stack spacing={2}>
          {visiblePayments.map((p) => {
            const name = fullName(p)
            const adj = byAthleteAdjustments.get(p.athlete_id) ?? []
            const paid = (p.status || '').toLowerCase() === 'paid'

            return (
              <Card key={p.athlete_id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
                      <Box sx={{ minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                          <Typography fontWeight={900} noWrap sx={{ minWidth: 0 }}>
                            {name}
                          </Typography>
                          <Chip size="small" label={planLabel(p)} variant="outlined" />
                          {paid ? <Chip size="small" color="success" label="Pago" /> : <Chip size="small" color="warning" label="Pendente" />}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          Base: {euro(p.base_amount)} • Ajustes: {euro(p.adjustments_total)} • Total: {euro(p.total_due)}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            const a = athletes.find((x) => x.id === p.athlete_id)
                            if (!a) return
                            setPlanAthleteId(a.id)
                            setPlanType(((a as any).plan_type || 'monthly').toLowerCase() === 'on_demand' ? 'on_demand' : 'monthly')
                            setPlanSessionsPerWeek((a as any).plan_sessions_per_week ?? '')
                            setPlanMonthlyPrice((a as any).plan_monthly_price ?? '')
                            setPlanOnDemandPrice((a as any).plan_on_demand_price ?? '')
                            setPlanOpen(true)
                          }}
                        >
                          Configurar plano
                        </Button>

                        <Button
                          size="small"
                          startIcon={<PaidIcon />}
                          variant="contained"
                          disabled={markPaidMutation.isPending}
                          onClick={() => markPaidMutation.mutate({ athlete_id: p.athlete_id, month: monthIso, paid_amount: p.total_due })}
                        >
                          Marcar pago
                        </Button>
                      </Stack>
                    </Stack>

                    {adj.length > 0 ? (
                      <>
                        <Divider />
                        <Stack spacing={1}>
                          <Typography variant="subtitle2" color="text.secondary">
                            Ajustes deste mês
                          </Typography>
                          {adj.map((a) => (
                            <Stack key={a.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} justifyContent="space-between">
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  {a.reason || 'Ajuste'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {a.related_session_id ? `Sessão #${a.related_session_id}` : '—'}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip
                                  size="small"
                                  color={a.amount < 0 ? 'success' : 'warning'}
                                  label={a.amount < 0 ? `Crédito ${euro(a.amount)}` : `Débito ${euro(a.amount)}`}
                                />
                                <Button
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                  disabled={deleteAdjustmentMutation.isPending}
                                  onClick={() => deleteAdjustmentMutation.mutate(a.id)}
                                >
                                  Remover
                                </Button>
                              </Stack>
                            </Stack>
                          ))}
                        </Stack>
                      </>
                    ) : null}
                  </Stack>
                </CardContent>
              </Card>
            )
          })}
        </Stack>

        {(athletesQuery.isError || adjustmentsQuery.isError) && (
          <Alert severity="warning">Se não carregar, confirme que o backend está a correr e o DB tem as novas tabelas.</Alert>
        )}
      </Stack>

      <Dialog open={adjustOpen} onClose={() => setAdjustOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Novo ajuste</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              select
              label="Atleta*"
              value={adjustAthleteId}
              onChange={(e) => setAdjustAthleteId(e.target.value === '' ? '' : Number(e.target.value))}
              fullWidth
            >
              <MenuItem value="">Selecione…</MenuItem>
              {athletes.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.first_name} {a.last_name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Valor (EUR)*"
              type="number"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value === '' ? '' : Number(e.target.value))}
              helperText="Use valores negativos para crédito (ex: -10)"
              fullWidth
            />

            <TextField
              label="Motivo"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="ex: Crédito por sessão cancelada"
              fullWidth
            />

            {createAdjustmentMutation.isError ? <Alert severity="error">Falha ao criar ajuste.</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={createAdjustmentMutation.isPending || adjustAthleteId === '' || adjustAmount === ''}
            onClick={() => {
              if (adjustAthleteId === '' || adjustAmount === '') return
              createAdjustmentMutation.mutate({
                athlete_id: Number(adjustAthleteId),
                applies_month: monthIso,
                amount: Number(adjustAmount),
                reason: adjustReason || null
              })
            }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={planOpen} onClose={() => setPlanOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Configurar plano</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              select
              label="Tipo"
              value={planType}
              onChange={(e) => setPlanType(e.target.value === 'on_demand' ? 'on_demand' : 'monthly')}
              fullWidth
            >
              <MenuItem value="monthly">Mensal (fixo)</MenuItem>
              <MenuItem value="on_demand">On-demand (por sessão)</MenuItem>
            </TextField>

            {planType === 'monthly' ? (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Sessões por semana"
                  type="number"
                  value={planSessionsPerWeek}
                  onChange={(e) => setPlanSessionsPerWeek(e.target.value === '' ? '' : Number(e.target.value))}
                  fullWidth
                />
                <TextField
                  label="Preço mensal (EUR)"
                  type="number"
                  value={planMonthlyPrice}
                  onChange={(e) => setPlanMonthlyPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  fullWidth
                />
              </Stack>
            ) : (
              <TextField
                label="Preço por sessão (EUR)"
                type="number"
                value={planOnDemandPrice}
                onChange={(e) => setPlanOnDemandPrice(e.target.value === '' ? '' : Number(e.target.value))}
                fullWidth
              />
            )}

            {updatePlanMutation.isError ? <Alert severity="error">Falha ao guardar plano.</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlanOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={updatePlanMutation.isPending || planAthleteId === ''}
            onClick={() => {
              if (planAthleteId === '') return
              updatePlanMutation.mutate({
                id: Number(planAthleteId),
                payload: {
                  plan_type: planType,
                  plan_sessions_per_week: planType === 'monthly' ? (planSessionsPerWeek === '' ? null : Number(planSessionsPerWeek)) : null,
                  plan_monthly_price: planType === 'monthly' ? (planMonthlyPrice === '' ? null : Number(planMonthlyPrice)) : null,
                  plan_on_demand_price: planType === 'on_demand' ? (planOnDemandPrice === '' ? null : Number(planOnDemandPrice)) : null
                }
              })
            }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
