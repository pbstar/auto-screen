import { createTheme } from '@mui/material/styles'

/** 参数、坐标、耗时等读数统一用等宽字体，便于竖向对齐比较 */
export const MONO_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#2563eb' },
    success: { main: '#16a34a' },
    error: { main: '#dc2626' },
    background: { default: '#ffffff', paper: '#ffffff' },
    divider: '#e6e8eb',
    text: { primary: '#111827', secondary: '#6b7280' },
  },
  shape: { borderRadius: 6 },
  typography: {
    fontSize: 13,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    button: { textTransform: 'none', fontWeight: 500, letterSpacing: 0 },
    caption: { fontSize: 11 },
  },
  components: {
    MuiButton: { defaultProps: { size: 'small', disableElevation: true } },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiTooltip: { defaultProps: { arrow: true } },
    MuiMenu: {
      styleOverrides: {
        paper: {
          border: '1px solid #e6e8eb',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
          borderRadius: 8,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          border: '1px solid #e6e8eb',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
          borderRadius: 8,
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        '*::-webkit-scrollbar': { width: 8, height: 8 },
        '*::-webkit-scrollbar-thumb': { backgroundColor: '#d4d7dd', borderRadius: 4 },
        '*::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
      },
    },
  },
})
