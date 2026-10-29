import { Box, Typography } from '@mui/material'
import type { RuleSummary } from '@shared/types'
import { WASH_STRONG } from '../theme'

/** 规则始终生效、不能勾选，只读展示当前带了哪些约束，尤其是自己写的 .md 有没有加载 */
export default function RuleList({ rules }: { rules: RuleSummary[] }) {
  return (
    <>
      {rules.map((rule) => (
        <RuleRow key={rule.id} rule={rule} />
      ))}
      <Typography
        variant="caption"
        sx={{ display: 'block', mt: 0.5, color: 'text.secondary', lineHeight: 1.5 }}
      >
        内置规则始终生效；rules/ 目录放 .md 可添加自己的规则，规则不参与勾选。
      </Typography>
    </>
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
            bgcolor: rule.builtin ? WASH_STRONG : 'transparent',
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
