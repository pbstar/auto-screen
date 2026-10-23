import { clipboard, screen as electronScreen } from 'electron'
import {
  Button,
  Key,
  Point,
  keyboard,
  mouse,
  screen as nutScreen,
  sleep,
} from '@nut-tree-fork/nut-js'
import type { ScrollDirection, UnitMode } from '../shared/types'

interface ClickResult {
  x: number
  y: number
  unit: 'physical' | 'logical'
}

interface DragResult {
  from: { x: number; y: number }
  to: { x: number; y: number }
  unit: 'physical' | 'logical'
}

interface ScrollResult {
  x: number
  y: number
  unit: 'physical' | 'logical'
  amount: number
}

mouse.config.autoDelayMs = 30
keyboard.config.autoDelayMs = 20

const LETTER_KEYS: Record<string, Key> = {
  a: Key.A,
  b: Key.B,
  c: Key.C,
  d: Key.D,
  e: Key.E,
  f: Key.F,
  g: Key.G,
  h: Key.H,
  i: Key.I,
  j: Key.J,
  k: Key.K,
  l: Key.L,
  m: Key.M,
  n: Key.N,
  o: Key.O,
  p: Key.P,
  q: Key.Q,
  r: Key.R,
  s: Key.S,
  t: Key.T,
  u: Key.U,
  v: Key.V,
  w: Key.W,
  x: Key.X,
  y: Key.Y,
  z: Key.Z,
}

const DIGIT_KEYS: Record<string, Key> = {
  '0': Key.Num0,
  '1': Key.Num1,
  '2': Key.Num2,
  '3': Key.Num3,
  '4': Key.Num4,
  '5': Key.Num5,
  '6': Key.Num6,
  '7': Key.Num7,
  '8': Key.Num8,
  '9': Key.Num9,
}

const NAMED_KEYS: Record<string, Key> = {
  enter: Key.Enter,
  return: Key.Enter,
  esc: Key.Escape,
  escape: Key.Escape,
  tab: Key.Tab,
  space: Key.Space,
  backspace: Key.Backspace,
  delete: Key.Delete,
  up: Key.Up,
  down: Key.Down,
  left: Key.Left,
  right: Key.Right,
  home: Key.Home,
  end: Key.End,
  pageup: Key.PageUp,
  pagedown: Key.PageDown,
  minus: Key.Minus,
  equal: Key.Equal,
  semicolon: Key.Semicolon,
  quote: Key.Quote,
  comma: Key.Comma,
  period: Key.Period,
  slash: Key.Slash,
  backslash: Key.Backslash,
  f1: Key.F1,
  f2: Key.F2,
  f3: Key.F3,
  f4: Key.F4,
  f5: Key.F5,
  f6: Key.F6,
  f7: Key.F7,
  f8: Key.F8,
  f9: Key.F9,
  f10: Key.F10,
  f11: Key.F11,
  f12: Key.F12,
}

function modifierKeys(): Record<string, Key> {
  return {
    cmd: Key.LeftCmd,
    command: Key.LeftCmd,
    meta: Key.LeftCmd,
    ctrl: Key.LeftControl,
    control: Key.LeftControl,
    alt: Key.LeftAlt,
    option: Key.LeftAlt,
    shift: Key.LeftShift,
    mod: process.platform === 'darwin' ? Key.LeftCmd : Key.LeftControl,
  }
}

function parseKey(raw: string): Key {
  const name = raw.trim().toLowerCase()
  const key = { ...modifierKeys(), ...LETTER_KEYS, ...DIGIT_KEYS, ...NAMED_KEYS }[name]
  if (key === undefined) {
    throw new Error(`无法识别的按键：${raw}`)
  }
  return key
}

/**
 * nut.js 的坐标单位随平台/版本可能是物理像素或逻辑点，
 * 用“主屏物理宽度”和 nut 报告的屏幕宽度比对来判断。
 */
async function resolveUnitMode(
  mode: UnitMode,
  scaleFactor: number,
): Promise<'physical' | 'logical'> {
  if (mode !== 'auto') return mode

  const primary = electronScreen.getPrimaryDisplay()
  const nutWidth = await nutScreen.width()
  const physicalWidth = primary.size.width * primary.scaleFactor

  if (Math.abs(nutWidth - physicalWidth) <= 2) return 'physical'
  if (Math.abs(nutWidth - primary.size.width) <= 2) return 'logical'

  // 两个都对不上时按逻辑点处理，界面上可以手动切换
  return scaleFactor > 1 ? 'logical' : 'physical'
}

export async function clickAt(
  physicalPoint: { x: number; y: number },
  scaleFactor: number,
  unitMode: UnitMode,
  button: 'left' | 'right' = 'left',
  count = 1,
): Promise<ClickResult> {
  const unit = await resolveUnitMode(unitMode, scaleFactor)
  const physicalPerUnit = unit === 'logical' ? scaleFactor || 1 : 1
  const x = physicalPoint.x / physicalPerUnit
  const y = physicalPoint.y / physicalPerUnit

  await mouse.setPosition(new Point(x, y))
  if (button === 'right') {
    await mouse.click(Button.RIGHT)
  } else if (count >= 2) {
    await mouse.doubleClick(Button.LEFT)
  } else {
    await mouse.click(Button.LEFT)
  }

  return { x, y, unit }
}

export async function dragAt(
  from: { x: number; y: number },
  to: { x: number; y: number },
  scaleFactor: number,
  unitMode: UnitMode,
): Promise<DragResult> {
  const unit = await resolveUnitMode(unitMode, scaleFactor)
  const physicalPerUnit = unit === 'logical' ? scaleFactor || 1 : 1
  const start = new Point(from.x / physicalPerUnit, from.y / physicalPerUnit)
  const end = new Point(to.x / physicalPerUnit, to.y / physicalPerUnit)

  await mouse.drag([start, end])

  return {
    from: { x: start.x, y: start.y },
    to: { x: end.x, y: end.y },
    unit,
  }
}

export async function scrollAt(
  point: { x: number; y: number },
  scaleFactor: number,
  unitMode: UnitMode,
  direction: ScrollDirection,
  amount: number,
): Promise<ScrollResult> {
  const unit = await resolveUnitMode(unitMode, scaleFactor)
  const physicalPerUnit = unit === 'logical' ? scaleFactor || 1 : 1
  const x = point.x / physicalPerUnit
  const y = point.y / physicalPerUnit

  await mouse.setPosition(new Point(x, y))
  if (direction === 'up') {
    await mouse.scrollUp(amount)
  } else {
    await mouse.scrollDown(amount)
  }

  return { x, y, unit, amount }
}

export async function pasteText(text: string): Promise<void> {
  const previous = await clipboard.readText()
  await clipboard.writeText(text)
  const modKey = process.platform === 'darwin' ? Key.LeftCmd : Key.LeftControl
  await keyboard.pressKey(modKey, Key.V)
  await keyboard.releaseKey(modKey, Key.V)
  await sleep(150)
  await clipboard.writeText(previous)
}

export async function pressCombo(combo: string): Promise<void> {
  const keys = combo
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseKey)

  if (keys.length === 0) {
    throw new Error('组合键不能为空')
  }

  await keyboard.pressKey(...keys)
  await keyboard.releaseKey(...keys)
}
