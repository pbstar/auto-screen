import { useState, type ReactNode } from 'react'
import { Box, Button, Popover } from '@mui/material'
import { LINE_STRONG, WASH } from '../theme'

interface Props {
  label: string
  /** 胶囊右侧的摘要，比如已选技能名或工具数量 */
  detail?: string
  disabled?: boolean
  /** 打开时触发，用于重新扫描技能目录 */
  onOpen?: () => void
  /** 固定在浮层顶部、不随内容滚动的一行，例如分段切换 */
  header?: ReactNode
  children: ReactNode
}

/** 胶囊右侧只放得下几个字，长摘要截断，完整名字在浮层里看 */
const SUMMARY_MAX = 4

/** 输入框下方的小胶囊：点开是一个轻量浮层，配置不常改，不该常驻占版面 */
export default function PopoverPill({ label, detail, disabled, onOpen, header, children }: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const summary =
    detail && detail.length > SUMMARY_MAX ? `${detail.slice(0, SUMMARY_MAX)}…` : detail

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
          minWidth: 0,
          px: 1.25,
          borderRadius: 999,
          border: 1,
          borderColor: 'divider',
          color: 'text.secondary',
          fontSize: 11.5,
          fontWeight: 500,
          bgcolor: 'background.paper',
          // 选中的技能名可能很长，窄窗口下胶囊会被挤扁：只允许右侧摘要省略，标签不换行
          whiteSpace: 'nowrap',
          '&:hover': { borderColor: LINE_STRONG, bgcolor: WASH },
        }}
      >
        {label}
        {summary && (
          <Box
            component="span"
            sx={{
              ml: 0.75,
              minWidth: 0,
              // 摘要可能是技能名（中文）：不用等宽字体，等宽栈对中文的回退字形会显得比标签还大
              fontSize: 11,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: 'text.primary',
            }}
          >
            {summary}
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
        {/* 头部在滚动区之外：滚动条只跟着内容走，不会压在分段切换上 */}
        <Box sx={{ p: 1.25 }}>
          {header}
          <Box
            sx={{
              maxHeight: header ? 300 : 340,
              overflowY: 'auto',
              ...(header ? { mt: 0.75 } : {}),
            }}
          >
            {children}
          </Box>
        </Box>
      </Popover>
    </>
  )
}
