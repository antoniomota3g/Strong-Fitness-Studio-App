import { Box, LinearProgress, type LinearProgressProps } from '@mui/material'

export function ReservedLinearProgress(
  props: LinearProgressProps & {
    active: boolean
    mt?: number
    height?: number
  }
) {
  const { active, mt = 1, height = 4, sx, ...rest } = props

  return (
    <Box sx={{ mt, height, display: 'flex', alignItems: 'center' }}>
      <LinearProgress
        {...rest}
        sx={{
          width: '100%',
          height,
          borderRadius: 999,
          visibility: active ? 'visible' : 'hidden',
          ...sx
        }}
      />
    </Box>
  )
}
