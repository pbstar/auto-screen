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
