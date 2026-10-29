import { loadImage } from '@napi-rs/canvas'
import { captureWindow } from '../core/screen'
import type { FrameSignature } from '../shared/types'
import { sampleFrame } from './watch'

/** 截一张目标窗口并缩成灰度签名：动作前后各取一次，就能判断画面到底变没变 */
export async function readFrame(windowId: number): Promise<FrameSignature> {
  const capture = captureWindow(windowId)
  const png = Buffer.from(capture.image.split(',')[1] ?? '', 'base64')
  return sampleFrame(await loadImage(png))
}
