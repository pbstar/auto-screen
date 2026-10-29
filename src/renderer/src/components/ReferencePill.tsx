import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import type { RuleSummary, ToolSummary } from '@shared/types'
import { WASH } from '../theme'
import PopoverPill from './PopoverPill'
import RuleList from './RuleList'
import ToolList from './ToolList'

const api = window.autoScreen

/** 规则与工具始终生效、只读，合成一个胶囊；脚本跟着技能走，放在「技能」浮层里 */
export default function ReferencePill() {
  const [tab, setTab] = useState(0)
  const [tools, setTools] = useState<ToolSummary[]>([])
  const [rules, setRules] = useState<RuleSummary[]>([])
  const [error, setError] = useState('')

  const reload = useCallback(() => {
    void api.listTools().then((result) => {
      if (result.ok) setTools(result.data)
      else setError(result.error)
    })
    void api.listRules().then((result) => {
      if (result.ok) setRules(result.data)
      else setError(result.error)
    })
  }, [])

  useEffect(reload, [reload])

  const segments = [`规则 ${rules.length}`, `工具 ${tools.length}`]

  return (
    <PopoverPill
      label="参考"
      onOpen={reload}
      header={
        <Box sx={groupSx}>
          {segments.map((label, index) => (
            <Segment key={label} active={tab === index} onClick={() => setTab(index)}>
              {label}
            </Segment>
          ))}
        </Box>
      }
    >
      {error && (
        <Typography variant="caption" sx={{ display: 'block', color: 'error.main' }}>
          加载失败：{error}
        </Typography>
      )}
      <Box sx={{ pt: 0.5 }}>
        {tab === 0 && <RuleList rules={rules} />}
        {tab === 1 && <ToolList tools={tools} />}
      </Box>
    </PopoverPill>
  )
}

/** 分段控件取胶囊语言：浅墨底槽 + 白色激活块，比下划线页签轻得多 */
const groupSx = {
  display: 'flex',
  gap: '1px',
  p: '2px',
  bgcolor: WASH,
  borderRadius: 999,
} as const

function Segment({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        flex: 1,
        height: 22,
        px: 0.75,
        border: 0,
        borderRadius: 999,
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 11.5,
        fontWeight: 500,
        lineHeight: 1,
        bgcolor: active ? 'background.paper' : 'transparent',
        color: active ? 'text.primary' : 'text.secondary',
        boxShadow: active ? '0 1px 2px rgba(15, 23, 42, 0.10)' : 'none',
        '&:hover': { color: 'text.primary' },
      }}
    >
      {children}
    </Box>
  )
}
