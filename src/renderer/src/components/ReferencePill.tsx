import { useCallback, useEffect, useState } from 'react'
import { Box, Tab, Tabs, Typography } from '@mui/material'
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

/** 脚本、规则、工具都是只读参考：合成一个胶囊，浮层用页签分开，三份清单不堆在一起 */
export default function ReferencePill({ skills, onReloadSkills }: Props) {
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

  const scriptCount = skills.filter((skill) => skill.script).length

  return (
    <PopoverPill
      label="参考"
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
      <Tabs
        value={tab}
        onChange={(_, next: number) => setTab(next)}
        variant="fullWidth"
        sx={tabsSx}
      >
        <Tab label={`脚本 ${scriptCount}`} />
        <Tab label={`规则 ${rules.length}`} />
        <Tab label={`工具 ${tools.length}`} />
      </Tabs>
      <Box sx={{ pt: 1 }}>
        {tab === 0 && <ScriptList skills={skills} />}
        {tab === 1 && <RuleList rules={rules} />}
        {tab === 2 && <ToolList tools={tools} />}
      </Box>
    </PopoverPill>
  )
}

/** 页签吸顶：工具清单会滚动，页签跟着滚走就分不清当前在哪个分类 */
const tabsSx = {
  minHeight: 32,
  mx: -1.25,
  px: 1.25,
  position: 'sticky',
  top: 0,
  zIndex: 1,
  bgcolor: 'background.paper',
  '& .MuiTab-root': { minHeight: 32, minWidth: 0, px: 1, fontSize: 12, fontWeight: 500 },
} as const
