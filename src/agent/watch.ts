import { createCanvas, type Image } from '@napi-rs/canvas'
import type { FrameSignature } from '../shared/types'

/**
 * 采样宽度：1280 宽的窗口缩到 320，一个块约等于原图 32px。
 * 实测这个粒度下，20px 的棋子、12px 的状态文字都能识别，
 * 而光标闪烁（2×16px）和单个小圆点会被缩采样抹平，不会误判。
 */
const SAMPLE_WIDTH = 320
const BLOCK = 8
/** 单块平均灰度差达到这个值算“有变化” */
const BLOCK_DELTA = 8
/** 单块差异很大时直接判定变化，不用凑够块数 */
const STRONG_DELTA = 24
const MIN_BLOCKS = 2

/**
 * 把截图缩成小块灰度签名。缩采样本身会吃掉细小的东西（光标、细线），
 * 所以不需要额外排除闪烁；真正改变内容的区域才会留下差异。
 */
export function sampleFrame(image: Image): FrameSignature {
  const scale = SAMPLE_WIDTH / image.width
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, 0, 0, width, height)
  const { data } = ctx.getImageData(0, 0, width, height)

  const cols = Math.max(1, Math.floor(width / BLOCK))
  const rows = Math.max(1, Math.floor(height / BLOCK))
  const blocks = new Uint8Array(cols * rows)

  for (let by = 0; by < rows; by += 1) {
    for (let bx = 0; bx < cols; bx += 1) {
      let sum = 0
      for (let y = 0; y < BLOCK; y += 1) {
        for (let x = 0; x < BLOCK; x += 1) {
          const index = ((by * BLOCK + y) * width + bx * BLOCK + x) * 4
          sum += (data[index] * 299 + data[index + 1] * 587 + data[index + 2] * 114) / 1000
        }
      }
      blocks[by * cols + bx] = Math.round(sum / (BLOCK * BLOCK))
    }
  }

  return { cols, rows, blocks }
}

/** 两张签名是否算“画面变了”；窗口尺寸变化也算 */
export function framesDiffer(a: FrameSignature, b: FrameSignature): boolean {
  if (a.cols !== b.cols || a.rows !== b.rows) return true

  let weak = 0
  for (let i = 0; i < a.blocks.length; i += 1) {
    const delta = Math.abs(a.blocks[i] - b.blocks[i])
    if (delta >= STRONG_DELTA) return true
    if (delta >= BLOCK_DELTA) weak += 1
  }
  return weak >= MIN_BLOCKS
}
