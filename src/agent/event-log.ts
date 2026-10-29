import type { AgentEventPayload } from '../shared/agent'
import { singleLine } from '../shared/text'
import { appendLog } from './run-store'

/** 事件即运行日志：每个事件都落一行，事后可以完整复盘 */
export function logEvent(runId: string, payload: AgentEventPayload): void {
  switch (payload.type) {
    case 'started':
      appendLog(runId, `开始，最多 ${payload.maxSteps} 步`)
      break
    case 'plan':
      appendLog(runId, `流程：${singleLine(payload.text)}`)
      break
    case 'shot':
      appendLog(runId, `第 ${payload.step} 步截图 ${payload.width}×${payload.height}`)
      if (payload.note) {
        appendLog(runId, `第 ${payload.step} 步观察：${singleLine(payload.note, 200)}`)
      }
      break
    case 'reply':
      if (payload.text) appendLog(runId, `第 ${payload.step} 步模型：${singleLine(payload.text)}`)
      break
    case 'tool_started':
      appendLog(
        runId,
        `第 ${payload.step} 步 → ${payload.name} ${JSON.stringify(payload.input)}`,
      )
      break
    case 'tool_finished':
      appendLog(
        runId,
        `第 ${payload.step} 步 ← ${payload.name} ${payload.isError ? '失败' : '成功'} ` +
          `${payload.durationMs}ms ${singleLine(payload.text)}`,
      )
      break
    case 'tool_progress':
      // 脚本每一步都要留痕，事后才能对上停在哪一步；等待类进度每十秒一条，落盘只会把 run.log 冲垮
      if (payload.script) {
        appendLog(runId, `第 ${payload.step} 步脚本 ${singleLine(payload.text, 200)}`)
      }
      break
    case 'question': {
      const labels = payload.options.map((option) => option.label).join(' / ')
      appendLog(
        runId,
        `第 ${payload.step} 步 提问：${singleLine(payload.question)}` +
          (labels ? `（选项：${labels}）` : ''),
      )
      break
    }
    case 'answered':
      appendLog(
        runId,
        payload.answer === null ? '用户跳过提问' : `用户回答：${singleLine(payload.answer)}`,
      )
      break
    case 'verify':
      appendLog(
        runId,
        payload.ok
          ? `第 ${payload.step} 步最终核对：通过`
          : `第 ${payload.step} 步最终核对：未通过 ${singleLine(payload.problem)}`,
      )
      break
    case 'skill':
      if (payload.status === 'saved') {
        appendLog(runId, `沉淀技能：${payload.name} → skills/${payload.id}/SKILL.md`)
      } else if (payload.status === 'skipped') {
        appendLog(runId, '沉淀技能：这次没有可复用的流程，未生成')
      } else {
        appendLog(runId, `沉淀技能失败：${singleLine(payload.error ?? '未知错误')}`)
      }
      break
    case 'usage':
      appendLog(
        runId,
        `用量 prompt=${payload.usage.prompt}（命中缓存 ${payload.usage.cached}）` +
          ` completion=${payload.usage.completion} · effort=${payload.effort}`,
      )
      break
    case 'stopping':
      appendLog(runId, '收到停止指令')
      break
    case 'paused':
      appendLog(runId, payload.reason === 'human' ? '检测到人工操作，已暂停' : '手动暂停')
      break
    case 'resumed':
      appendLog(runId, '继续执行')
      break
  }
}
