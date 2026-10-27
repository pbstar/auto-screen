import { useState } from 'react'
import { Box, Button, Stack, TextField, Typography } from '@mui/material'
import type { TokenUsage } from '@shared/agent'
import type { SkillSummary } from '@shared/types'
import type { AgentRunState, SkillOutcome } from '../hooks/useAgentRun'
import { MONO_FONT } from '../theme'
import SkillPill from './SkillPill'
import RulePill from './RulePill'
import ToolPill from './ToolPill'
import AutoSkillToggle from './AutoSkillToggle'

interface Props {
  windowSelected: boolean
  state: AgentRunState
  skills: SkillSummary[]
  selectedSkills: string[]
  autoSkill: boolean
  onToggleSkill: (id: string) => void
  onRefreshSkills: () => void
  onAutoSkillChange: (on: boolean) => void
  onOpenLogs: () => void
  onStart: (task: string) => Promise<void>
  onStop: () => void
  onPause: () => void
  onResume: () => void
}

function formatTokens(usage: TokenUsage): string {
  const total = usage.prompt + usage.completion
  return total >= 1000 ? `${(total / 1000).toFixed(1)}k` : String(total)
}

function skillText(skill: SkillOutcome): string {
  if (skill.status === 'saved') {
    return `已生成技能《${skill.name}》 · 在「技能」里勾选，下次可直接复用`
  }
  if (skill.status === 'skipped') return '这次任务没有可复用的流程，未生成技能'
  return `技能生成失败：${skill.error ?? '未知错误'}`
}

function skillColor(skill: SkillOutcome): string {
  if (skill.status === 'saved') return 'success.main'
  if (skill.status === 'skipped') return 'text.secondary'
  return 'warning.main'
}

export default function TaskBar({
  windowSelected,
  state,
  skills,
  selectedSkills,
  autoSkill,
  onToggleSkill,
  onRefreshSkills,
  onAutoSkillChange,
  onOpenLogs,
  onStart,
  onStop,
  onPause,
  onResume,
}: Props) {
  const [task, setTask] = useState('')
  // 主进程的 started 事件回来前按钮仍可点，用本地标记挡住重复提交
  const [submitting, setSubmitting] = useState(false)
  const running = state.status !== 'idle'
  const paused = state.status === 'paused'
  const canStart = windowSelected && task.trim().length > 0 && !running && state.configReady

  const start = async () => {
    if (!canStart || submitting) return
    setSubmitting(true)
    try {
      await onStart(task.trim())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ p: 1.5, flex: 'none', borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: 20 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>任务</Typography>
        <Box sx={{ flex: 1 }} />
        {/* 步数与用量是任务的元信息，放标题行，不跟操作按钮抢位置 */}
        <Typography
          sx={{
            fontFamily: MONO_FONT,
            fontSize: 11,
            color: 'text.secondary',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {state.step}/{state.maxSteps} 步 · {formatTokens(state.usage)} tokens
        </Typography>
        {/* 自带内边距，负外边距让文字和下面内容的 12px 右边界对齐 */}
        <Button
          size="small"
          onClick={onOpenLogs}
          sx={{ color: 'text.secondary', px: 1, mr: -1, minWidth: 0 }}
        >
          日志
        </Button>
      </Box>
      <TextField
        fullWidth
        multiline
        minRows={2}
        maxRows={4}
        placeholder="例如：在计算器里算出 12×34"
        value={task}
        onChange={(event) => setTask(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void start()
        }}
        disabled={running}
        sx={{
          mt: 0.75,
          '& .MuiOutlinedInput-root': {
            bgcolor: 'background.paper',
            fontSize: 13,
            lineHeight: 1.6,
            '& fieldset': { borderColor: 'divider' },
            '&:hover fieldset': { borderColor: '#c9d1db' },
            '&.Mui-focused fieldset': { borderColor: 'text.primary', borderWidth: 1 },
          },
        }}
      />
      <Stack direction="row" spacing={0.75} sx={{ mt: 1, alignItems: 'center' }}>
        <SkillPill
          skills={skills}
          selected={selectedSkills}
          disabled={running}
          onToggle={onToggleSkill}
          onReload={onRefreshSkills}
        />
        <RulePill />
        <ToolPill />
        <Box sx={{ flex: 1 }} />
        {/* 开关只影响下一次启动，运行中收起，给暂停/终止让出位置 */}
        {!running && <AutoSkillToggle checked={autoSkill} onChange={onAutoSkillChange} />}
        {running ? (
          <Stack direction="row" spacing={1}>
            {paused ? (
              <Button variant="outlined" onClick={onResume}>
                继续
              </Button>
            ) : (
              <Button
                variant="outlined"
                disabled={state.status === 'stopping'}
                onClick={onPause}
              >
                暂停
              </Button>
            )}
            <Button
              color="error"
              variant="outlined"
              disabled={state.status === 'stopping'}
              onClick={onStop}
            >
              {state.status === 'stopping' ? '终止中…' : '终止'}
            </Button>
          </Stack>
        ) : (
          <Button variant="contained" disabled={!canStart || submitting} onClick={() => void start()}>
            开始
          </Button>
        )}
      </Stack>
      {paused && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'warning.main' }}>
          {state.pauseReason === 'human'
            ? '检测到人工操作鼠标，已暂停；处理完点「继续」'
            : '已暂停，点「继续」恢复执行'}
        </Typography>
      )}
      {state.skill && (
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 0.75, color: skillColor(state.skill) }}
        >
          {skillText(state.skill)}
        </Typography>
      )}
      {!state.configReady && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'warning.main' }}>
          未配置 DEEPSEEK_API_KEY，请先填写 .env
        </Typography>
      )}
      {state.error && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'error.main' }}>
          {state.error}
        </Typography>
      )}
    </Box>
  )
}
