import { createTheme } from '@mui/material/styles'
import type { PaletteMode } from '@mui/material'

export function createAppTheme(mode: PaletteMode) {
  const brandYellow = '#F4C20D'
  const brandBlack = '#111111'

  return createTheme({
    palette: {
      mode,
      primary: {
        main: brandYellow,
        contrastText: brandBlack
      },
      info: {
        main: brandYellow,
        contrastText: brandBlack
      },
      secondary: {
        main: mode === 'dark' ? '#EAEAEA' : brandBlack,
        contrastText: mode === 'dark' ? brandBlack : '#FFFFFF'
      },
      background: {
        default: mode === 'dark' ? '#0B0B0B' : '#FAFAFA',
        paper: mode === 'dark' ? '#121212' : '#FFFFFF'
      },
      divider: mode === 'dark' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)',
      text: {
        primary: mode === 'dark' ? '#F5F5F5' : brandBlack,
        secondary: mode === 'dark' ? 'rgba(245,245,245,0.72)' : 'rgba(17,17,17,0.72)'
      }
    },
    shape: {
      borderRadius: 12
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            // Prevent horizontal layout shift when navigating between pages
            // that do/don't require a vertical scrollbar.
            // Only apply on desktop — mobile browsers handle this differently.
            '@media (min-width: 600px)': {
              scrollbarGutter: 'stable'
            },
            // Fallback for browsers that don't support scrollbar-gutter.
            '@supports not (scrollbar-gutter: stable)': {
              overflowY: 'scroll'
            }
          },
          body: {
            // Prevent tiny layout shifts due to font rendering differences
            // between pages with/without scrollbar on some platforms.
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale'
          }
        }
      }
    }
  })
}
