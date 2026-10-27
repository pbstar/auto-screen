import { useCallback, useEffect, useState } from 'react'
import { Box, Typography } from '@mui/material'
import type { RuleSummary } from '@shared/types'
import PopoverPill from './PopoverPill'

const api = window.autoScreen

/** 规则始终生效、不能勾选，浮层用来确认当前带了哪些约束，尤其是自己写的 .md 有没有加载 */
export default function RulePill() {
  const [rules, setRules] = useState<RuleSummary[]>([])
  const [error, setError] = useState('')

  const reload = useCallback(() => {
    void api.listRules().then((result) => {
      if (result.ok) {
        setRules(result.data)
        setError('')
      } else {
        setError(result.error)
      }
    })
  }, [])

  useEffect(reload, [reload])

  return (
    <PopoverPill
      label="规则"
      detail={rules.length > 0 ? String(rules.length) : undefined}
      onOpen={reload}
    >
      {error ? (
        <Typography variant="caption" sx={{ display: 'block', color: 'error.main' }}>
          规则加载失败：{error}
        </Typography>
      ) : (
        rules.map((rule) => <RuleRow key={rule.id} rule={rule} />)
      )}
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          mt: 1,
          pt: 1,
          borderTop: 1,
          borderColor: 'divider',
          color: 'text.secondary',
        }}
      >
        内置规则始终生效；在 rules/ 目录放 .md 可添加自己的规则，规则不参与勾选。
      </Typography>
    </PopoverPill>
  )
}

function RuleRow({ rule }: { rule: RuleSummary }) {
  return (
    <Box sx={{ py: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography noWrap sx={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 500 }}>
          {rule.name}
        </Typography>
        <Box
          component="span"
          sx={{
            flex: 'none',
            px: 0.75,
            borderRadius: 999,
            border: 1,
            borderColor: 'divider',
            bgcolor: rule.builtin ? 'rgba(15, 23, 42, 0.06)' : 'transparent',
            color: 'text.secondary',
            fontSize: 10.5,
            lineHeight: '16px',
          }}
        >
          {rule.builtin ? '内置' : '自定义'}
        </Box>
      </Box>
      {rule.description && (
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
          {rule.description}
        </Typography>
      )}
    </Box>
  )
}
