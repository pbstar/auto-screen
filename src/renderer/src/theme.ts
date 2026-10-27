import { createTheme } from '@mui/material/styles'

/** 参数、坐标、耗时等读数统一用等宽字体，便于竖向对齐比较 */
export const MONO_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'

/** 界面本身保持无彩色，颜色留给被操作的窗口和截图上的网格 */
export const CANVAS = '#eceef2'
export const SURFACE = '#ffffff'
export const HAIRLINE = '#e2e6ec'
export const INK = '#14181f'
export const INK_SECONDARY = '#5c6573'
export const INK_FAINT = '#9aa3ae'
/** 只用于焦点、运行态这类"正在发生"的信号 */
export const SIGNAL = '#2b6cf6'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: INK, light: '#3a424e', dark: '#000000', contrastText: '#ffffff' },
    secondary: { main: SIGNAL },
    success: { main: '#12895a' },
    warning: { main: '#a86400' },
    error: { main: '#cf2e2e' },
    background: { default: CANVAS, paper: SURFACE },
    divider: HAIRLINE,
    text: { primary: INK, secondary: INK_SECONDARY, disabled: INK_FAINT },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontSize: 13,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    button: { textTransform: 'none', fontWeight: 500, letterSpacing: 0 },
    caption: { fontSize: 11, letterSpacing: '0.01em', lineHeight: 1.5 },
  },
  components: {
    MuiButton: {
      defaultProps: { size: 'small', disableElevation: true },
      styleOverrides: { root: { borderRadius: 6, paddingInline: 12 } },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: 6, backgroundColor: SURFACE } },
    },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiTooltip: {
      defaultProps: { arrow: true },
      styleOverrides: {
        tooltip: {
          backgroundColor: INK,
          fontSize: 11,
          lineHeight: 1.6,
          padding: '6px 8px',
          borderRadius: 6,
          maxWidth: 360,
        },
        arrow: { color: INK },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          border: `1px solid ${HAIRLINE}`,
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.10)',
          borderRadius: 8,
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          border: `1px solid ${HAIRLINE}`,
          boxShadow: '0 12px 32px rgba(15, 23, 42, 0.10)',
          borderRadius: 8,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          border: `1px solid ${HAIRLINE}`,
          boxShadow: '0 24px 64px rgba(15, 23, 42, 0.16)',
          borderRadius: 10,
        },
      },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 0, fontSize: 12 } },
    },
    MuiCssBaseline: {
      styleOverrides: {
        '*::-webkit-scrollbar': { width: 8, height: 8 },
        '*::-webkit-scrollbar-thumb': { backgroundColor: '#ccd2db', borderRadius: 4 },
        '*::-webkit-scrollbar-thumb:hover': { backgroundColor: '#b5bdc9' },
        '*::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
        '::selection': { backgroundColor: 'rgba(43, 108, 246, 0.18)' },
      },
    },
  },
})
