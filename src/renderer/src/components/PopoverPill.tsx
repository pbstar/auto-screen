import { useState, type ReactNode } from 'react'
import { Box, Button, Popover } from '@mui/material'
import { LINE_STRONG, WASH, monoText } from '../theme'

interface Props {
  label: string
  /** 胶囊右侧的摘要，比如已选技能名或工具数量 */
  detail?: string
  disabled?: boolean
  /** 打开时触发，用于重新扫描技能目录 */
  onOpen?: () => void
  children: ReactNode
}

/** 输入框下方的小胶囊：点开是一个轻量浮层，配置不常改，不该常驻占版面 */
export default function PopoverPill({ label, detail, disabled, onOpen, children }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)

  return (
    <>
      <Button
        size="small"
        disabled={disabled}
        onClick={(event) => {
          setAnchor(event.currentTarget)
          onOpen?.()
        }}
        sx={{
          height: 26,
          px: 1.25,
          borderRadius: 999,
          border: 1,
          borderColor: 'divider',
          color: 'text.secondary',
          fontSize: 11.5,
          fontWeight: 500,
          bgcolor: 'background.paper',
          '&:hover': { borderColor: LINE_STRONG, bgcolor: WASH },
        }}
      >
        {label}
        {detail && (
          <Box
            component="span"
            sx={{ ...monoText(11), ml: 0.75, color: 'text.primary' }}
          >
            {detail}
          </Box>
        )}
      </Button>

      <Popover
        open={anchor != null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { mt: 0.75, width: 320 } } }}
      >
        <Box sx={{ p: 1.25, maxHeight: 340, overflowY: 'auto' }}>{children}</Box>
      </Popover>
    </>
  )
}
