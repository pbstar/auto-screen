import { mouse } from '@nut-tree-fork/nut-js'

interface PointerPoint {
  x: number
  y: number
}

const POLL_MS = 120
/** nut 单位下的容差，光标抖动不会触发接管 */
const MOVE_THRESHOLD = 6

export interface PointerWatcher {
  /** Agent 自己操作鼠标期间调用，避免把自己的移动误判成人手；可嵌套，按次数计 */
  markBusy(busy: boolean): void
  /** 重新对齐基线，继续后不会立刻把人手的位置当成新动作 */
  resync(): Promise<void>
  stop(): void
}

async function pointerPosition(): Promise<PointerPoint> {
  const point = await mouse.getPosition()
  return { x: point.x, y: point.y }
}

/**
 * 轮询光标位置判断人手接管。system 级输入钩子能直接拿到事件，
 * 但需要额外原生依赖；一期用采样，代价是没有键盘接管的感知。
 */
export function createPointerWatcher(onTakeover: () => void): PointerWatcher {
  let baseline: PointerPoint | null = null
  // 脚本执行中会弹确认框：提问层还会 markBusy 一次，按次数计才不会提前放开检测
  let busyCount = 0
  let armed = true

  const detect = (point: PointerPoint): void => {
    if (!armed) {
      baseline = point
      return
    }
    if (!baseline) {
      baseline = point
      return
    }
    const moved =
      Math.abs(point.x - baseline.x) > MOVE_THRESHOLD ||
      Math.abs(point.y - baseline.y) > MOVE_THRESHOLD
    if (moved) {
      armed = false
      onTakeover()
    }
  }

  const sample = async (): Promise<void> => {
    try {
      const point = await pointerPosition()
      if (busyCount > 0) baseline = point
      else detect(point)
    } catch {
      // 读不到光标时保持上一次基线，不影响运行
    }
  }

  const timer = setInterval(() => void sample(), POLL_MS)
  void sample()

  return {
    markBusy(next) {
      busyCount = Math.max(0, busyCount + (next ? 1 : -1))
      // 全部释放后丢一次基线，下一个采样点重新对齐，
      // 否则光标被自己移到落点会被当成人工接管
      if (busyCount === 0) baseline = null
    },
    async resync() {
      armed = false
      baseline = await pointerPosition().catch(() => null)
      armed = true
    },
    stop() {
      clearInterval(timer)
    },
  }
}
