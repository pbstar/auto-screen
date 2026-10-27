import TogglePill from './TogglePill'
import { SparkleIcon } from './icons'

interface Props {
  checked: boolean
  onChange: (on: boolean) => void
}

/** 任务完成后的自动沉淀开关：与胶囊同排，没有文字，靠实心底色区分开合 */
export default function AutoSkillToggle({ checked, onChange }: Props) {
  return (
    <TogglePill
      checked={checked}
      onChange={onChange}
      title={
        `自动沉淀技能（${checked ? '已开启' : '已关闭'}）：` +
        '任务完成后把这次的操作流程整理成技能手册，生成后不会自动勾选'
      }
    >
      <SparkleIcon />
    </TogglePill>
  )
}
