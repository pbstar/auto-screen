import { Box } from '@mui/material'
import type { WindowInfo } from '@shared/types'
import WindowSelect from './WindowSelect'
import SkillList from './SkillList'

interface Props {
  windows: WindowInfo[]
  selectedId: number | null
  onSelect: (id: number) => void
}

export default function SidePanel({ windows, selectedId, onSelect }: Props) {
  return (
    <Box
      sx={{
        width: 260,
        flex: 'none',
        borderRight: 1,
        borderColor: 'divider',
        overflow: 'auto',
        p: 1.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <WindowSelect windows={windows} selectedId={selectedId} onSelect={onSelect} />
      <SkillList />
    </Box>
  )
}
