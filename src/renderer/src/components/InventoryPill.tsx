import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Box, Typography } from '@mui/material'
import type { RuleSummary, SkillSummary, ToolSummary } from '@shared/types'
import PopoverPill from './PopoverPill'
import ScriptList from './ScriptList'
import RuleList from './RuleList'
import ToolList from './ToolList'

const api = window.autoScreen

interface Props {
  skills: SkillSummary[]
  /** 打开浮层时让上层重扫技能目录，新加的脚本才能立刻出现 */
  onReloadSkills: () => void
}

/** 脚本、规则、工具都是只读的「当前加载了什么」，合成一个胶囊，把位置让给技能与开始按钮 */
export default function InventoryPill({ skills, onReloadSkills }: Props) {
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

  const scriptCount = skills.filter((skill) => skill.script).length

  return (
    <PopoverPill
      label="清单"
      onOpen={() => {
        reload()
        onReloadSkills()
      }}
    >
      {error && (
        <Typography variant="caption" sx={{ display: 'block', color: 'error.main' }}>
          加载失败：{error}
        </Typography>
      )}
      <Section title="脚本" count={scriptCount}>
        <ScriptList skills={skills} />
      </Section>
      <Section title="规则" count={rules.length}>
        <RuleList rules={rules} />
      </Section>
      <Section title="工具" count={tools.length}>
        <ToolList tools={tools} />
      </Section>
    </PopoverPill>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: ReactNode
}) {
  return (
    <Box sx={{ pt: 1, mt: 1, borderTop: 1, borderColor: 'divider' }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: 'text.secondary', mb: 0.25 }}>
        {title} {count}
      </Typography>
      {children}
    </Box>
  )
}
