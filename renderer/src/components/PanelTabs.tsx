import { useState, type ReactNode } from 'react'
import { Box, Tab, Tabs } from '@mui/material'

interface Props {
  manual: ReactNode
  timeline: ReactNode
}

export default function PanelTabs({ manual, timeline }: Props) {
  const [tab, setTab] = useState(0)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Tabs
        value={tab}
        onChange={(_event, value: number) => setTab(value)}
        variant="fullWidth"
        sx={{ minHeight: 40, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="执行时间线" sx={{ minHeight: 40, py: 0 }} />
        <Tab label="手动操作" sx={{ minHeight: 40, py: 0 }} />
      </Tabs>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 1.5 }}>
        {tab === 0 ? timeline : manual}
      </Box>
    </Box>
  )
}
