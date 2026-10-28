import type { ReactNode } from 'react'
import { Box } from '@mui/material'

interface IconProps {
  size?: number
}

function Glyph({ size, children }: IconProps & { children: ReactNode }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 16 16"
      aria-hidden
      sx={{ width: size, height: size, display: 'block', flex: 'none' }}
    >
      {children}
    </Box>
  )
}

/** 四角星：自动沉淀 */
export function SparkleIcon({ size = 13 }: IconProps) {
  return (
    <Glyph size={size}>
      <path
        d="M8 1.6l1.5 4.1 4.1 1.5-4.1 1.5L8 12.8 6.5 8.7 2.4 7.2l4.1-1.5L8 1.6z"
        fill="currentColor"
      />
    </Glyph>
  )
}

/** 四个小方块：预览网格 */
export function GridIcon({ size = 13 }: IconProps) {
  return (
    <Glyph size={size}>
      <rect x="1.8" y="1.8" width="5" height="5" rx="1.2" fill="currentColor" />
      <rect x="9.2" y="1.8" width="5" height="5" rx="1.2" fill="currentColor" />
      <rect x="1.8" y="9.2" width="5" height="5" rx="1.2" fill="currentColor" />
      <rect x="9.2" y="9.2" width="5" height="5" rx="1.2" fill="currentColor" />
    </Glyph>
  )
}

/** 下拉箭头 */
export function ChevronDownIcon({ size = 16 }: IconProps) {
  return (
    <Glyph size={size}>
      <path
        d="M4 6l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Glyph>
  )
}

/** 竖排三个点：更多菜单 */
export function MoreIcon({ size = 16 }: IconProps) {
  return (
    <Glyph size={size}>
      <circle cx="8" cy="3.5" r="1.15" fill="currentColor" />
      <circle cx="8" cy="8" r="1.15" fill="currentColor" />
      <circle cx="8" cy="12.5" r="1.15" fill="currentColor" />
    </Glyph>
  )
}

/** 显示器：预览区的空态 */
export function MonitorIcon({ size = 20 }: IconProps) {
  return (
    <Glyph size={size}>
      <rect
        x="2"
        y="3"
        width="12"
        height="8.2"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M6.2 13.6h3.6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </Glyph>
  )
}

/** 三角感叹号：预览不可用 */
export function AlertIcon({ size = 20 }: IconProps) {
  return (
    <Glyph size={size}>
      <path
        d="M8 2.6l5.7 9.9H2.3L8 2.6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M8 6.6v2.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="11.1" r="0.75" fill="currentColor" />
    </Glyph>
  )
}
