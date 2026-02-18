import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material'
import type { PaletteMode } from '@mui/material'

import { createAppTheme } from './theme'

type ColorModeContextValue = {
  mode: PaletteMode
  setMode: (mode: PaletteMode) => void
  toggleMode: () => void
}

const ColorModeContext = createContext<ColorModeContextValue | null>(null)

const STORAGE_KEY = 'sfs.colorMode'

function readStoredMode(): PaletteMode | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'dark' || v === 'light' ? v : null
  } catch {
    return null
  }
}

function writeStoredMode(mode: PaletteMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // ignore
  }
}

export function ColorModeProvider(props: { children: React.ReactNode }) {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true })

  const [mode, setMode] = useState<PaletteMode>(() => {
    const stored = readStoredMode()
    if (stored) return stored
    return prefersDark ? 'dark' : 'light'
  })

  // If user never picked a mode, follow system preference changes.
  useEffect(() => {
    const stored = readStoredMode()
    if (stored) return
    setMode(prefersDark ? 'dark' : 'light')
  }, [prefersDark])

  useEffect(() => {
    writeStoredMode(mode)
  }, [mode])

  const theme = useMemo(() => createAppTheme(mode), [mode])

  const value = useMemo<ColorModeContextValue>(
    () => ({
      mode,
      setMode,
      toggleMode: () => setMode((m) => (m === 'dark' ? 'light' : 'dark'))
    }),
    [mode]
  )

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {props.children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  )
}

export function useColorMode() {
  const ctx = useContext(ColorModeContext)
  if (!ctx) throw new Error('useColorMode must be used within ColorModeProvider')
  return ctx
}
