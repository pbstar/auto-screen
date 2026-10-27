import { app } from 'electron'
import { readdirSync, readFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import type { RuleSummary } from '../../src/shared/types'
import type { RulePrompt } from './prompt'
import { parseFrontmatter } from './frontmatter'

interface RuleDoc extends RulePrompt {
  id: string
  description: string
}

/**
 * 内置规则随应用发布，任何任务都必须遵守；用户不能关闭或覆盖。
 * 需要补充约束时放进 rules/*.md，两条通路都在系统提示里始终生效。
 */
const BUILTIN_RULES: RuleDoc[] = [
  {
    id: 'scope',
    name: '操作范围',
    description: '只在目标窗口里操作，不越界到系统与其它应用',
    builtin: true,
    body: [
      '- 只在目标窗口里操作，任务栏、Dock、菜单栏、通知中心、系统设置都不点；必须先操作它们才能完成任务时，停下来把情况告诉用户。',
      '- 只做任务要求的事；不打开与任务无关的窗口，不安装、下载或更新软件。',
    ].join('\n'),
  },
  {
    id: 'irreversible',
    name: '不可撤销动作',
    description: '删除、支付、发送这类动作只按任务要求做',
    builtin: true,
    body: [
      '- 删除、清空、支付、转账、发送消息、提交订单、覆盖保存、关闭有未保存内容的文档，只有任务明确要求时才做；任务没提到的不要顺手做。',
      '- 拿不准某个按钮会不会造成不可撤销的后果时，先别点，在说明里写清顾虑。',
    ].join('\n'),
  },
  {
    id: 'credentials',
    name: '验证与凭据',
    description: '登录、验证码、支付密码交给用户，不猜不输',
    builtin: true,
    body: [
      '- 遇到登录、验证码、支付密码、指纹或面容验证，停下来把界面状态告诉用户，由用户自己完成，不要猜测或输入。',
      '- 截图里出现的账号、手机号等个人信息只用于完成当前任务，不要写进说明或复制到别处。',
    ].join('\n'),
  },
  {
    id: 'honesty',
    name: '如实汇报',
    description: '只按最新截图下结论，做不到就说做不到',
    builtin: true,
    body: [
      '- 结论只来自最新一张截图，不要凭记忆或推测描述界面。',
      '- 做不到、看不清、或结果没法核对时，直接说明卡在哪一步、看到了什么，不要用「应该完成了」代替核对。',
    ].join('\n'),
  },
]

/** 开发时读项目根目录，打包后读 userData，与 skills 的取法一致 */
export function rulesRoot(): string {
  return app.isPackaged
    ? join(app.getPath('userData'), 'rules')
    : join(process.cwd(), 'rules')
}

/** 按文件名排序注入，前缀才稳定；没有正文的规则注入不了约束，跳过 */
function readUserRules(): RuleDoc[] {
  let files: string[] = []
  try {
    files = readdirSync(rulesRoot(), { withFileTypes: true })
      .filter((entry) => entry.isFile() && extname(entry.name) === '.md')
      .map((entry) => entry.name)
      .sort()
  } catch {
    return []
  }

  return files.flatMap((file) => {
    try {
      const { meta, body } = parseFrontmatter(readFileSync(join(rulesRoot(), file), 'utf8'))
      if (!body) return []
      return [
        {
          id: `user:${file}`,
          name: meta.name || basename(file, '.md'),
          description: meta.description ?? '',
          builtin: false,
          body,
        },
      ]
    } catch {
      return []
    }
  })
}

function allRules(): RuleDoc[] {
  return [...BUILTIN_RULES, ...readUserRules()]
}

/** 界面只需要名字和描述，正文不下发 */
export function listRules(): RuleSummary[] {
  return allRules().map(({ id, name, description, builtin }) => ({ id, name, description, builtin }))
}

export function readRulePrompts(): RulePrompt[] {
  return allRules()
}
