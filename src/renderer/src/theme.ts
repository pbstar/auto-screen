import { createTheme } from '@mui/material/styles'

/** 参数、坐标、耗时等读数统一用等宽字体，便于竖向对齐比较 */
const MONO_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace'

/** 等宽读数：坐标、步数、耗时、日志共用一套字号与数字对齐方式 */
export const monoText = (size = 11) => ({
  fontFamily: MONO_FONT,
  fontSize: size,
  fontVariantNumeric: 'tabular-nums' as const,
})

/** 界面本身保持无彩色，颜色留给被操作的窗口和截图上的网格 */
export const CANVAS = '#eceef2'
const SURFACE = '#ffffff'
export const HAIRLINE = '#e2e6ec'
const INK = '#14181f'
const INK_SECONDARY = '#5c6573'
const INK_FAINT = '#9aa3ae'
/** 只用于焦点、运行态这类"正在发生"的信号 */
export const SIGNAL = '#2b6cf6'

/** 悬停时的边框与淡墨底：胶囊、幽灵按钮、输入框、菜单共用 */
export const LINE_STRONG = '#c9d1db'
export const WASH = 'rgba(15, 23, 42, 0.045)'
export const WASH_STRONG = 'rgba(15, 23, 42, 0.06)'

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
      styleOverrides: {
        // 按钮统一胶囊形，和技能/规则/工具胶囊同一套语言
        root: { borderRadius: 999, paddingInline: 14 },
        contained: {
          '&:hover': { backgroundColor: '#3a424e' },
          // 禁用态不用 MUI 默认的灰块，压到很轻的墨色，避免抢视觉
          '&.Mui-disabled': {
            backgroundColor: 'rgba(15, 23, 42, 0.07)',
            color: 'rgba(15, 23, 42, 0.35)',
          },
        },
        // 只改无彩色描边的按钮；error 色的终止仍然保持红框
        outlined: {
          '&.MuiButton-colorPrimary': {
            borderColor: HAIRLINE,
            '&:hover': {
              borderColor: LINE_STRONG,
              backgroundColor: WASH,
            },
          },
        },
      },
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
    MuiMenuItem: {
      styleOverrides: {
        // 菜单跟界面同一档字号，默认的 16px 和 48px 行高在这套紧凑布局里过大
        root: { fontSize: 13, minHeight: 32, paddingBlock: 5 },
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
        // 整页高度固定、滚动都在内部区域；Tooltip 这类挂到 body 的浮层一旦越界就会闪现整页滚动条，这里直接禁掉
        'html, body, #root': { height: '100%', overflow: 'hidden' },
        '*::-webkit-scrollbar': { width: 8, height: 8 },
        '*::-webkit-scrollbar-thumb': { backgroundColor: '#ccd2db', borderRadius: 4 },
        '*::-webkit-scrollbar-thumb:hover': { backgroundColor: '#b5bdc9' },
        '*::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
        '::selection': { backgroundColor: 'rgba(43, 108, 246, 0.18)' },
      },
    },
  },
})
